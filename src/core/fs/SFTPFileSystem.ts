import * as fs from 'fs';
import FileSystem, { FileEntry, FileType, FileStats, FileOption } from './FileSystem';
import RemoteFileSystem from './RemoteFileSystem';
import { SSHClient } from '../remote-client';

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

  get(path, option?: FileOption): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      try {
        const stream = this.sftp.createReadStream(path, option);
        resolve(stream);
      } catch (err) {
        reject(err);
      }
    });
  }

  put(input: fs.ReadStream | Buffer, path, option?: FileOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const stream = this.sftp.createWriteStream(path, option);

      stream.on('error', reject);
      stream.on('finish', resolve);

      if (input instanceof Buffer) {
        stream.end(input);
        return;
      }

      input.on('error', reject);
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

  async ensureDir(dir: string): Promise<void> {
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
