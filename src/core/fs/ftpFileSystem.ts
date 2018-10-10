import * as PQueue from 'p-queue';
import { Readable } from 'stream';
import logger from '../../logger';
import { FileEntry, FileType, FileStats, FileOption } from './fileSystem';
import RemoteFileSystem from './remoteFileSystem';
import { FTPClient } from '../remote-client';

interface FtpFileHandle {
  path: string;
  flags: string;
  mode: number;
}

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

function toFileStat(stat): FileStats {
  const mtime = stat.date.getTime();
  return {
    type: FTPFileSystem.getFileType(stat.type),
    mode: toNumMode(stat.rights), // Caution: windows will always get 0o666
    size: stat.size,
    mtime,
    atime: mtime,
    target: stat.target,
  };
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

  private queue: any = new PQueue({ concurrency: 1 });

  get ftp() {
    return this.getClient().getFsClient();
  }

  _createClient(option) {
    return new FTPClient(option);
  }

  async lstat(path: string): Promise<FileStats> {
    if (path === '/') {
      return {
        type: FileType.Directory,
        mode: 0o666,
        size: 0,
        mtime: 0,
        atime: 0,
      };
    }

    const parentPath = this.pathResolver.dirname(path);
    const nameIdentity = this.pathResolver.basename(path);
    const stats = await this.list(parentPath);

    const fileStat = stats.find(ns => ns.name === nameIdentity);

    if (!fileStat) {
      throw new Error('file not exist');
    }

    return fileStat;
  }

  open(path: string, flags: string, mode?: number): Promise<FtpFileHandle> {
    return Promise.resolve({
      path,
      flags,
      mode,
    });
  }

  close(_fd: FtpFileHandle): Promise<void> {
    return Promise.resolve();
  }

  fstat(fd: FtpFileHandle): Promise<FileStats> {
    return this.lstat(fd.path);
  }

  futimes(fd: FtpFileHandle, _atime: number, mtime: number): Promise<void> {
    return this.atomicSetLastMod(fd.path, mtime).catch(err => {
      // swallow the err
      logger.error(err, `fail to set modified time to ${fd.path}`);
    });
  }

  async get(path, _option?: FileOption): Promise<Readable> {
    const stream = await this.atomicGet(path);

    if (!stream) {
      throw new Error('create ReadStream failed');
    }

    return stream;
  }

  async chmod(path: string, mode: number): Promise<void> {
    const command = `CHMOD ${mode.toString(8)} ${path}`;
    await this.atomicSite(command);
  }

  async put(input: Readable | Buffer, path, _option?: FileOption): Promise<void> {
    await this.atomicPut(input, path);
  }

  readlink(path: string): Promise<string> {
    return this.lstat(path).then(stat => stat.target);
  }

  symlink(_targetPath: string, _path: string): Promise<void> {
    // TO-DO implement
    return Promise.resolve();
  }

  async mkdir(dir: string): Promise<void> {
    await this.atomicMakeDir(dir);
  }

  async ensureDir(dir: string): Promise<void> {
    await this._ensureDir(dir, true);
  }

  async _ensureDir(dir: string, checkExistFirst: boolean): Promise<void> {
    // check if exist first
    // cause ftp don't return distinct error code for dir not exists and dir exists
    if (checkExistFirst) {
      let stat;
      try {
        stat = await this.lstat(dir);
      } catch {
        // ignore error
      }

      if (stat) {
        if (stat.type !== FileType.Directory) {
          logger.error(`${dir} (type = ${stat.type})is not a directory`);
          throw new Error(`${dir} is not a valid directory path`);
        }

        return;
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

  toFileEntry(fullPath, stat): FileEntry {
    return {
      fspath: fullPath,
      name: stat.name,
      ...toFileStat(stat),
    };
  }

  async list(dir: string, { showHiddenFiles = true } = {}): Promise<FileEntry[]> {
    const stats = await this.atomicList(showHiddenFiles ? `-al ${dir}` : dir);

    return (
      stats
        // item will be a string if ftp fail to parse it (https://github.com/liximomo/vscode-sftp/issues/308)
        // we simply ignore it by check whether it has a name property
        .filter(item => item.name && item.name !== '.' && item.name !== '..')
        .map(item => this.toFileEntry(this.pathResolver.join(dir, item.name), item))
    );
  }

  async unlink(path: string): Promise<void> {
    await this.atomicDeleteFile(path);
  }

  async rmdir(path: string, recursive: boolean): Promise<void> {
    await this.atomicRemoveDir(path, recursive);
  }

  private async atomicList(path: string): Promise<any[]> {
    const task = () =>
      new Promise<any[]>((resolve, reject) => {
        this.ftp.list(path, (err, stats) => {
          if (err) {
            return reject(err);
          }

          resolve(stats || []);
        });
      });

    return this.queue.add(task);
  }

  private async atomicGet(path: string): Promise<Readable> {
    const task = () =>
      new Promise<Readable>((resolve, reject) => {
        this.ftp.get(path, (err, stream) => {
          if (err) {
            return reject(err);
          }

          resolve(stream);
        });
      });

    return this.queue.add(task);
  }

  private async atomicPut(input: Readable | Buffer, path: string): Promise<void> {
    const task = () =>
      new Promise<void>((resolve, reject) => {
        this.ftp.put(input, path, err => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });

    return this.queue.add(task);
  }

  private async atomicDeleteFile(path: string): Promise<void> {
    const task = () =>
      new Promise<void>((resolve, reject) => {
        this.ftp.delete(path, err => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });

    return this.queue.add(task);
  }

  private async atomicMakeDir(path: string): Promise<void> {
    const task = () =>
      new Promise<void>((resolve, reject) => {
        this.ftp.mkdir(path, err => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });

    return this.queue.add(task);
  }

  private async atomicRemoveDir(path: string, recursive: boolean): Promise<void> {
    const task = () =>
      new Promise<void>((resolve, reject) => {
        this.ftp.rmdir(path, recursive, err => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });

    return this.queue.add(task);
  }

  private async atomicSite(command: string): Promise<void> {
    const task = () =>
      new Promise<void>((resolve, reject) => {
        this.ftp.site(command, err => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });

    return this.queue.add(task);
  }

  private async atomicSetLastMod(path: string, time: number): Promise<void> {
    const task = () =>
      new Promise<void>((resolve, reject) => {
        this.ftp.setLastMod(path, time, err => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });

    return this.queue.add(task);
  }
}
