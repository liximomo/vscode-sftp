import * as fileOperations from './fileBaseOperations';
import { FileSystem, FileType } from './fs';
import { Task } from './scheduler';

export enum TransferDirection {
  Upload = 'upload',
  Download = 'download',
}

interface FileHandle {
  fsPath: string;
  fileSystem: FileSystem;
}

import FileOption = fileOperations.FileOption;

export default class TransferTask implements Task {
  readonly fileType: FileType;
  private readonly _srcFsPath: string;
  private readonly _targetFsPath: string;
  private readonly _srcFs: FileSystem;
  private readonly _targetFs: FileSystem;
  private readonly _transferDirection: TransferDirection;
  private readonly _fileOption: FileOption;
  // private _fileStatus: FileStatus;

  constructor(
    src: FileHandle,
    target: FileHandle,
    option: {
      fileType: FileType;
      transferDirection: TransferDirection;
      transferOption: FileOption;
    }
  ) {
    this._srcFsPath = src.fsPath;
    this._targetFsPath = target.fsPath;
    this._srcFs = src.fileSystem;
    this._targetFs = target.fileSystem;
    this._fileOption = option.transferOption;
    this._transferDirection = option.transferDirection;
    this.fileType = option.fileType;
  }

  get localFsPath() {
    if (this._transferDirection === TransferDirection.Download) {
      return this._targetFsPath;
    } else {
      return this._srcFsPath;
    }
  }

  get transferType() {
    return this._transferDirection;
  }

  async run() {
    const src = this._srcFsPath;
    const target = this._targetFsPath;
    const srcFs = this._srcFs;
    const targetFs = this._targetFs;

    switch (this.fileType) {
      case FileType.File:
        await this._transferFile();
        break;
      case FileType.SymbolicLink:
        await fileOperations.transferSymlink(src, target, srcFs, targetFs, this._fileOption);
        break;
      default:
        throw new Error(`Unsupported file type (type = ${this.fileType})`);
    }
  }

  async _transferFile() {
    const src = this._srcFsPath;
    const target = this._targetFsPath;
    const srcFs = this._srcFs;
    const targetFs = this._targetFs;
    const { perserveTargetMode } = this._fileOption;
    let { mode } = this._fileOption;
    let inputStream;
    if (mode === undefined && perserveTargetMode) {
      [inputStream, mode] = await Promise.all([
        srcFs.get(src),
        fileOperations.getFileMode(target, targetFs),
      ]);
    } else {
      inputStream = await srcFs.get(src);
    }
    await targetFs.put(inputStream, target, { mode });
    // await inputStream.handle;
  }
}
