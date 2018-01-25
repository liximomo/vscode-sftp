import * as fs from 'fs';

export enum FileType {
  Directory = 1,
  File,
  SymbolicLink,
};

export interface IFileEntry {
  fspath: string,
  type: FileType,
  name: string,
  size: number,
  modifyTime: number,
  accessTime: number,
};

export interface IStreamOption {
  flags?: string,
  encoding?: string | null,
  mode?: number,
  autoClose?: boolean,
};

export interface IStats {
  type: FileType,
  permissionMode: number
  target?: string,
};

export default abstract class FileSystem {
  static getFileTypecharacter(stat: fs.Stats): FileType {
    if (stat.isDirectory()) {
      return FileType.Directory;
    } else if (stat.isFile()) {
      return FileType.File;
    } else if (stat.isSymbolicLink()) {
      return FileType.SymbolicLink;
    }
  }

  pathResolver: any;

  constructor(pathResolver: any) {
    this.pathResolver = pathResolver;
  }

  abstract get(path, option?: IStreamOption): Promise<fs.ReadStream>;
  abstract put(input: fs.ReadStream | Buffer, path, option?: IStreamOption): Promise<void>;
  abstract mkdir(dir: string): Promise<void>;
  abstract ensureDir(dir: string): Promise<void>;
  abstract list(dir: string, option?): Promise<IFileEntry[]>;
  abstract lstat(path: string): Promise<IStats>;
  abstract readlink(path: string): Promise<string>;
  abstract symlink(targetPath: string, path: string): Promise<void>;
  abstract unlink(path: string): Promise<void>;
  abstract rmdir(path: string, recursive: boolean): Promise<void>;
}
