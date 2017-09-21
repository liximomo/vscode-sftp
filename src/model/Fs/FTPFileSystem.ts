import * as fs from 'fs';
import * as FileStatus from 'stat-mode';
import FileSystem, { IFileEntry, FileType, IStats, IStreamOption } from './FileSystem';
import RemoteFileSystem from './RemoteFileSystem';
import { IClientOption } from '../Client/RemoteClient';
import FTPClient from '../Client/FTPClient';

export default class FTPFileSystem extends RemoteFileSystem {
  static getFileType(type) {
    if (type === 'd') {
      return FileType.Directory;
    } else if (type === '-') {
      return FileType.File;
    } else if (type === 'l') {
      return FileType.SymbolicLink;
    }
  }

  constructor(pathResolver, option: IClientOption) {
    super(pathResolver);
    this.setClient(new FTPClient(option));
  }

  get ftp() {
    return this.getClient().getFsClient();
  }

  lstat(path: string): Promise<IStats> {
    return new Promise((resolve, reject) => {
      this.ftp.list(path, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        const stat = stats[0];
        resolve({
          ...stat,
          type: FTPFileSystem.getFileType(stat.type),
        });
      });
    });
  }

  get(path, option?: IStreamOption): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      this.ftp.get(path, (err, stream) => {
        if (err) {
          reject(err);
          return;
        };

        if (!stream) {
          reject(new Error('create ReadStream failed'));
          return;
        }

        resolve(stream);
      });
    });
  }

  put(input: fs.ReadStream | Buffer, path, option?: IStreamOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ftp.put(input, path, err => {
        if (err) {
          reject(err);
          return;
        };

        resolve();
      });
    });
  }

  readlink(path: string): Promise<string> {
    return this.lstat(path)
      .then(stat => stat.target)
  }

  symlink(targetPath: string, path: string): Promise<void> {
    // TO-DO implement
    return Promise.resolve();
  }

  mkdir(dir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ftp.mkdir(dir, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  ensureDir(dir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tokens = dir.split('/');
      const root = tokens.shift();
      let dirPath = root === '' ? '/' : root;

      const mkdir = () => {
        let token = tokens.shift();
        if (!token && !tokens.length) {
          resolve();
          return;
        }
        token += '/';
        dirPath = this.pathResolver.join(dirPath, token);
        return this.mkdir(dirPath)
          .then(mkdir, err => {
            // if (err && err.message !== 'Cannot create a file when that file already exists.')
            if (err.code === 550) {
              // ignore already exist
              mkdir();
            } else {
              reject(err);
            }
          });
      };
      mkdir();
    });
  }

  toFileEntry(fullPath, stat): IFileEntry {
    return {
      fspath: fullPath,
      type: FTPFileSystem.getFileType(stat.type),
      name: stat.name,
      size: stat.size,
      modifyTime: stat.date.getTime() / 1000,
      accessTime: stat.date.getTime() / 1000,
    };
  }

  list(dir: string): Promise<IFileEntry[]> {
    return new Promise((resolve, reject) => {
      this.ftp.list(dir, (err, result = []) => {
        if (err) {
          reject(err);
          return;
        }

        const fileEntries = result.map(item =>
          this.toFileEntry(this.pathResolver.join(dir, item.name), item));
        resolve(fileEntries);
      });
    });
  }

  unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ftp.delete(path, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  rmdir(path: string, recursive: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ftp.rmdir(path, recursive, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      })
    });
  }
}
