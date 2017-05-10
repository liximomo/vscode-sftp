import * as fs from 'fs';
import FileStatus from 'stat-mode';
import FileSystem, { FileEntry, Stats } from './FileSystem';

export default class SFTPFileSystem extends FileSystem {
  private sftp: any;

  constructor(pathResolver, sftpClient) {
    super(pathResolver)
    this.sftp = sftpClient;
  }

  stat(path: string): Promise<Stats> {
    return new Promise((resolve, reject) => {
      this.sftp.stat(path, (err, stat) => {
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
        const stream = this.sftp.createReadStream(path, option);
        stream.on('error', reject);
        resolve(stream);
      } catch (err) {
        reject(err);
      }
    });
  }

  put(input: fs.ReadStream | Buffer, path, option = this.defaultStreamOption): Promise<any> {
    return new Promise((resolve, reject) => {
      const stream = this.sftp.createWriteStream(path, option);

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
      this.sftp.mkdir(dir, (err) => {
        if (err && err.code !== 4) { // reject except already exist
          reject(err);
        }
        resolve();
      });
    });
  }

  ensureDir(dir: string): Promise<any> {
    let dirWithoutRoot = dir.slice(1);
    return new Promise((resolve, reject) => {
      const tokens = dirWithoutRoot.split(this.pathResolver.sep);

      let dirPath = '/';

      const mkdir = () => {
        let token = tokens.shift();
        if (!token && !tokens.length) {
          resolve();
          return;
        }
        token += '/';
        dirPath = this.pathResolver.join(dirPath, token);
        return this.mkdir(dirPath)
          .then(mkdir);
      };
      return mkdir();
    });
  }

  toFileEntry(dir, item): FileEntry {
    const stat = new FileStatus(item.attrs);
    return {
      fspath: this.pathResolver.join(dir, item.filename),
      type: this.getFileTypecharacter(stat),
      name: item.filename,
      size: item.attrs.size,
      modifyTime: item.attrs.mtime * 1000,
      accessTime: item.attrs.atime * 1000,
    };
  }

  list(dir: string): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      this.sftp.readdir(dir, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const fileEntries = result.map(item => this.toFileEntry(dir, item));
        resolve(fileEntries);
      });
    });
  }
} 
