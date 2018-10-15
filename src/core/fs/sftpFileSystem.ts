import { Readable, Writable } from 'stream';
import FileSystem, { FileEntry, FileType, FileStats, FileOption } from './fileSystem';
import RemoteFileSystem from './remoteFileSystem';
import { SSHClient } from '../remote-client';

interface WriteStream extends Writable {
  handle: Buffer;
  path: string;
  flags: string;
  mode: number;
  destroy(): void;
  close(): void;
}

function toSimpleFileMode(mode: number) {
  return mode & parseInt('777', 8); // tslint:disable-line:no-bitwise
}

function toFileStat(stat): FileStats {
  return {
    type: FileSystem.getFileTypecharacter(stat),
    mode: toSimpleFileMode(stat.mode), // tslint:disable-line:no-bitwise
    size: stat.size,
    mtime: stat.mtime * 1000,
    atime: stat.atime * 1000,
  };
}

export default class SFTPFileSystem extends RemoteFileSystem {
  get sftp() {
    return this.getClient().getFsClient();
  }

  _createClient(option) {
    return new SSHClient(option);
  }

  lstat(path: string): Promise<FileStats> {
    return new Promise((resolve, reject) => {
      this.sftp.lstat(path, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(toFileStat(stat));
      });
    });
  }

  open(path: string, flags: string, mode?: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.sftp.open(path, flags, mode, (err, handle) => {
        if (err) {
          return reject(err);
        }

        resolve(handle);
      });
    });
  }

  close(fd: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sftp.close(fd, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  fstat(fd: Buffer): Promise<FileStats> {
    return new Promise((resolve, reject) => {
      this.sftp.fstat(fd, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(toFileStat(stat));
      });
    });
  }

  futimes(fd: Buffer, atime: number, mtime: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sftp.futimes(fd, atime, mtime, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  get(path, option?: FileOption): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const stream = this.sftp.createReadStream(path, option);
        resolve(stream);
      } catch (err) {
        reject(err);
      }
    });
  }

  put(input: Readable, path, option?: FileOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let writer: WriteStream;
      if (option && option.fd) {
        const opt = { ...option, handle: option.fd };
        delete opt.fd;
        writer = this.sftp.createWriteStream(path, opt);
      } else {
        writer = this.sftp.createWriteStream(path, option);
      }
      writer.once('error', reject).once('finish', resolve); // transffered

      input.once('error', err => {
        reject(err);
        writer.end();
      });
      input.pipe(writer);
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

  async ensureDir(dir: string): Promise<void> {
    // test is root path
    // win: c:/, c://, c:\, c:\\
    // *nix: /
    if (dir === '/' || dir.match(/^[a-zA-Z]:(\/|\\)\1?$/)) {
      return;
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
      case 2:
        const parentPath = this.pathResolver.dirname(dir);
        if (parentPath === dir) throw err;
        await this.ensureDir(parentPath);
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

  toFileEntry(fullPath, item): FileEntry {
    return {
      fspath: fullPath,
      name: item.filename,
      ...toFileStat(item.attrs),
    };
  }

  list(dir: string, { showHiddenFiles = false } = {}): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      this.sftp.readdir(dir, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const fileEntries = result.map(item =>
          this.toFileEntry(this.pathResolver.join(dir, item.filename), item)
        );
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

      this.list(path).then(
        fileEntries => {
          if (!fileEntries.length) {
            this.rmdir(path, false).then(resolve, e => {
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
            .then(resolve, e => {
              // BUG just reject will occur weird bug.
              reject(e);
            });
        },
        err => {
          reject(err);
        }
      );
    });
  }
}
