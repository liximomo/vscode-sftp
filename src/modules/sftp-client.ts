import { Client } from 'ssh2';
import FileStatus from 'stat-mode';
import * as fs from 'fs';
import rpath from './remotePath';

const permissionSpiltReg = /-/gi;

export default class SFTPClient {
  private config: any;
  private client;
  private remote;

  constructor(config: Object = {}) {
    this.client = new Client();
    this.config = config;
  }

  connect() {
    const { privateKeyPath } = this.config;
    return new Promise((resolve, reject) => {
      fs.readFile(privateKeyPath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        const privateKey = data;
        this.client
          .on('ready', () => {
            this.client.sftp((err, sftp) => {
              if (err) {
                reject(err);
              }

              this.remote = sftp;
              resolve();
            });
          })
          .on('error', (err) => {
              reject(err);
          })
          .connect({
            ...this.config,
            privateKey, 
          });
      });
    });
  }

  end() {
    return new Promise((resolve) => {
      resolve(this.client.end());
    });
  }

  get(remote, local) {
    return new Promise((resolve, reject) => {
      this.remote.fastGet(remote, local, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  put(local, remote) {
    const option = {
      encoding: 'utf8',
    }
    return new Promise((resolve, reject) => {
      this.remote.fastPut(local, remote, {
        encoding: 'utf8',
      }, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
       });
    });
  }

  list(remotePath): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.remote.readdir(remotePath, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const files = result.map(item => {
          const status = new FileStatus(item.attrs);
          debugger;
          return {
            type: item.longname.substr(0, 1),
            name: item.filename,
            size: item.attrs.size,
            modifyTime: item.attrs.mtime * 1000,
            accessTime: item.attrs.atime * 1000,
            rights: {
              user: item.longname.substr(1, 3).replace(permissionSpiltReg, ''),
              group: item.longname.substr(4, 3).replace(permissionSpiltReg, ''),
              other: item.longname.substr(7, 3).replace(permissionSpiltReg, '')
            },
            owner: item.attrs.uid,
            group: item.attrs.gid
          }
        });
        resolve(files);
      });
    });
  }
  
  ensureDir(remoteDir) {
    return new Promise((resolve, reject) => {
      const tokens = remoteDir.split(rpath.sep);
      if (tokens[0] === '') { // remove first empty string
        tokens.shift();
      }

      let dir = '';
      
      const mkdir = () => {
        let token = tokens.shift();
        if (!token && !tokens.length) {
          resolve();
          return;
        }
        token += '/';
        dir = rpath.join(dir, token);
        return this.mkdir(dir)
          .then(mkdir);
      };
      return mkdir();
    });
  }

  mkdir(dir) {
    return new Promise((resolve, reject) => {
      this.remote.mkdir(dir, (err) => {
          if (err && err.code !== 4) { // reject except already exist
            reject(err);
          }
          resolve();
      });
    });
  }
}

    // self.mkdir = function(remote, callback) {
    //     sftp.mkdir(remote, callback);
    // }
    
    // self.delete = function(remote, callback) {
    //     sftp.unlink(remote, callback)
    // }
    
    // self.rmdir = function(remote, callback) {    
    //     sftp.rmdir(remote, callback)
    // }
   
