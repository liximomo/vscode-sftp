import { FileType, FileSystem } from '../fs';
import { transferFile, transferSymlink, TransferOption } from '../fileBaseOperations';
import { Task } from './scheduler';

export enum TransferDirection {
  Upload,
  Download,
}

interface FileHandle {
  fsPath: string;
  fileSystem: FileSystem;
}

export function getTransferSrcAndTarget(
  local: FileHandle,
  remote: FileHandle,
  transferDirection: TransferDirection
) {
  if (transferDirection === TransferDirection.Upload) {
    return {
      src: local.fsPath,
      target: remote.fsPath,
      srcFs: local.fileSystem,
      targetFs: remote.fileSystem,
    };
  } else if (transferDirection === TransferDirection.Download) {
    return {
      src: remote.fsPath,
      target: local.fsPath,
      srcFs: remote.fileSystem,
      targetFs: local.fileSystem,
    };
  } else {
    throw new Error(`Unsupported TransferDirection(${this._transferDirection})`);
  }
}

export default class TransferTask implements Task {
  private readonly _local: FileHandle;
  private readonly _remote: FileHandle;
  private readonly _fileType: FileType;
  private readonly _transferDirection: TransferDirection;
  private readonly _transferOption: TransferOption;
  // private _fileStatus: FileStatus;

  constructor(
    local: FileHandle,
    remote: FileHandle,
    option: {
      fileType: FileType;
      transferDirection: TransferDirection;
      transferOption: TransferOption;
    }
  ) {
    this._local = local;
    this._remote = remote;
    this._fileType = option.fileType;
    this._transferOption = option.transferOption;
    this._transferDirection = option.transferDirection;
  }

  // setFileStatus(fileStatus: FileStatus) {
  //   this._fileStatus = fileStatus;
  // }

  async run() {
    const { src, target, srcFs, targetFs } = getTransferSrcAndTarget(
      this._local,
      this._remote,
      this._transferDirection
    );

    switch (this._fileType) {
      case FileType.File:
        await transferFile(src, target, srcFs, targetFs, this._transferOption);
        break;
      case FileType.SymbolicLink:
        await targetFs.ensureDir(targetFs.pathResolver.dirname(target));
        await transferSymlink(src, target, srcFs, targetFs, this._transferOption);
        break;
      default:
        throw new Error(`Unsupported file type (type = ${this._fileType})`);
    }
  }
}

// function getTransferContext(
//   action: FileTransferAction
// ): {
//   if (action.direction === TransferDirection.Upload) {
//     return {
//       src: string;
//       des: string;
//       localFS: FileSystem;
//       remoteFS: FileSystem;
//     }
//   }
// } {
//   return {

//   }
// }

// const handleTransferAction = createActionHanler(
//   {
//     [FileType.File](action: FileTransferAction, ctx) {
//       const { localFS, remoteFS, transferOption } = ctx;
//       return transferFile(fsPath, targetFsPath, localFS, remoteFS, transferOption);
//     },
//     [FileType.SymbolicLink](action: FileTransferAction, ctx) {
//       return transferSymlink(fsPath, targetFsPath, localFS, remoteFS, transferOption);
//     },
//   },
//   'fileType'
// );
