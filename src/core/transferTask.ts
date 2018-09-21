import { FileSystem, FileType } from '.';
import { fileOperations } from '.';
import { Task } from './scheduler';

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

export default class TransferTask implements Task {
  readonly fileType: FileType;
  private readonly _src: FileHandle;
  private readonly _target: FileHandle;
  private readonly _transferDirection: TransferDirection;
  private readonly _transferOption: TransferOption;
  // private _fileStatus: FileStatus;

  constructor(
    src: FileHandle,
    target: FileHandle,
    option: {
      fileType: FileType;
      transferDirection: TransferDirection;
      transferOption: TransferOption;
    }
  ) {
    this._src = src;
    this._target = target;
    this.fileType = option.fileType;
    this._transferOption = option.transferOption;
    this._transferDirection = option.transferDirection;
  }

  get localFsPath() {
    if (this._transferDirection === TransferDirection.Download) {
      return this.targetFsPath;
    } else {
      return this.srcFsPath;
    }
  }

  private get srcFsPath() {
    return this._src.fsPath;
  }

  private get srcFs() {
    return this._src.fileSystem;
  }

  private get targetFsPath() {
    return this._target.fsPath;
  }

  private get targetFs() {
    return this._target.fileSystem;
  }

  get transferType() {
    return this._transferDirection;
  }

  // setFileStatus(fileStatus: FileStatus) {
  //   this._fileStatus = fileStatus;
  // }

  async run() {
    const src = this.srcFsPath;
    const target = this.targetFsPath;
    const srcFs = this.srcFs;
    const targetFs = this.targetFs;

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
