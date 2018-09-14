import * as fs from 'fs';
import * as fse from 'fs-extra';
import FileSystem, { FileEntry, FileStats, FileOption } from './fileSystem';

function toFileStat(stat: fs.Stats): FileStats {
  return {
    type: FileSystem.getFileTypecharacter(stat),
    size: stat.size,
    mode: stat.mode & parseInt('777', 8), // tslint:disable-line:no-bitwise
    mtime: stat.mtime.getTime(),
    atime: stat.atime.getTime(),
  };
}

export default class LocalFileSystem extends FileSystem {
  constructor(pathResolver: any) {
    super(pathResolver);
  }

  lstat(path: string): Promise<FileStats> {
    return new Promise((resolve, reject) => {
      fs.lstat(path, (err, stat: fs.Stats) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(toFileStat(stat));
      });
    });
  }

  readFile(path, option?): Promise<string | Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(path, option, (err, data) => {
        if (err) {
          return reject(err);
        }

        resolve(data);
      });
    });
  }

  get(path, option?): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      try {
        const stream = fs.createReadStream(path, option);
        resolve(stream);
      } catch (err) {
        reject(err);
      }
    });
  }

  put(input: fs.ReadStream | Buffer, path, option?: FileOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(path, option);

      stream.on('error', err => {
        reject(err);
      });
      stream.on('finish', _ => {
        resolve();
      });

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
      fs.readlink(path, (err, linkString) => {
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
      fs.symlink(targetPath, path, null, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  mkdir(dir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(dir, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  ensureDir(dir: string): Promise<void> {
    return fse.ensureDir(dir);
  }

  toFileEntry(fullPath, stat): FileEntry {
    return {
      fspath: fullPath,
      name: this.pathResolver.basename(fullPath),
      ...stat,
    };
  }

  list(dir: string): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        const fileStatus = files.map(file => {
          const fspath = this.pathResolver.join(dir, file);
          return this.lstat(fspath).then(stat => this.toFileEntry(fspath, stat));
        });

        resolve(Promise.all(fileStatus));
      });
    });
  }

  unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.unlink(path, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  rmdir(path: string, recursive: boolean): Promise<void> {
    if (recursive) {
      return fse.remove(path);
    }

    return new Promise<void>((resolve, reject) => {
      fs.rmdir(path, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }
}
