import app from '../../app';
import { simplifyPath } from '../../helper';
import { FileType, FileSystem } from '../fs';
import upath from '../upath';
import Scheduler from '../scheduler';
import TransferTask, {
  TransferOption,
  TransferDirection,
  getTransferSrcAndTarget,
} from './transferTask';

export { TransferOption, TransferDirection } from './transferTask';

export { TransferTask };

export async function transfer(
  scheduler: Scheduler<TransferTask>,
  config: {
    localFsPath: string;
    remoteFsPath: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  }
) {
  const stat = await config.remoteFs.lstat(config.remoteFsPath);
  transferWithType(scheduler, config, stat.type);
}

async function transferWithType(
  scheduler: Scheduler<TransferTask>,
  config: {
    localFsPath: string;
    remoteFsPath: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  },
  fileType: FileType
) {
  if (config.option.ignore && config.option.ignore(config.localFsPath)) {
    return;
  }

  switch (fileType) {
    case FileType.Directory:
      transferFolder(scheduler, config);
      break;
    case FileType.File:
    case FileType.SymbolicLink:
      scheduler.add(
        new TransferTask(
          {
            fsPath: config.localFsPath,
            fileSystem: config.localFs,
          },
          {
            fsPath: config.remoteFsPath,
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
  scheduler: Scheduler<TransferTask>,
  config: {
    localFsPath: string;
    remoteFsPath: string;
    localFs: FileSystem;
    remoteFs: FileSystem;
    option: TransferOption;
    transferDirection: TransferDirection;
  }
) {
  const { src, srcFs, target, targetFs } = getTransferSrcAndTarget(
    {
      fsPath: config.localFsPath,
      fileSystem: config.localFs,
    },
    {
      fsPath: config.remoteFsPath,
      fileSystem: config.remoteFs,
    },
    config.transferDirection
  );

  if (config.option.ignore && config.option.ignore(src)) {
    return;
  }

  app.sftpBarItem.showMsg(`retrieving directory ${upath.basename(src)}`, simplifyPath(src));

  // Need this to make sure file can correct transfer
  await targetFs.ensureDir(target);

  const fileEntries = await srcFs.list(src);
  fileEntries.forEach(file =>
    transferWithType(
      scheduler,
      {
        ...config,
        localFsPath: config.localFs.pathResolver.join(config.localFsPath, file.name),
        remoteFsPath: config.remoteFs.pathResolver.join(config.remoteFsPath, file.name),
      },
      file.type
    )
  );
}

// export function download(
//   scheduler: Scheduler,
//   config: {
//     localFsPath: string;
//     remoteFsPath: string;
//     localFs: FileSystem;
//     remoteFs: FileSystem;
//     option: any;
//   }
// ) {
//   transfer(scheduler, {
//     ...config,
//     transferDirection: TransferDirection.Download,
//   });
// }

// export function upload(
//   scheduler: Scheduler,
//   config: {
//     localFsPath: string;
//     remoteFsPath: string;
//     localFs: FileSystem;
//     remoteFs: FileSystem;
//     option: TransferOption;
//   }
// ) {
//   transfer(scheduler, {
//     ...config,
//     transferDirection: TransferDirection.Upload,
//   });
// }
