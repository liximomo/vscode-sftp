import { Readable } from 'stream';
import * as fileOperations from './fileBaseOperations';
import { FileSystem, FileType } from './fs';
import { Task } from './scheduler';
import logger from '../logger';

let hasWarnedModifedTimePermission = false;

export enum TransferDirection {
  LOCAL_TO_REMOTE = 'local ➞ remote',
  REMOTE_TO_LOCAL = 'remote ➞ local',
}

interface FileHandle {
  fsPath: string;
  fileSystem: FileSystem;
}

export interface TransferOption {
  atime: number;
  mtime: number;
  mode?: number;
  fallbackMode?: number;
  perserveTargetMode: boolean;
}

export default class TransferTask implements Task {
  readonly fileType: FileType;
  private readonly _srcFsPath: string;
  private readonly _targetFsPath: string;
  private readonly _srcFs: FileSystem;
  private readonly _targetFs: FileSystem;
  private readonly _transferDirection: TransferDirection;
  private readonly _TransferOption: TransferOption;
  private _handle: Readable;
  private _cancelled: boolean;
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
    this._srcFsPath = src.fsPath;
    this._targetFsPath = target.fsPath;
    this._srcFs = src.fileSystem;
    this._targetFs = target.fileSystem;
    this._TransferOption = option.transferOption;
    this._transferDirection = option.transferDirection;
    this.fileType = option.fileType;
  }

  get localFsPath() {
    if (this._transferDirection === TransferDirection.REMOTE_TO_LOCAL) {
      return this._targetFsPath;
    } else {
      return this._srcFsPath;
    }
  }

  get srcFsPath() {
    return this._srcFsPath;
  }

  get targetFsPath() {
    return this._targetFsPath;
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
        await fileOperations.transferSymlink(src, target, srcFs, targetFs, this._TransferOption);
        break;
      default:
        throw new Error(`Unsupported file type (type = ${this.fileType})`);
    }
  }

  cancel() {
    if (this._handle && !this._cancelled) {
      this._cancelled = true;
      FileSystem.abortReadableStream(this._handle);
    }
  }

  isCancelled(): boolean {
    return this._cancelled;
  }

  private async _transferFile() {
    const src = this._srcFsPath;
    const target = this._targetFsPath;
    const srcFs = this._srcFs;
    const targetFs = this._targetFs;
    const { perserveTargetMode, fallbackMode, atime, mtime } = this._TransferOption;
    let { mode } = this._TransferOption;
    let targetFd;
    // Use mode first.
    // Then check perserveTargetMode and fallback to fallbackMode if fail to get mode of target
    if (mode === undefined && perserveTargetMode) {
      targetFd = await targetFs.open(target, 'w');
      [this._handle, mode] = await Promise.all([
        srcFs.get(src),
        targetFs
          .fstat(targetFd)
          .then(stat => stat.mode)
          .catch(() => fallbackMode),
      ]);
    } else {
      [this._handle, targetFd] = await Promise.all([srcFs.get(src), targetFs.open(target, 'w')]);
    }

    try {
      await targetFs.put(this._handle, target, { mode, fd: targetFd, autoClose: false });
      if (atime && mtime) {
        try {
          await targetFs.futimes(targetFd, Math.floor(atime / 1000), Math.floor(mtime / 1000));
        } catch (error) {
          if (!hasWarnedModifedTimePermission) {
            hasWarnedModifedTimePermission = true;
            logger.warn(`Can't set modified time to the file because ${error.message}`);
          }
        }
      }
    } finally {
      await targetFs.close(targetFd);
    }
  }
}
