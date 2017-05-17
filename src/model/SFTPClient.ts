import { Client } from 'ssh2';
import FileStatus from 'stat-mode';
import * as fs from 'fs';
import rpath from '../modules/remotePath';

const permissionSpiltReg = /-/gi;

type Option = {
  host: string,
  port: number,
  username: string,
  password: string,
  privateKeyPath: string,
  passphrase: string,
};

export default class SFTPClient {
  private option: any;
  public sftp: any;
  private client: any;

  constructor(option: Option) {
    this.client = new Client();
    this.option = option;
  }

  connect() {
    const { privateKeyPath } = this.option;
    return new Promise((resolve, reject) => {
      const connectWithKey = privateKey => this.client
        .on('ready', () => {
          this.client.sftp((err, sftp) => {
            if (err) {
              reject(err);
            }

            this.sftp = sftp;
            resolve();
          });
        })
        .on('error', (err) => {
          reject(err);
        })
        .connect({
          ...this.option,
          privateKey, 
        });

      if (!privateKeyPath) {
        connectWithKey(undefined);
      } else {
        fs.readFile(privateKeyPath, (err, data) => {
          if (err) {
            reject(err);
            return;
          }
          connectWithKey(data);
        });
      }
    });
  }

  end() {
    return new Promise((resolve) => {
      resolve(this.client.end());
    });
  }
}

