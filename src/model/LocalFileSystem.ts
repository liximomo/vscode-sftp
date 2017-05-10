import * as fs from 'fs';
import * as fse from 'fs-extra';
import FileSystem, { FileEntry, Stats } from './FileSystem';

export default class LocalFileSystem extends FileSystem {
  constructor(pathResolver: any) {
    super(pathResolver);
  }

  stat(path: string): Promise<Stats> {
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, stat) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(stat);
      });
    });
  }

  get(path, option = this.defaultStreamOption): Promise<fs.ReadStream> {
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

  put(input: fs.ReadStream | Buffer, path, option = this.defaultStreamOption): Promise<any> {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(path, option);

      stream.on('error', reject);
      stream.on('close', resolve);

      if (input instanceof Buffer) {
        stream.end(input);
        return;
      }

      input.pipe(stream);
    });
  }

  mkdir(dir: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dir, (err) => {
        if (err && err.code !== 'EEXIST') { // reject except already exist
          reject(err);
        }
        resolve();
      });
    });
  }

  ensureDir(dir: string): Promise<any> {
    return fse.ensureDir(dir);
  }

  toFileEntry(fullPath, stat) {
    return {
      fspath: fullPath,
      type: this.getFileTypecharacter(stat),
      name: this.pathResolver.basename(fullPath),
      size: stat.size,
      modifyTime: stat.mtime.getTime() / 1000,
      accessTime: stat.atime.getTime() / 1000,
    }
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
          return this.stat(fspath)
            .then(stat => this.toFileEntry(fspath, stat));
        });

        resolve(Promise.all(fileStatus));
      });
    });
  }
} 
