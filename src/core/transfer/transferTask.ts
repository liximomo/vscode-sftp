import { FileSystem, FileType } from '..';
import { fileOperations } from '..';
import { Task } from '../scheduler';

export enum TransferDirection {
  Upload = 'upload',
  Download = 'download',
}

interface FileHandle {
  fsPath: string;
  fileSystem: FileSystem;
}

export interface TransferOption extends fileOperations.TransferOption {
  ignore?: (fsPath: string) => boolean;
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
  readonly fileType: FileType;
  private readonly _local: FileHandle;
  private readonly _remote: FileHandle;
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
    this.fileType = option.fileType;
    this._transferOption = option.transferOption;
    this._transferDirection = option.transferDirection;
  }

  get localFsPath() {
    return this._local.fsPath;
  }

  get remoteFsPath() {
    return this._remote.fsPath;
  }

  get transferType() {
    return this._transferDirection;
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

    switch (this.fileType) {
      case FileType.File:
        await fileOperations.transferFile(src, target, srcFs, targetFs, this._transferOption);
        break;
      case FileType.SymbolicLink:
        await targetFs.ensureDir(targetFs.pathResolver.dirname(target));
        await fileOperations.transferSymlink(src, target, srcFs, targetFs, this._transferOption);
        break;
      default:
        throw new Error(`Unsupported file type (type = ${this.fileType})`);
    }
  }
}
