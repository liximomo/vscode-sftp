import {
  Scheduler,
  FileSystem,
  FileEntry,
  FileType,
  TransferTask,
  TransferOption,
  TransferDirection,
  fileOperations,
} from '../../core';

type SyncModel = 'full' | 'update';

function toHash<T, R = T>(items: T[], key: string, transform?: (a: T) => R): { [key: string]: R } {
  return items.reduce((hash, item) => {
    const transformedItem = transform ? transform(item) : item;
    hash[transformedItem[key]] = transformedItem;
    return hash;
  }, {});
}

async function transferFolder(
  scheduler: Scheduler<TransferTask>,
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  }
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
        scheduler,
        {
          ...config,
          srcFsPath: file.fspath,
          targetFsPath: targetFs.pathResolver.join(targetFsPath, file.name),
        },
        file.type
      )
    )
  );
}

function transferFile(
  scheduler: Scheduler<TransferTask>,
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  },
  fileType: FileType
) {
  scheduler.add(
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
  scheduler: Scheduler<TransferTask>,
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  },
  fileType: FileType
) {
  if (config.option.ignore && config.option.ignore(config.srcFsPath)) {
    return;
  }

  switch (fileType) {
    case FileType.Directory:
      await transferFolder(scheduler, config);
      break;
    case FileType.File:
    case FileType.SymbolicLink:
      transferFile(scheduler, config, fileType);
      break;
    default:
      throw new Error(`Unsupported file type (type = ${fileType})`);
  }
}

export { TransferOption, TransferDirection };

export async function transfer(
  scheduler: Scheduler<TransferTask>,
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  }
) {
  const stat = await config.srcFs.lstat(config.srcFsPath);
  await transferWithType(scheduler, config, stat.type);
}

export interface SyncOption extends TransferOption {
  model: SyncModel;
}

export async function sync(
  scheduler: Scheduler<TransferTask>,
  config: {
    srcFsPath: string;
    targetFsPath: string;
    srcFs: FileSystem;
    targetFs: FileSystem;
    option: SyncOption;
    transferDirection: TransferDirection;
  }
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

    file2trans.forEach(([src, target]) =>
      transferFile(
        scheduler,
        {
          ...config,
          srcFsPath: src,
          targetFsPath: target,
        },
        FileType.File
      )
    );

    dir2trans.forEach(([src, target]) =>
      transferFolder(scheduler, {
        ...config,
        srcFsPath: src,
        targetFsPath: target,
      })
    );

    fileMissed.forEach(file => fileOperations.removeFile(file, targetFs, config.option));

    dirMissed.forEach(file => fileOperations.removeDir(file, targetFs, config.option));

    return Promise.all(
      dir2sync.map(([src, target]) =>
        sync(scheduler, {
          ...config,
          srcFsPath: src,
          targetFsPath: target,
        })
      )
    );
  };

  // create dir here so we don't have to ensure it for children files.
  await targetFs.ensureDir(targetFsPath);

  const files = await Promise.all([
    srcFs.list(srcFsPath).catch(err => []),
    targetFs.list(targetFsPath).catch(err => []),
  ]);
  await syncFiles(...files);
}
