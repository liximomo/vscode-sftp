import * as fs from 'fs';
import * as FileStatus from 'stat-mode';
import logger from '../../logger';
import FileSystem, { IFileEntry, FileType, IStats, IStreamOption } from './FileSystem';
import RemoteFileSystem from './RemoteFileSystem';
import { IClientOption } from '../Client/RemoteClient';
import FTPClient from '../Client/FTPClient';

const numMap = {
  r: 4,
  w: 2,
  x: 1,
};

function toNumMode(rightObj) {
  // some ftp server would reusult rightObj undefined.
  if (!rightObj) return 0o666;

  // tslint:disable-next-line:no-shadowed-variable
  const modeStr = Object.keys(rightObj).reduce((modeStr, key) => {
    const rightStr = rightObj[key];
    let cur = 0;
    for (const char of rightStr) {
      cur += numMap[char];
    }
    return modeStr + cur;
  }, '');

  return parseInt(modeStr, 8);
}

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

  // $caution windows will always get 0o666
  lstat(path: string): Promise<IStats> {
    return new Promise((resolve, reject) => {
      this.ftp.list(this.pathResolver.dirname(path), (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        const fileStat = stats
          .map(stat => ({
            ...stat,
            type: FTPFileSystem.getFileType(stat.type),
            permissionMode: toNumMode(stat.rights),
          }))
          .find(ns => ns.name === this.pathResolver.basename(path));

        if (!fileStat) {
          reject(new Error('file not exist'));
          return;
        }

        resolve(fileStat);
      });
    });
  }

  get(path, option?: IStreamOption): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      this.ftp.get(path, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        if (!stream) {
          reject(new Error('create ReadStream failed'));
          return;
        }

        resolve(stream);
      });
    });
  }

  chmod(path: string, mode: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const command = `CHMOD ${mode.toString(8)} ${path}`;
      this.ftp.site(command, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  put(input: fs.ReadStream | Buffer, path, option?: IStreamOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ftp.put(input, path, err => {
        if (err) {
          reject(err);
          return;
        }

        if (option && option.mode) {
          this.chmod(path, option.mode)
            .then(resolve)
            .catch(error => {
              // ignore error;
              // $todo throw this error and ignore this error at up level.
              logger.error(`change ${path} mode to ${option.mode.toString(8)}`, error);
              resolve();
            });
          return;
        }

        resolve();
      });
    });
  }

  readlink(path: string): Promise<string> {
    return this.lstat(path).then(stat => stat.target);
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

  async ensureDir(dir: string): Promise<void> {
    await this._ensureDir(dir, true);
  }

  async _ensureDir(dir: string, checkExistFirst: boolean): Promise<void> {
    // check if exist first
    // cause ftp don't return distinct error code for dir not exists and dir exists
    if (checkExistFirst) {
      try {
        const stat = await this.lstat(dir);
        if (stat.type !== FileType.Directory) {
          throw new Error(`${dir} is not a valid directory path`);
        }

        // already exists
        return;
      } catch {
        // ignore error
      }
    }

    let err;
    try {
      await this.mkdir(dir);
      return;
    } catch (error) {
      // avoid nested code block
      err = error;
    }

    switch (err.code) {
      // because check if exist first, so here must be dir not exists
      case 550:
        const parentPath = this.pathResolver.dirname(dir);
        if (parentPath === dir) throw err;
        await this._ensureDir(parentPath, false);
        await this.mkdir(dir);
        break;

      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.
      default:
        try {
          const stat = await this.lstat(dir);
          if (stat.type !== FileType.Directory) throw err;
        } catch {
          // if the stat fails, then that's super weird.
          // let the original error be the failure reason
          throw err;
        }
        break;
    }
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

  list(dir: string, { showHiddenFiles = true } = {}): Promise<IFileEntry[]> {
    return new Promise((resolve, reject) => {
      this.ftp.list(showHiddenFiles ? `-al ${dir}` : dir, (err, result = []) => {
        if (err) {
          reject(err);
          return;
        }

        const fileEntries = result
          .filter(item => item.name !== '.' && item.name !== '..')
          .map(item => this.toFileEntry(this.pathResolver.join(dir, item.name), item));
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
      });
    });
  }
}
