import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

import * as output from '../modules/output';
import FileSystem, { FileEntry, FileType }  from '../model/FileSystem';
import rpath, { normalize } from './remotePath';
import flatMap from '../helper/flatMap';

interface TransportOption {
  ignore: string[],
};

type SyncModel = 'full' | 'update';

interface SyncOption {
  ignore: string[],
  model: SyncModel,
};

interface TransportResult {
  target: string,
  error?: boolean,
  payload?: any,
};

const defaultTransportOption = {
  ignore: [],
};

const defaultSyncOption = {
  ignore: [],
  model: <SyncModel>'update',
};

function fileName2Show(filePath) {
  return vscode.workspace.asRelativePath(filePath);
}

function testIgnore(target, pattern) {
  return minimatch(target, pattern);
}

function shouldSkip(path, ignore) {
  return ignore.some(pattern => testIgnore(path, pattern));
}

const toHash = (items: any[], key: string, transform?: (a: any) => any): { [key: string]: any } =>
  items.reduce((hash, item) => {
    let transformedItem = item;
    if (transform) {
      transformedItem = transform(item);
    }
    hash[transformedItem[key]] = transformedItem;
    return hash;
  }, {});

export function sync(srcDir: string, desDir: string, srcFs: FileSystem, desFs: FileSystem, option: SyncOption = defaultSyncOption): Promise<TransportResult[] | TransportResult> {
  if (shouldSkip(srcDir, option.ignore)) {
    return Promise.resolve([{ target: srcDir }]);
  }

  output.status.msg(`collect files...`);
  const syncFiles = ([srcFileEntries, desFileEntries]) => {
    output.status.msg('diff files...');
    const srcFileTable = toHash(srcFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: normalize(srcFs.pathResolver.relative(srcDir, fileEntry.fspath)),
    }));

    const desFileTable = toHash(desFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: normalize(desFs.pathResolver.relative(desDir, fileEntry.fspath)),
    }));

    const file2trans = [];
    const dir2trans = [];
    const dir2sync = [];

    const fileMissed = [];
    const dirMissed = [];

    Object.keys(srcFileTable).forEach(id => {
      const srcFile = srcFileTable[id];
      const file = desFileTable[id];
      switch (srcFile.type) {
        case FileType.Directory:
          if (file) {
            dir2sync.push([srcFile, file]);
          } else if (option.model === 'full') {
            dir2trans.push([srcFile, { fspath: desFs.pathResolver.join(desDir, srcFile.name) }]);
          }
          break;
        case FileType.File:
        case FileType.SymbolicLink:
          if (file) {
            file2trans.push([srcFile, file]);
          } else if (option.model === 'full') {
            file2trans.push([srcFile, { fspath: desFs.pathResolver.join(desDir, srcFile.name) }]);
          }
          break;
        default:
          // do not process
      }
    });
    
    if (option.model === 'full') {
      Object.keys(desFileTable).forEach(id => {
        const srcFile = srcFileTable[id];
        const file = desFileTable[id];
        switch (file.type) {
          case FileType.Directory:
            if (!srcFile) {
              dirMissed.push(file);
            }
            break;
          case FileType.File:
          case FileType.SymbolicLink:
            if (!srcFile) {
              fileMissed.push(file);
            }
            break;
          default:
            // do not process
        }
      });
    }

    const transFileTasks = file2trans.map(([srcfile, desFile]) =>
      transportFile(srcfile.fspath, desFile.fspath, srcFs, desFs, option)
    );
    const transDirTasks = dir2trans.map(([srcfile, desFile]) =>
      transportDir(srcfile.fspath, desFile.fspath, srcFs, desFs, option)
    );
    const syncDirTasks = dir2sync.map(([srcfile, desFile]) =>
      sync(srcfile.fspath, desFile.fspath, srcFs, desFs, option)
    );

    const clearFileTasks = fileMissed.map(file =>
      removeFile(file.fspath, desFs, option)
    );
    const clearDirTasks = dirMissed.map(file =>
      removeDir(file.fspath, desFs, option)
    );
    
    return Promise.all<TransportResult[] | TransportResult>([
      ...transFileTasks,
      ...transDirTasks,
      ...clearFileTasks,
      ...syncDirTasks,
      ...clearDirTasks,
    ]);
  };

  return Promise.all([srcFs.list(srcDir), desFs.list(desDir).catch(err => [])])
    .then(syncFiles)
    .then(result => flatMap(result, a => a))
    .catch(err => ({
      target: srcDir,
      error: true,
      payload: err,
    }));
}

export function transport(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option: TransportOption = defaultTransportOption): Promise<TransportResult[] | TransportResult> {
  return srcFs.lstat(src)
    .then(stat => {
      let result;
      
      if (stat.type === FileType.Directory) {
        result = transportDir(src, des, srcFs, desFs, option);
      } else if (stat.type === FileType.File) {
        result = desFs.ensureDir(desFs.pathResolver.dirname(des))
          .then(() => transportFile(src, des, srcFs, desFs, option));
      } else if (stat.type === FileType.SymbolicLink) {
        result = desFs.ensureDir(desFs.pathResolver.dirname(des))
          .then(() => transportSymlink(src, des, srcFs, desFs, option));
      }
      return result;
    });
}

export function remove(path: string, fs: FileSystem, option): Promise<TransportResult> {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve({ target: path });
  }

  return fs.lstat(path)
    .then(stat => {
      let result;
      switch (stat.type) {
        case FileType.Directory:
          result = removeDir(path, fs, option);
          break;
        case FileType.File:
        case FileType.SymbolicLink:
          result = removeFile(path, fs, option);
          break;
        default:
          // do not process
      }
      return result;
    });
}

function transportDir(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([{ target: src }]);
  }

  const listFiles = () => {
    output.status.msg(`retriving directory ${fileName2Show(src)}`);
    return srcFs.list(src);
  };

  const uploadItem = (item: FileEntry) => {
    if (item.type === FileType.Directory) {
      return transportDir(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
    } else if (item.type === FileType.SymbolicLink) {
      return transportSymlink(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
    } else if (item.type === FileType.File) {
      return transportFile(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
    }

    return [{
      target: item.fspath,
      error: true,
      payload: new Error(`${item.fspath} with unsupport file type`),
    }];
  }
  
  return desFs.ensureDir(des)
    .then(listFiles)
    .then(items => items.map(uploadItem))
    .then(tasks => Promise.all<TransportResult[] | TransportResult>(tasks))
    .then(result => flatMap(result, a => a))
    .catch(err => ({
      target: src,
      error: true,
      payload: err,
    }));
}

function transportFile(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve({ target: src });
  }
  
  output.status.msg(`uploading ${fileName2Show(src)}`);
  return srcFs.get(src)
    .then(inputStream => desFs.put(inputStream, des))
    .then(() => ({
      target: src,
    }))
    .catch(err => ({
      target: src,
      error: true,
      payload: err,
    }));
}

function transportSymlink(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve({ target: src });
  }
  
  output.status.msg(`uploading ${fileName2Show(src)}`);
  return srcFs.readlink(src)
    .then(targetPath => {
      const absolutePath = srcFs.pathResolver.isAbsolute(targetPath)
        ? targetPath
        : srcFs.pathResolver.resolve(src, targetPath);
      desFs.symlink(absolutePath, des);
    })
    .then(() => ({
      target: src,
    }))
    .catch(err => ({
      target: src,
      error: true,
      payload: err,
    }));
}

function removeFile(path: string, fs: FileSystem, option): Promise<TransportResult> {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve({ target: path });
  }
  
  output.status.msg(`remove ${fileName2Show(path)}`);
  return fs.unlink(path)
    .then(() => ({
      target: path,
    }))
    .catch(err => ({
      target: path,
      error: true,
      payload: err,
    }));
}

function removeDir(path: string, fs: FileSystem, option): Promise<TransportResult> {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve({ target: path });
  }
  
  output.status.msg(`remove dir ${fileName2Show(path)}`);
  return fs.rmdir(path, true)
    .then(() => ({
      target: path,
    }))
    .catch(err => ({
      target: path,
      error: true,
      payload: err,
    }));
}
