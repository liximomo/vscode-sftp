import {
  FileSystem,
  FileEntry,
  FileType,
  TransferTask,
  TransferDirection,
  fileOperations,
} from '../../core';
import { flatten } from '../../utils';

interface TransferOption extends fileOperations.TransferOption {
  ignore?: (filepath: string) => boolean;
}

type SyncModel = 'full' | 'update';

interface SyncOption extends TransferOption {
  model: SyncModel;
}

function toHash<T, R = T>(items: T[], key: string, transform?: (a: T) => R): { [key: string]: R } {
  return items.reduce((hash, item) => {
    const transformedItem = transform ? transform(item) : item;
    hash[transformedItem[key]] = transformedItem;
    return hash;
  }, {});
}

async function transferFolder(
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  },
  collect: (t: TransferTask) => void
) {
  const { srcFsPath, targetFsPath, srcFs, targetFs, option } = config;

  if (option.ignore && option.ignore(srcFsPath)) {
    return;
  }

  // Need this to make sure file can correct transfer
  await targetFs.ensureDir(targetFsPath);

  const fileEntries = await srcFs.list(srcFsPath);
  await Promise.all(
    fileEntries.map(file =>
      transferWithType(
        {
          ...config,
          srcFsPath: file.fspath,
          targetFsPath: targetFs.pathResolver.join(targetFsPath, file.name),
          ensureDirExist: false,
        },
        file.type,
        collect
      )
    )
  );
}

function transferFile(
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  },
  fileType: FileType,
  collect: (t: TransferTask) => void
) {
  if (config.option.ignore && config.option.ignore(config.srcFsPath)) {
    return;
  }

  collect(
    new TransferTask(
      {
        fsPath: config.srcFsPath,
        fileSystem: config.srcFs,
      },
      {
        fsPath: config.targetFsPath,
        fileSystem: config.targetFs,
      },
      {
        fileType,
        transferDirection: config.transferDirection,
        transferOption: config.option,
      }
    )
  );
}

async function transferWithType(
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
    ensureDirExist: boolean;
  },
  fileType: FileType,
  collect: (t: TransferTask) => void
) {
  switch (fileType) {
    case FileType.Directory:
      await transferFolder(config, collect);
      break;
    case FileType.File:
    case FileType.SymbolicLink:
      if (config.ensureDirExist) {
        const { targetFs, targetFsPath } = config;
        await targetFs.ensureDir(targetFs.pathResolver.dirname(targetFsPath));
      }
      transferFile(config, fileType, collect);
      break;
    default:
      throw new Error(`Unsupported file type (type = ${fileType})`);
  }
}

async function removeFile(file: string, fs: FileSystem, fileType: FileType, option) {
  if (option.ignore && option.ignore(file)) {
    return;
  }

  switch (fileType) {
    case FileType.Directory:
      await fileOperations.removeDir(file, fs, option);
      break;
    case FileType.File:
    case FileType.SymbolicLink:
      await fileOperations.removeFile(file, fs, option);
      break;
    default:
      break;
  }
}

export { TransferOption, SyncOption, TransferDirection };

export async function transfer(
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  },
  collect: (t: TransferTask) => void
) {
  const stat = await config.srcFs.lstat(config.srcFsPath);
  await transferWithType({ ...config, ensureDirExist: true }, stat.type, collect);
}

export async function sync(
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: SyncOption;
    transferDirection: TransferDirection;
  },
  collect: (t: TransferTask) => void
) {
  const { srcFsPath, targetFsPath, srcFs, targetFs, option } = config;
  if (option.ignore && option.ignore(srcFsPath)) {
    return;
  }

  const syncFiles = (srcFileEntries: FileEntry[], desFileEntries: FileEntry[]) => {
    const srcFileTable = toHash(srcFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: fileEntry.name,
    }));

    const desFileTable = toHash(desFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: fileEntry.name,
    }));

    const file2trans: [string, string][] = [];
    const dir2trans: [string, string][] = [];
    const dir2sync: [string, string][] = [];

    const fileMissed: string[] = [];
    const dirMissed: string[] = [];

    Object.keys(srcFileTable).forEach(id => {
      const srcFile = srcFileTable[id];
      const file = desFileTable[id];
      delete desFileTable[id];

      if (file) {
        // files exist on both side
        switch (srcFile.type) {
          case FileType.Directory:
            dir2sync.push([srcFile.fspath, file.fspath]);
            break;
          case FileType.File:
          case FileType.SymbolicLink:
            file2trans.push([srcFile.fspath, file.fspath]);
            break;
          default:
          // do not process
        }
      } else if (option.model === 'full') {
        const _targetFsPath = targetFs.pathResolver.join(targetFsPath, srcFile.name);
        // files exist only on src
        switch (srcFile.type) {
          case FileType.Directory:
            dir2trans.push([srcFile.fspath, _targetFsPath]);
            break;
          case FileType.File:
          case FileType.SymbolicLink:
            file2trans.push([srcFile.fspath, _targetFsPath]);
            break;
          default:
          // do not process
        }
      }
    });

    if (option.model === 'full') {
      // for files exist only on target
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

    // side-effect
    fileMissed.forEach(file => removeFile(file, targetFs, FileType.File, config.option));
    dirMissed.forEach(file => removeFile(file, targetFs, FileType.Directory, config.option));

    const transFilePromise = file2trans.map(([src, target]) =>
      transferFile(
        {
          ...config,
          srcFsPath: src,
          targetFsPath: target,
        },
        FileType.File,
        collect
      )
    );

    const transDirPromise = dir2trans.map(([src, target]) =>
      transferFolder(
        {
          ...config,
          srcFsPath: src,
          targetFsPath: target,
        },
        collect
      )
    );

    const syncPromise = dir2sync.map(([src, target]) =>
      sync(
        {
          ...config,
          srcFsPath: src,
          targetFsPath: target,
        },
        collect
      )
    );

    return Promise.all([...transFilePromise, ...transDirPromise, ...syncPromise]).then(flatten);
  };

  // create dir here so we don't have to ensure it for children files.
  await targetFs.ensureDir(targetFsPath);

  const files = await Promise.all([
    srcFs.list(srcFsPath).catch(err => []),
    targetFs.list(targetFsPath).catch(err => []),
  ]);
  await syncFiles(...files);
}
