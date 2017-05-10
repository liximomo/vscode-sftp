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
  isDirectory: () => boolean,
  isFile:  () => boolean,
  isSymbolicLink:  () => boolean,
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
  abstract put(input: fs.ReadStream | Buffer, path, option?: StreamOption): Promise<any>;
  abstract mkdir(dir: string): Promise<any>;
  abstract ensureDir(dir: string): Promise<any>;
  abstract list(dir: string): Promise<FileEntry[]>;
  abstract stat(path: string): Promise<Stats>;

  getFileTypecharacter(stat: fs.Stats) {
    if (stat.isDirectory()) {
      return FileType.Directory;
    } else if (stat.isFile()) {
      return FileType.File;
    } else if (stat.isSymbolicLink()) {
      return FileType.SymbolicLink;
    }
  }
}
