import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

import * as output from '../modules/output';
import FileSystem, { IFileEntry, FileType } from '../model/Fs/FileSystem';
import { normalize } from './remotePath';
import flatMap from '../helper/flatMap';

type SyncModel = 'full' | 'update';

interface ITransportOption {
  ignore: string[],
};

interface ISyncOption {
  ignore: string[],
  model: SyncModel,
};

interface ITransportResult {
  target: string,
  error?: boolean,
  payload?: any,
  op?: string,
};

const defaultTransportOption = {
  ignore: [],
};

const defaultSyncOption = {
  ignore: [],
  model: 'update' as SyncModel,
};

function fileName2Show(filePath) {
  return vscode.workspace.asRelativePath(filePath);
}

function testIgnore(target, pattern) {
  return target.indexOf(pattern) === 0 || minimatch(target, pattern);
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

function transportDir(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ITransportOption
): Promise<ITransportResult[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([{
      target: src,
      ignored: true,
    }]);
  }

  const listFiles = () => {
    output.status.msg(`retriving directory ${fileName2Show(src)}`);
    return srcFs.list(src);
  };

  const uploadItem = (item: IFileEntry) => {
    if (item.type === FileType.Directory) {
      return transportDir(item.fspath, desFs.pathResolver.join(des, item.name), srcFs, desFs, option);
    } else if (item.type === FileType.SymbolicLink) {
      return transportSymlink(item.fspath, desFs.pathResolver.join(des, item.name), srcFs, desFs, option);
    } else if (item.type === FileType.File) {
      return transportFile(item.fspath, desFs.pathResolver.join(des, item.name), srcFs, desFs, option);
    }

    return [{
      target: item.fspath,
      error: true,
      op: 'transmission',
      payload: new Error('unsupport file type'),
    }];
  };

  return desFs.ensureDir(des)
    .then(listFiles)
    .then(items => items.map(uploadItem))
    .then(tasks => Promise.all<ITransportResult[] | ITransportResult>(tasks))
    .then(result => flatMap(result, a => a))
    .catch(err => ({
      target: src,
      error: true,
      op: 'transmission dir',
      payload: err,
    }));
}

function transportFile(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ITransportOption
): Promise<ITransportResult> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve({
      target: src,
      ignored: true,
    });
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
      op: 'transmission file',
      payload: err,
    }));
}

function transportSymlink(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ITransportOption
): Promise<ITransportResult> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve({
      target: src,
      ignored: true,
    });
  }

  output.status.msg(`uploading ${fileName2Show(src)}`);
  return srcFs.readlink(src)
    .then(targetPath => {
      return desFs.symlink(targetPath, des).catch(err => {
        // ignore file already exist
        if (err.code === 4 || err.code === 'EEXIST') {
          return
        };
        throw err;
      });
    })
    .then(() => ({
      target: src,
    }))
    .catch(err => ({
      target: src,
      error: true,
      op: 'transmission Symlink',
      payload: err,
    }));
}

function removeFile(path: string, fs: FileSystem, option): Promise<ITransportResult> {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve({
      target: path,
      ignored: true,
    });
  }

  output.status.msg(`remove ${fileName2Show(path)}`);
  return fs.unlink(path)
    .then(() => ({
      target: path,
    }))
    .catch(err => ({
      target: path,
      error: true,
      op: 'remove file',
      payload: err,
    }));
}

function removeDir(path: string, fs: FileSystem, option): Promise<ITransportResult> {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve({
      target: path,
      ignored: true,
    });
  }

  output.status.msg(`remove dir ${fileName2Show(path)}`);
  return fs.rmdir(path, true)
    .then(() => ({
      target: path,
    }))
    .catch(err => ({
      target: path,
      error: true,
      op: 'remove dir',
      payload: err,
    }));
}

export function sync(
  srcDir: string,
  desDir: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ISyncOption = defaultSyncOption
): Promise<ITransportResult[]> {
  if (shouldSkip(srcDir, option.ignore)) {
    return Promise.resolve([{
      target: srcDir,
      ignored: true,
    }]);
  }

  output.status.msg(`collect files ${fileName2Show(srcDir)}...`);
  const syncFiles = ([srcFileEntries, desFileEntries]: IFileEntry[][]) => {
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
    const symlink2trans = [];
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

            // delete process file
            delete desFileTable[id];
          } else if (option.model === 'full') {
            dir2trans.push([srcFile, { fspath: desFs.pathResolver.join(desDir, srcFile.name) }]);
          }
          break;
        case FileType.File:
          if (file) {
            file2trans.push([srcFile, file]);

            // delete process file
            delete desFileTable[id];
          } else if (option.model === 'full') {
            file2trans.push([srcFile, { fspath: desFs.pathResolver.join(desDir, srcFile.name) }]);
          }
          break;
        case FileType.SymbolicLink:
          if (file) {
            symlink2trans.push([srcFile, file]);

            // delete process file
            delete desFileTable[id];
          } else if (option.model === 'full') {
            symlink2trans.push([srcFile, { fspath: desFs.pathResolver.join(desDir, srcFile.name) }]);
          }
          break;
        default:
          // do not process
      }
    });

    if (option.model === 'full') {
      Object.keys(desFileTable).forEach(id => {
        const file = desFileTable[id];
        switch (file.type) {
          case FileType.Directory:
            dirMissed.push(file);
            break;
          case FileType.File:
          case FileType.SymbolicLink:
            fileMissed.push(file);
            break;
          default:
            // do not process
        }
      });
    }

    const transFileTasks = file2trans.map(([srcfile, desFile]) =>
      transportFile(srcfile.fspath, desFile.fspath, srcFs, desFs, option)
    );
    const transSymlinkTasks = symlink2trans.map(([srcfile, desFile]) =>
      transportSymlink(srcfile.fspath, desFile.fspath, srcFs, desFs, option)
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

    return Promise.all<ITransportResult[] | ITransportResult>([
      ...transFileTasks,
      ...transSymlinkTasks,
      ...transDirTasks,
      ...clearFileTasks,
      ...syncDirTasks,
      ...clearDirTasks,
    ]);
  };

  return Promise.all([
    srcFs.list(srcDir).catch(err => []),
    desFs.list(desDir).catch(err => []),
  ]).then(syncFiles)
    .then(result => {
      output.status.msg(`sync finish ${fileName2Show(srcDir)}`);
      return flatMap(result, a => a);
    })
    .catch(err => ({
      target: srcDir,
      error: true,
      op: 'sync',
      payload: err,
    }));
}

export function transport(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ITransportOption = defaultTransportOption
): Promise<ITransportResult[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([{
      target: src,
      ignored: true,
    }]);
  }

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
    }, err => {
      // ignore file or directory not exist
      if (err.code === 'ENOENT') return;
      throw err;
    });
}

export function remove(path: string, fs: FileSystem, option): Promise<ITransportResult> {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve({
      target: path,
      ignored: true,
    });
  }

  return fs.lstat(path)
    .then(stat => {
      let result;
      switch (stat.type) {
        case FileType.Directory:
          if (!option.skipDir) {
            result = removeDir(path, fs, option);
          }
          break;
        case FileType.File:
        case FileType.SymbolicLink:
          result = removeFile(path, fs, option);
          break;
        default:
          result = [{
            target: path,
            error: true,
            op: 'remove',
            payload: new Error('unsupport file type'),
          }];
      }
      return result;
    }, err => {
      // ignore file or directory not exist
      if (err.code === 'ENOENT') return;
      throw err;
    });
}
