import * as vscode from 'vscode';
import * as eachLimit from 'async/eachLimit';
import {
  transferFile,
  transferSymlink,
  removeFile,
  removeDir,
  TransferOption,
} from './fileTransfer';
import upath from './upath';
import app from '../app';
import FileSystem, { IFileEntry, FileType } from './Fs/FileSystem';
import * as utils from '../utils';
import { fileDepth, simplifyPath } from '../helper';

type SyncModel = 'full' | 'update';

interface TransferTaskOption extends TransferOption {
  onProgress?: (error, task: FileTask) => void;
  concurrency?: number;
  ignore?: (fsPath: string) => boolean;
}

interface SyncTransferTaskOption extends TransferTaskOption {
  model: SyncModel;
}

type FileTaskType = 'transfer' | 'remove';
type FileLocation = 'src' | 'des';

export interface FileTask {
  type: FileTaskType;
  resourceUri: vscode.Uri;
  resourceType: FileType;
  payload?: any;
}

function createTransferFileTask(
  resourceUri: vscode.Uri,
  resourceType: FileType,
  desUri: vscode.Uri
): FileTask {
  return {
    type: 'transfer',
    resourceUri,
    resourceType,
    payload: {
      desUri,
    },
  };
}

function createRemoveFileTask(
  resourceUri: vscode.Uri,
  resourceType: FileType,
  location: FileLocation
): FileTask {
  return {
    type: 'remove',
    resourceUri,
    resourceType,
    payload: {
      location,
    },
  };
}

function shouldSkip(path, ignore) {
  if (ignore) {
    return ignore(path);
  }

  return false;
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

async function taskBatchProcess(taskQueue: FileTask[], srcFs, desFs, option: TransferTaskOption) {
  return new Promise((resolve, reject) => {
    const { concurrency = 1, onProgress, ...transferOption } = option;

    taskQueue.sort((a, b) => fileDepth(b.resourceUri.fsPath) - fileDepth(a.resourceUri.fsPath));

    eachLimit(
      taskQueue,
      concurrency,
      (task: FileTask, callback) => {
        const resourceUri = task.resourceUri;
        if (shouldSkip(resourceUri.fsPath, transferOption.ignore)) {
          callback();
          return;
        }

        const resourceType = task.resourceType;
        const payload = task.payload;
        let pendingPromise;
        if (task.type === 'transfer') {
          switch (resourceType) {
            case FileType.File:
              pendingPromise = transferFile(
                resourceUri.fsPath,
                payload.desUri.fsPath,
                srcFs,
                desFs,
                transferOption
              );
              break;
            case FileType.SymbolicLink:
              pendingPromise = transferSymlink(
                resourceUri.fsPath,
                payload.desUri.fsPath,
                srcFs,
                desFs,
                transferOption
              );
              break;
            default:
            // nothing to do;
          }
        } else if (task.type === 'remove') {
          const fs = payload.location === 'des' ? desFs : srcFs;
          switch (resourceType) {
            case FileType.File:
            case FileType.SymbolicLink:
              pendingPromise = removeFile(resourceUri.fsPath, fs, transferOption);
              break;
            case FileType.Directory:
              pendingPromise = removeDir(resourceUri.fsPath, fs, transferOption);
              break;
            default:
            // nothing to do;
          }
        }
        pendingPromise
          .then(_ => {
            if (onProgress) onProgress(null, task);
          })
          .catch(error => {
            if (onProgress) onProgress(error, task);
          })
          .then(callback);
      },
      error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

async function fileTaskListFromDirector(
  srcUri: vscode.Uri,
  desUri: vscode.Uri,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: TransferTaskOption
): Promise<FileTask[]> {
  const src = srcUri.fsPath;
  const des = desUri.fsPath;

  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([]);
  }

  app.sftpBarItem.showMsg(`retrieving directory ${upath.basename(src)}`, simplifyPath(src));

  // $caution side effect
  // Need this to make sure file can correct transfer
  // This is the bset place current I can find.
  await desFs.ensureDir(des);

  const fileEntries = await srcFs.list(src);
  const promises = fileEntries.map(file => {
    if (file.type === FileType.Directory) {
      return fileTaskListFromDirector(
        srcUri.with({
          path: file.fspath,
        }),
        desUri.with({
          path: desFs.pathResolver.join(des, file.name),
        }),
        srcFs,
        desFs,
        option
      );
    }
    return createTransferFileTask(
      srcUri.with({
        path: file.fspath,
      }),
      file.type,
      desUri.with({
        path: desFs.pathResolver.join(des, file.name),
      })
    );
  });
  const tasks = await Promise.all<FileTask | FileTask[]>(promises);
  return utils.flatten(tasks);
}

async function fileTaskListFromDirectorForSync(
  srcUri: vscode.Uri,
  desUri: vscode.Uri,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: SyncTransferTaskOption
): Promise<FileTask[]> {
  const src = srcUri.fsPath;
  const des = desUri.fsPath;

  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([]);
  }

  app.sftpBarItem.showMsg(`retrieving directory ${upath.basename(src)}`, simplifyPath(src));
  const syncFiles = ([srcFileEntries, desFileEntries]: IFileEntry[][]) => {
    app.sftpBarItem.showMsg('diff files...');

    const srcFileTable = toHash(srcFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: upath.normalize(srcFs.pathResolver.relative(src, fileEntry.fspath)),
    }));

    const desFileTable = toHash(desFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: upath.normalize(desFs.pathResolver.relative(des, fileEntry.fspath)),
    }));

    const file2trans: Array<[string, string]> = [];
    const symlink2trans: Array<[string, string]> = [];
    const dir2trans: Array<[string, string]> = [];
    const dir2sync: Array<[string, string]> = [];

    const fileMissed: string[] = [];
    const dirMissed: string[] = [];

    Object.keys(srcFileTable).forEach(id => {
      const srcFile = srcFileTable[id];
      const file = desFileTable[id];
      delete desFileTable[id];

      const desFsPath = desFs.pathResolver.join(des, srcFile.name);
      if (file) {
        // files exist on both side
        switch (srcFile.type) {
          case FileType.Directory:
            dir2sync.push([srcFile.fspath, desFsPath]);
            break;
          case FileType.File:
            file2trans.push([srcFile.fspath, desFsPath]);
            break;
          case FileType.SymbolicLink:
            symlink2trans.push([srcFile.fspath, desFsPath]);
            break;
          default:
          // do not process
        }
      } else if (option.model === 'full') {
        // files exist only on src
        switch (srcFile.type) {
          case FileType.Directory:
            dir2trans.push([srcFile.fspath, desFsPath]);
            break;
          case FileType.File:
            file2trans.push([srcFile.fspath, desFsPath]);
            break;
          case FileType.SymbolicLink:
            symlink2trans.push([srcFile.fspath, desFsPath]);
            break;
          default:
          // do not process
        }
      }
    });

    if (option.model === 'full') {
      // for files exist only on destination
      Object.keys(desFileTable).forEach(id => {
        const file = desFileTable[id];
        switch (file.type) {
          case FileType.Directory:
            dirMissed.push(file.fspath);
            break;
          case FileType.File:
          case FileType.SymbolicLink:
            fileMissed.push(file.fspath);
            break;
          default:
          // do not process
        }
      });
    }

    const transFileTasks = file2trans.map(([srcfile, desFile]) =>
      createTransferFileTask(
        srcUri.with({ path: srcfile }),
        FileType.File,
        desUri.with({ path: desFile })
      )
    );

    const transSymlinkTasks = symlink2trans.map(([srcfile, desFile]) =>
      createTransferFileTask(
        srcUri.with({ path: srcfile }),
        FileType.SymbolicLink,
        desUri.with({ path: desFile })
      )
    );

    const transDirTasks = dir2trans.map(([srcfile, desFile]) =>
      fileTaskListFromDirector(
        srcUri.with({ path: srcfile }),
        desUri.with({ path: desFile }),
        srcFs,
        desFs,
        option
      )
    );

    const syncDirTasks = dir2sync.map(([srcfile, desFile]) =>
      fileTaskListFromDirectorForSync(
        srcUri.with({ path: srcfile }),
        desUri.with({ path: desFile }),
        srcFs,
        desFs,
        option
      )
    );

    const clearFileTasks = fileMissed.map(file =>
      createRemoveFileTask(desUri.with({ path: file }), FileType.File, 'des')
    );

    const clearDirTasks = dirMissed.map(file =>
      createRemoveFileTask(desUri.with({ path: file }), FileType.Directory, 'des')
    );

    return Promise.all<FileTask | FileTask[]>([
      ...syncDirTasks,
      ...transFileTasks,
      ...transSymlinkTasks,
      ...transDirTasks,
      ...clearFileTasks,
      ...clearDirTasks,
    ]).then(utils.flatten);
  };

  return Promise.all([srcFs.list(src).catch(err => []), desFs.list(des).catch(err => [])]).then(
    syncFiles
  );
}

export async function sync(
  srcUri: vscode.Uri,
  desUri: vscode.Uri,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: SyncTransferTaskOption
) {
  const srcDir = srcUri.fsPath;
  const desDir = desUri.fsPath;

  if (shouldSkip(srcDir, option.ignore)) {
    return Promise.resolve();
  }

  // we can transfer file only desDir exist
  await desFs.ensureDir(desDir);
  const tasks = await fileTaskListFromDirectorForSync(srcUri, desUri, srcFs, desFs, option);
  return await taskBatchProcess(tasks, srcFs, desFs, option);
}

export function transfer(
  srcUri: vscode.Uri,
  desUri: vscode.Uri,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: TransferTaskOption
) {
  const src = srcUri.fsPath;
  const des = desUri.fsPath;

  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve();
  }

  return srcFs.lstat(src).then(async stat => {
    let tasks;

    switch (stat.type) {
      case FileType.Directory:
        tasks = await fileTaskListFromDirector(srcUri, desUri, srcFs, desFs, option);
        break;
      case FileType.File:
      case FileType.SymbolicLink:
        await desFs.ensureDir(desFs.pathResolver.dirname(des));
        tasks = [createTransferFileTask(srcUri, stat.type, desUri)];
        break;
      default:
        throw new Error(`Unsupported file type (type = ${stat.type})`);
    }

    return taskBatchProcess(tasks, srcFs, desFs, option);
  });
}

export function remove(uri: vscode.Uri, fs: FileSystem, option) {
  const path = uri.fsPath;
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve();
  }

  return fs.lstat(path).then(stat => {
    let task;
    switch (stat.type) {
      case FileType.Directory:
        if (option.skipDir) {
          return;
        }

        task = createRemoveFileTask(uri, FileType.Directory, 'src');
        break;
      case FileType.File:
      case FileType.SymbolicLink:
        task = createRemoveFileTask(uri, FileType.File, 'src');
        break;
      default:
        throw new Error(`Unsupported file type (type = ${stat.type})`);
    }

    return taskBatchProcess([task], fs, fs, option);
  });
}
