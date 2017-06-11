import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as FileStatus from 'stat-mode';
import FileSystem, { FileEntry, Stats } from './FileSystem';

export default class LocalFileSystem extends FileSystem {
  constructor(pathResolver: any) {
    super(pathResolver);
  }

  lstat(path: string): Promise<Stats> {
    return new Promise((resolve, reject) => {
      fs.lstat(path, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          ...stat,
          type: FileSystem.getFileTypecharacter(stat),
        });
      });
    });
  }

  get(path, option): Promise<fs.ReadStream> {
    return new Promise((resolve, reject) => {
      try {
        const stream = fs.createReadStream(path, option);
        stream.on('error', reject);
        resolve(stream);
      } catch (err) {
        reject(err);
      }
    });
  }

  put(input: fs.ReadStream | Buffer, path, option): Promise<null> {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(path, option);

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
      fs.readlink(path, (err, linkString) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(linkString);
      });
    });
  }
  
  symlink(targetPath: string, path: string): Promise<null> {
    return new Promise((resolve, reject) => {
      fs.symlink(targetPath, path, null, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  
  mkdir(dir: string): Promise<null> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dir, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  ensureDir(dir: string): Promise<null> {
    return fse.ensureDir(dir);
  }

  toFileEntry(fullPath, stat) {
    const statModel = new FileStatus(stat);
    return {
      fspath: fullPath,
      type: FileSystem.getFileTypecharacter(statModel),
      name: this.pathResolver.basename(fullPath),
      size: stat.size,
      modifyTime: stat.mtime.getTime() / 1000,
      accessTime: stat.atime.getTime() / 1000,
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
          return this.lstat(fspath)
            .then(stat => this.toFileEntry(fspath, stat));
        });

        resolve(Promise.all(fileStatus));
      });
    });
  }
  
  unlink(path: string): Promise<null> {
    return new Promise((resolve, reject) => {
      fs.unlink(path, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  rmdir(path: string, recursive: boolean): Promise<null> {
    if (recursive) {
      return fse.remove(path);
    }

    return new Promise((resolve, reject) => {
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
