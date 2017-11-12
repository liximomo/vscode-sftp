import * as fs from 'fs';
import * as FileStatus from 'stat-mode';
import * as output from '../../modules/output';
import FileSystem, { IFileEntry, FileType, IStats, IStreamOption } from './FileSystem';
import RemoteFileSystem from './RemoteFileSystem';
import { IClientOption } from '../Client/RemoteClient';
import SFTPClient from '../Client/SFTPClient';

export default class SFTPFileSystem extends RemoteFileSystem {
  constructor(pathResolver, option: IClientOption) {
    super(pathResolver);
    this.setClient(new SFTPClient(option));
  }

  get sftp() {
    return this.getClient().getFsClient();
  }

  lstat(path: string): Promise<IStats> {
    return new Promise((resolve, reject) => {
      this.sftp.lstat(path, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          ...stat,
          type: FileSystem.getFileTypecharacter(stat),
        } as IStats);
      });
    });
  }

  get(path, option?: IStreamOption): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      try {
        output.debug(`fs createReadStream ${path}`);
        const stream = this.sftp.createReadStream(path, option);
        resolve(stream);
      } catch (err) {
        output.error(`fs createReadStream ${path}`, err);
        reject(err);
      }
    });
  }

  put(input: fs.ReadStream | Buffer, path, option?: IStreamOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const stream = this.sftp.createWriteStream(path, option);

      stream.on('error', reject);
      stream.on('finish', resolve);

      if (input instanceof Buffer) {
        stream.end(input);
        return;
      }

      input.pipe(stream);
    });
  }

  readlink(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.sftp.readlink(path, (err, linkString) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(linkString);
      });
    });
  }

  symlink(targetPath: string, path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.sftp.symlink(targetPath, path, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  mkdir(dir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.sftp.mkdir(dir, err => {
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
      output.debug(`fs ensure dir exist ${dir}`);

      const tokens = dir.split('/');
      const root = tokens.shift();
      let dirPath = root === '' ? '/' : root;

      const mkdir = () => {
        let token = tokens.shift();
        if (!token && !tokens.length) {
          output.debug(`fs ensure dir exist ${dir}`, `done`);
          resolve();
          return;
        }
        token += '/';
        dirPath = this.pathResolver.join(dirPath, token);
        output.debug(`fs ensure dir exist ${dir}`, `mkdir ${dirPath}`);
        return this.mkdir(dirPath)
          .then(mkdir, err => {
            if (err.code === 4) {
              // ignore already exist
              mkdir();
            } else {
              output.error(`fs ensure dir exist ${dir}`, err);
              reject(err);
            }
          });
      };
      mkdir();
    });
  }

  toFileEntry(fullPath, item): IFileEntry {
    const stat = new FileStatus(item.attrs);
    return {
      fspath: fullPath,
      type: FileSystem.getFileTypecharacter(stat),
      name: item.filename,
      size: item.attrs.size,
      modifyTime: item.attrs.mtime * 1000,
      accessTime: item.attrs.atime * 1000,
    };
  }

  list(dir: string): Promise<IFileEntry[]> {
    return new Promise((resolve, reject) => {
      this.sftp.readdir(dir, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const fileEntries = result.map(item =>
          this.toFileEntry(this.pathResolver.join(dir, item.filename), item));
        resolve(fileEntries);
      });
    });
  }

  unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.sftp.unlink(path, err => {
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
      if (!recursive) {
        this.sftp.rmdir(path, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
        return;
      }

      this.list(path)
        .then(fileEntries => {
          if (!fileEntries.length) {
            this.rmdir(path, false)
              .then(resolve, e => {
                reject(e);
              });
            return;
          }

          const rmPromises = fileEntries.map(file => {
            if (file.type === FileType.Directory) {
              return this.rmdir(file.fspath, true);
            }
            return this.unlink(file.fspath);
          });

          Promise.all(rmPromises)
            .then(() => this.rmdir(path, false))
            .then(resolve, e => { // BUG just reject will occur weird bug.
              reject(e);
            });
        }, err => {
          reject(err);
        });
    });
  }
}
