import * as fs from 'fs';

export enum FileType {
  Directory = 1,
  File,
  SymbolicLink,
};

export type FileEntry = {
  fspath: string,
  type: FileType,
  name: string,
  size: number,
  modifyTime: number,
  accessTime: number,
};

export type StreamOption = {
  flags: string,
  encoding: string | null,
  mode: number,
  autoClose: boolean,
};

export type Stats = {
  type: FileType,
};

export default abstract class FileSystem {
  public pathResolver: any;

  protected defaultStreamOption = {
    encoding: 'utf8',
  }

  constructor(pathResolver: any) {
    this.pathResolver = pathResolver;
  }

  abstract get(path, option?: StreamOption): Promise<fs.ReadStream>;
  abstract put(input: fs.ReadStream | Buffer, path, option?: StreamOption): Promise<null>;
  abstract mkdir(dir: string): Promise<null>;
  abstract ensureDir(dir: string): Promise<null>;
  abstract list(dir: string): Promise<FileEntry[]>;
  abstract lstat(path: string): Promise<Stats>;
  abstract readlink(path: string): Promise<string>;
  abstract symlink(targetPath: string, path: string): Promise<null>;

  getFileTypecharacter(stat: fs.Stats): FileType {
    if (stat.isDirectory()) {
      return FileType.Directory;
    } else if (stat.isFile()) {
      return FileType.File;
    } else if (stat.isSymbolicLink()) {
      return FileType.SymbolicLink;
    }
  }
}
