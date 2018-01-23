import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

import * as concatLimit from 'async/concatLimit';
import * as output from '../modules/output';
import FileSystem, { IFileEntry, FileType } from '../model/Fs/FileSystem';
import remotePath from './remotePath';
import * as paths from '../helper/paths';
import flatten from '../helper/flatten';

type SyncModel = 'full' | 'update';

interface ITransportOption {
  ignore: string[];
  perserveTargetMode: boolean;
}

interface ISyncOption {
  ignore: string[];
  perserveTargetMode: boolean;
  model: SyncModel;
}

interface ITransportResult {
  target: string;
  error?: boolean;
  payload?: any;
  op?: string;
}

interface ITask {
  file: string;
  call: () => Promise<ITransportResult[] | ITransportResult> | ITransportResult[] | ITransportResult,
}

const MAX_CONCURRENCE = 512;

const defaultTransportOption = {
  ignore: [],
  perserveTargetMode: false,
};

const defaultSyncOption = {
  ignore: [],
  perserveTargetMode: false,
  model: 'update' as SyncModel,
};

function fileDepth(file: string) {
  return paths.normalize(file).split('/').length;
}

function fileName2Show(filePath) {
  return vscode.workspace.asRelativePath(filePath);
}

function shouldSkip(path, ignore) {
  if (ignore) {
    return ignore(path);
  }

  return true;
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

async function getFileMode(path: string, fs: FileSystem) {
  try {
    const stat = await fs.lstat(path);
    return stat.permissionMode;
  } catch (error) {
    output.debug(`try to get ${path} mode fail, default to 0666`);
    return 0o666;
  }
}

async function taskBatchProcess(queue) {
  queue.sort((a, b) => fileDepth(b.file) - fileDepth(a.file));
  return new Promise((resolve, reject) => {
    concatLimit(queue, MAX_CONCURRENCE, (task, callback) => {
      // the task will never throw, so don't need catch;
      // $todo extract error handle to top level
      Promise.resolve(task.call()).then(r => callback(null, r));
    }, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
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

  output.status.msg(`transfer ${fileName2Show(src)}`);
  const transPromise = option.perserveTargetMode
    // $caution with ftp, mutilple remote cmd will cause previously opened inputstream to be closed.
    ? Promise.all([
        srcFs.get(src),
        getFileMode(des, desFs),
      ])
      .then(([inputStream, mode]) => desFs.put(inputStream, des, { mode }))
    : srcFs.get(src)
      .then(inputStream => desFs.put(inputStream, des));

  return transPromise
    .then(() => ({
      target: src,
      op: 'transmission file',
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

  output.status.msg(`transfer ${fileName2Show(src)}`);
  return srcFs
    .readlink(src)
    .then(targetPath => {
      return desFs.symlink(targetPath, des).catch(err => {
        // ignore file already exist
        if (err.code === 4 || err.code === 'EEXIST') {
          return;
        }
        throw err;
      });
    })
    .then(() => ({
      target: src,
      op: 'transmission Symlink',
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
  return fs
    .unlink(path)
    .then(() => ({
      target: path,
      op: 'remove file',
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
  return fs
    .rmdir(path, true)
    .then(() => ({
      target: path,
      op: 'remove dir',
    }))
    .catch(err => ({
      target: path,
      error: true,
      op: 'remove dir',
      payload: err,
    }));
}

function _transportDir(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ITransportOption
): Promise<ITask[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([
      {
        file: src,
        call: () => Promise.resolve([
          {
            target: src,
            ignored: true,
          },
        ]),
      },
    ]);
  }

  const listFiles = () => {
    output.status.msg(`retrieving directory ${fileName2Show(src)}`);
    return srcFs.list(src);
  };

  const createUploadTask = (item: IFileEntry) => {
    if (item.type === FileType.Directory) {
      return _transportDir(
        item.fspath,
        desFs.pathResolver.join(des, item.name),
        srcFs,
        desFs,
        option
      );
    }

    const task: ITask = {
      file: item.fspath,
      call: undefined,
    };
    if (item.type === FileType.SymbolicLink) {
      task.call = () => transportSymlink(
        item.fspath,
        desFs.pathResolver.join(des, item.name),
        srcFs,
        desFs,
        option
      );
    } else if (item.type === FileType.File) {
      task.call = () => transportFile(
        item.fspath,
        desFs.pathResolver.join(des, item.name),
        srcFs,
        desFs,
        option
      );
    } else {
      task.call = () => ({
        target: item.fspath,
        error: true,
        op: 'transmission',
        payload: new Error('unsupport file type'),
      });
    }
    return task;
  };

  return desFs
    .ensureDir(des)
    .then(listFiles)
    .then(items => items.map(createUploadTask))
    .then(tasks => Promise.all<ITask | ITask[]>(tasks))
    .then(result => flatten(result));
}

export function _sync(
  srcDir: string,
  desDir: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ISyncOption = defaultSyncOption
): Promise<ITask[]> {
  if (shouldSkip(srcDir, option.ignore)) {
    return Promise.resolve([
      {
        file: srcDir,
        call: () => Promise.resolve([
          {
            target: srcDir,
            ignored: true,
          },
        ]),
      },
    ]);
  }

  output.status.msg(`collect files ${fileName2Show(srcDir)}...`);
  const syncFiles = ([srcFileEntries, desFileEntries]: IFileEntry[][]) => {
    output.status.msg('diff files...');
    const srcFileTable = toHash(srcFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: paths.normalize(srcFs.pathResolver.relative(srcDir, fileEntry.fspath)),
    }));

    const desFileTable = toHash(desFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: paths.normalize(desFs.pathResolver.relative(desDir, fileEntry.fspath)),
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
            symlink2trans.push([
              srcFile,
              { fspath: desFs.pathResolver.join(desDir, srcFile.name) },
            ]);
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

    const transFileTasks = file2trans.map(([srcfile, desFile]) => ({
      file: srcfile.fspath,
      call: () => transportFile(srcfile.fspath, desFile.fspath, srcFs, desFs, option),
    }));

    const transSymlinkTasks = symlink2trans.map(([srcfile, desFile]) => ({
      file: srcfile.fspath,
      call: () => transportSymlink(srcfile.fspath, desFile.fspath, srcFs, desFs, option),
    }));

    const transDirTasks = dir2trans.map(([srcfile, desFile]) =>
      _transportDir(srcfile.fspath, desFile.fspath, srcFs, desFs, option)
    );

    const syncDirTasks = dir2sync.map(([srcfile, desFile]) =>
      _sync(srcfile.fspath, desFile.fspath, srcFs, desFs, option)
    );

    const clearFileTasks = fileMissed.map(file => ({
      file: file.fspath,
      call: () => removeFile(file.fspath, desFs, option),
    }));

    const clearDirTasks = dirMissed.map(file => ({
      file: file.fspath,
      call: () => removeDir(file.fspath, desFs, option),
    }));

    return Promise.all<ITask | ITask[]>([
      ...syncDirTasks,
      ...transFileTasks,
      ...transSymlinkTasks,
      ...transDirTasks,
      ...clearFileTasks,
      ...clearDirTasks,
    ]).then(flatten);
  };

  return Promise.all([srcFs.list(srcDir).catch(err => []), desFs.list(desDir).catch(err => [])])
    .then(syncFiles);
}

async function transportDir(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ITransportOption
): Promise<ITransportResult[]> {
  let result;
  try {
    const tasks = await _transportDir(src, des, srcFs, desFs, option);
    result = await taskBatchProcess(tasks);
  } catch (err) {
    result = [{
      target: src,
      error: true,
      op: 'transmission dir',
      payload: err,
    }];
  }

  return result;
}

export async function sync(
  srcDir: string,
  desDir: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ISyncOption = defaultSyncOption
): Promise<ITransportResult[]> {
  let result;
  try {
    const tasks = await _sync(srcDir, desDir, srcFs, desFs, option);
    result = await taskBatchProcess(tasks);
  } catch (err) {
    result = [{
      target: srcDir,
      error: true,
      op: 'sync',
      payload: err,
    }];
  }

  return result;
}

export function transport(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: ITransportOption = defaultTransportOption
): Promise<ITransportResult[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([
      {
        target: src,
        ignored: true,
      },
    ]);
  }

  return srcFs.lstat(src).then(
    stat => {
      let result;

      if (stat.type === FileType.Directory) {
        result = transportDir(src, des, srcFs, desFs, option);
      } else if (stat.type === FileType.File) {
        result = desFs
          .ensureDir(desFs.pathResolver.dirname(des))
          .then(() => transportFile(src, des, srcFs, desFs, option));
      } else if (stat.type === FileType.SymbolicLink) {
        result = desFs
          .ensureDir(desFs.pathResolver.dirname(des))
          .then(() => transportSymlink(src, des, srcFs, desFs, option));
      }
      return result;
    },
    err => {
      // ignore file or directory not exist
      if (err.code === 'ENOENT') return;
      return [{
        target: src,
        error: true,
        op: 'transport',
        payload: err,
      }];
    }
  );
}

export function remove(path: string, fs: FileSystem, option): Promise<ITransportResult> {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve({
      target: path,
      ignored: true,
    });
  }

  return fs.lstat(path).then(
    stat => {
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
          result = [
            {
              target: path,
              error: true,
              op: 'remove',
              payload: new Error('unsupport file type'),
            },
          ];
      }
      return result;
    },
    err => {
      // ignore file or directory not exist
      if (err.code === 'ENOENT') return;
      return [{
        target: path,
        error: true,
        op: 'remove',
        payload: err,
      }];
    }
  );
}
