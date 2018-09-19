import app from '../../app';
import { simplifyPath } from '../../helper';
import { FileType, FileSystem } from '../fs';
import upath from '../upath';
import Scheduler from './scheduler';
import TransferTask, { TransferDirection, getTransferSrcAndTarget } from './transferTask';

function shouldSkip(path, ignore) {
  if (ignore) {
    return ignore(path);
  }

  return false;
}

async function transfer(
  scheduler: Scheduler,
  config: {
    local: string;
    remote: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: any;
    transferDirection: TransferDirection;
  }
) {
  const stat = await config.remoteFs.lstat(config.remote);
  transferWithType(scheduler, config, stat.type);
}

async function transferWithType(
  scheduler: Scheduler,
  config: {
    local: string;
    remote: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: any;
    transferDirection: TransferDirection;
  },
  fileType: FileType
) {
  switch (fileType) {
    case FileType.Directory:
      transferFolder(scheduler, config);
      break;
    case FileType.File:
    case FileType.SymbolicLink:
      scheduler.add(
        new TransferTask(
          {
            fsPath: config.local,
            fileSystem: config.localFs,
          },
          {
            fsPath: config.remote,
            fileSystem: config.remoteFs,
          },
          {
            fileType,
            transferDirection: config.transferDirection,
            transferOption: config.option,
          }
        )
      );
      break;
    default:
      throw new Error(`Unsupported file type (type = ${fileType})`);
  }
}

async function transferFolder(
  scheduler: Scheduler,
  config: {
    local: string;
    remote: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: any;
    transferDirection: TransferDirection;
  }
) {
  const { src, srcFs, target, targetFs } = getTransferSrcAndTarget(
    {
      fsPath: config.local,
      fileSystem: config.localFs,
    },
    {
      fsPath: config.remote,
      fileSystem: config.remoteFs,
    },
    config.transferDirection
  );

  if (shouldSkip(src, config.option.ignore)) {
    return;
  }

  app.sftpBarItem.showMsg(`retrieving directory ${upath.basename(src)}`, simplifyPath(src));

  // Need this to make sure file can correct transfer
  await targetFs.ensureDir(target);

  const fileEntries = await srcFs.list(src);
  fileEntries.forEach(file => transferWithType(scheduler, config, file.type));
}

export function download(
  scheduler: Scheduler,
  config: {
    local: string;
    remote: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: any;
  }
) {
  transfer(scheduler, {
    ...config,
    transferDirection: TransferDirection.Download,
  });
}

export function upload(
  scheduler: Scheduler,
  config: {
    local: string;
    remote: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: any;
  }
) {
  transfer(scheduler, {
    ...config,
    transferDirection: TransferDirection.Upload,
  });
}
