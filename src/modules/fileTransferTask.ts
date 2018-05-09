import {
  transferFile,
  transferSymlink,
  removeFile,
  removeDir,
  TransferOption,
} from './fileTransfer';
import upath from './upath';
// import * as output from './output';
import Scheduler from './Scheduler';
import FileSystem, { IFileEntry, FileType } from '../model/Fs/FileSystem';
import { simplifyPath } from '../host';

type SyncModel = 'full' | 'update';

interface TransferTaskOption extends TransferOption {
  onProgress?: (error, task: FileTask) => void;
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

async function processTask(task: FileTask, srcFs, desFs, option: TransferTaskOption) {
  const { file, payload } = task;
  const { onProgress, ...transferOption } = option;

  if (shouldSkip(file.fsPath, transferOption.ignore)) {
    return;
  }
  let promise;
  if (task.type === 'transfer') {
    switch (file.fileType) {
      case FileType.File:
        promise = transferFile(file.fsPath, payload.desFsPath, srcFs, desFs, transferOption);
        break;
      case FileType.SymbolicLink:
        promise = transferSymlink(file.fsPath, payload.desFsPath, srcFs, desFs, transferOption);
        break;
      default:
      // nothing to do;
    }
  } else if (task.type === 'remove') {
    const fs = payload.location === 'des' ? desFs : srcFs;
    switch (file.fileType) {
      case FileType.File:
      case FileType.SymbolicLink:
        promise = removeFile(file.fsPath, fs, transferOption);
        break;
      case FileType.Directory:
        promise = removeDir(file.fsPath, fs, transferOption);
        break;
      default:
      // nothing to do;
    }
  }

  if (promise) {
    try {
      await promise;
      onProgress(null, task);
    } catch (error) {
      onProgress(error, task);
    }
  }
}

async function doTransferDir(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  scheduler: Scheduler,
  option: TransferTaskOption
) {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve();
  }

  // output.status.msg({
  //   text: `retrieving directory ${upath.basename(src)}`,
  //   tooltip: simplifyPath(src),
  // });

  // $caution side effect
  // Need this to make sure file can correct transfer
  // This is the bset place current I can find.
  await scheduler.add(() => desFs.ensureDir(des));
  const fileEntries = await scheduler.add(() => srcFs.list(src));
  fileEntries.forEach(async file => {
    if (file.type === FileType.Directory) {
      doTransferDir(
        file.fspath,
        desFs.pathResolver.join(des, file.name),
        srcFs,
        desFs,
        scheduler,
        option
      );
      return;
    }

    const desFsPath = desFs.pathResolver.join(des, file.name);
    const task = createTransferFileTask(file.fspath, desFsPath, file.type);

    scheduler.add(() => processTask(task, srcFs, desFs, option));
  });
}

async function doSyncDir(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  scheduler: Scheduler,
  option: SyncTransferTaskOption
) {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([createTransferFileTask(src, des, FileType.Directory)]);
  }

  // output.status.msg({
  //   text: `retrieving directory ${upath.basename(src)}`,
  //   tooltip: simplifyPath(src),
  // });
  const syncFiles = ([srcFileEntries, desFileEntries]: IFileEntry[][]) => {
    // output.status.msg('diff files...');
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

    const file2remove = [];
    const dir2remove = [];

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
            dir2remove.push(file.fspath);
            break;
          case FileType.File:
          case FileType.SymbolicLink:
            file2remove.push(file.fspath);
            break;
          default:
          // do not process
        }
      });
    }

    dir2trans.forEach(([srcfile, desFile]) =>
      doTransferDir(srcfile, desFile, srcFs, desFs, scheduler, option)
    );

    dir2sync.forEach(([srcfile, desFile]) =>
      doSyncDir(srcfile, desFile, srcFs, desFs, scheduler, option)
    );

    const transFileTasks = file2trans.map(([srcfile, desFile]) =>
      createTransferFileTask(srcfile, desFile, FileType.File)
    );

    const transSymlinkTasks = symlink2trans.map(([srcfile, desFile]) =>
      createTransferFileTask(srcfile, desFile, FileType.SymbolicLink)
    );

    const clearFileTasks = file2remove.map(file =>
      createRemoveFileTask(null, FileType.File, 'des')
    );

    const clearDirTasks = dir2remove.map(file =>
      createRemoveFileTask(file, FileType.Directory, 'des')
    );

    [...transFileTasks, ...transSymlinkTasks, ...clearFileTasks, ...clearDirTasks].map(task =>
      scheduler.add(() => processTask(task, srcFs, desFs, option))
    );
  };

  const files = await scheduler.add(() =>
    Promise.all([srcFs.list(src).catch(err => []), desFs.list(des).catch(err => [])])
  );
  syncFiles(files);
}

function transferDirTask(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  scheduler: Scheduler,
  option: TransferTaskOption
) {
  const fullOption = {
    ...defaultTransferOption,
    ...option,
  };

  doTransferDir(src, des, srcFs, desFs, scheduler, fullOption);
}

export async function sync(
  srcDir: string,
  desDir: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  scheduler: Scheduler,
  option: SyncTransferTaskOption
) {
  const fullOption = {
    ...defaultSyncTransferOption,
    ...option,
  };

  // we can transfer file only desDir exist
  await scheduler.add(() => desFs.ensureDir(desDir));
  doSyncDir(srcDir, desDir, srcFs, desFs, scheduler, fullOption);
}

export async function transfer(
  src: string,
  des: string,
  srcFs: FileSystem,
  desFs: FileSystem,
  scheduler: Scheduler,
  option: TransferTaskOption
) {
  const fullOption = {
    ...defaultTransferOption,
    ...option,
  };

  if (shouldSkip(src, fullOption.ignore)) {
    return Promise.resolve();
  }

  const stat = await scheduler.add(() => srcFs.lstat(src));
  if (stat.type === FileType.Directory) {
    return transferDirTask(src, des, srcFs, desFs, scheduler, fullOption);
  }

  if (stat.type === FileType.File) {
    return scheduler.add(() =>
      desFs
        .ensureDir(desFs.pathResolver.dirname(des))
        .then(() => transferFile(src, des, srcFs, desFs, fullOption))
    );
  }

  if (stat.type === FileType.SymbolicLink) {
    return scheduler.add(() =>
      desFs
        .ensureDir(desFs.pathResolver.dirname(des))
        .then(() => transferSymlink(src, des, srcFs, desFs, fullOption))
    );
  }
}

export async function remove(path: string, fs: FileSystem, scheduler: Scheduler, option) {
  if (shouldSkip(path, option.ignore)) {
    return Promise.resolve();
  }

  const stat = await scheduler.add(() => fs.lstat(path));
  let task;
  switch (stat.type) {
    case FileType.Directory:
      if (!option.skipDir) {
        task = () => removeDir(path, fs, option);
      }
      break;
    case FileType.File:
    case FileType.SymbolicLink:
      task = () => removeFile(path, fs, option);
      break;
    default:
      throw new Error(`unsupport file type (type = ${stat.type})`);
  }

  if (task) {
    return await scheduler.add(task);
  }
}
