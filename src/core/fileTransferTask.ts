import * as eachLimit from 'async/eachLimit';
import {
  transferFile,
  transferSymlink,
  removeFile,
  removeDir,
  TransferOption,
} from './fileTransfer';
import upath from './upath';
import sftpBarItem from '../ui/sftpBarItem';
import FileSystem, { IFileEntry, FileType } from '../core/Fs/FileSystem';
import * as  utils from '../utils';
import { simplifyPath } from '../host';

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
  file: {
    fsPath: string;
    fileType: FileType;
  };
  payload?: any;
}

const defaultTransferOption = {
  concurrency: 512,
  perserveTargetMode: false,
};

const defaultSyncTransferOption = {
  concurrency: 512,
  perserveTargetMode: false,
  model: 'update' as SyncModel,
};

function createTransferFileTask(srcFsPath, desFsPath, fileType): FileTask {
  return {
    type: 'transfer',
    file: {
      fsPath: srcFsPath,
      fileType,
    },
    payload: {
      desFsPath,
    },
  };
}

function createRemoveFileTask(fsPath, fileType, location: FileLocation): FileTask {
  return {
    type: 'remove',
    file: {
      fsPath,
      fileType,
    },
    payload: {
      location,
    },
  };
}

function fileDepth(file: string) {
  return upath.normalize(file).split('/').length;
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
    const { concurrency, onProgress, ...transferOption } = option;

    taskQueue.sort((a, b) => fileDepth(b.file.fsPath) - fileDepth(a.file.fsPath));

    eachLimit(
      taskQueue,
      concurrency,
      (task: FileTask, callback) => {
        const file = task.file;
        if (shouldSkip(file.fsPath, transferOption.ignore)) {
          callback();
          return;
        }

        const payload = task.payload;
        let pendingPromise;
        if (task.type === 'transfer') {
          switch (file.fileType) {
            case FileType.File:
              pendingPromise = transferFile(
                file.fsPath,
                payload.desFsPath,
                srcFs,
                desFs,
                transferOption
              );
              break;
            case FileType.SymbolicLink:
              pendingPromise = transferSymlink(
                file.fsPath,
                payload.desFsPath,
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
          switch (file.fileType) {
            case FileType.File:
            case FileType.SymbolicLink:
              pendingPromise = removeFile(file.fsPath, fs, transferOption);
              break;
            case FileType.Directory:
              pendingPromise = removeDir(file.fsPath, fs, transferOption);
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

async function getFileTaskListFromDirector(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: TransferTaskOption
): Promise<FileTask[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([createTransferFileTask(src, des, FileType.Directory)]);
  }

  sftpBarItem.showMsg(`retrieving directory ${upath.basename(src)}`, simplifyPath(src));

  // $caution side effect
  // Need this to make sure file can correct transfer
  // This is the bset place current I can find.
  await desFs.ensureDir(des);

  const fileEntries = await srcFs.list(src);
  const promises = fileEntries.map(file => {
    if (file.type === FileType.Directory) {
      return getFileTaskListFromDirector(
        file.fspath,
        desFs.pathResolver.join(des, file.name),
        srcFs,
        desFs,
        option
      );
    }
    return createTransferFileTask(file.fspath, desFs.pathResolver.join(des, file.name), file.type);
  });
  const tasks = await Promise.all<FileTask | FileTask[]>(promises);
  return utils.flatten(tasks);
}

async function getFileTaskListFromDirectorBySync(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: SyncTransferTaskOption
): Promise<FileTask[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([createTransferFileTask(src, des, FileType.Directory)]);
  }

  sftpBarItem.showMsg(`retrieving directory ${upath.basename(src)}`, simplifyPath(src));
  const syncFiles = ([srcFileEntries, desFileEntries]: IFileEntry[][]) => {
    sftpBarItem.showMsg('diff files...');

    const srcFileTable = toHash(srcFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: upath.normalize(srcFs.pathResolver.relative(src, fileEntry.fspath)),
    }));

    const desFileTable = toHash(desFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: upath.normalize(desFs.pathResolver.relative(des, fileEntry.fspath)),
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
      createTransferFileTask(srcfile, desFile, FileType.File)
    );

    const transSymlinkTasks = symlink2trans.map(([srcfile, desFile]) =>
      createTransferFileTask(srcfile, desFile, FileType.SymbolicLink)
    );

    const transDirTasks = dir2trans.map(([srcfile, desFile]) =>
      getFileTaskListFromDirector(srcfile, desFile, srcFs, desFs, option)
    );

    const syncDirTasks = dir2sync.map(([srcfile, desFile]) =>
      getFileTaskListFromDirectorBySync(srcfile, desFile, srcFs, desFs, option)
    );

    const clearFileTasks = fileMissed.map(file => createRemoveFileTask(file, FileType.File, 'des'));

    const clearDirTasks = dirMissed.map(file =>
      createRemoveFileTask(file, FileType.Directory, 'des')
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

async function transferDirTask(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: TransferTaskOption
) {
  const fullOption = {
    ...defaultTransferOption,
    ...option,
  };

  const tasks = await getFileTaskListFromDirector(src, des, srcFs, desFs, fullOption);
  return await taskBatchProcess(tasks, srcFs, desFs, fullOption);
}

export async function sync(
  srcDir: string,
  desDir: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: SyncTransferTaskOption
) {
  const fullOption = {
    ...defaultSyncTransferOption,
    ...option,
  };

  // we can transfer file only desDir exist
  await desFs.ensureDir(desDir);
  const tasks = await getFileTaskListFromDirectorBySync(srcDir, desDir, srcFs, desFs, fullOption);
  return await taskBatchProcess(tasks, srcFs, desFs, fullOption);
}

export function transfer(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  option: TransferTaskOption
) {
  const fullOption = {
    ...defaultTransferOption,
    ...option,
  };

  if (shouldSkip(src, fullOption.ignore)) {
    return Promise.resolve();
  }

  return srcFs.lstat(src).then(stat => {
    let result;

    if (stat.type === FileType.Directory) {
      result = transferDirTask(src, des, srcFs, desFs, fullOption);
    } else if (stat.type === FileType.File) {
      result = desFs
        .ensureDir(desFs.pathResolver.dirname(des))
        .then(() => transferFile(src, des, srcFs, desFs, fullOption));
    } else if (stat.type === FileType.SymbolicLink) {
      result = desFs
        .ensureDir(desFs.pathResolver.dirname(des))
        .then(() => transferSymlink(src, des, srcFs, desFs, fullOption));
    }
    return result;
  });
}

export function remove(path: string, fs: FileSystem, option) {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve();
  }

  return fs.lstat(path).then(stat => {
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
        throw new Error(`unsupport file type (type = ${stat.type})`);
    }
    return result;
  });
}
