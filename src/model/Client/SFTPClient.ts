import { Client } from 'ssh2';
import * as fs from 'fs';
import RemoteClient, { IClientOption } from './RemoteClient';

export default class SFTPClient extends RemoteClient {
  private sftp: any;

  constructor(option?: IClientOption) {
    super(option);
  }

  initClient() {
    return new Client();
  }

  connect() {
    const option = this.getOption();
    const { privateKeyPath } = option;
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
        .on('error', err => {
          reject(err);
        })
        .connect({
          keepaliveInterval: 1000 * 30,
          keepaliveCountMax: 2,
          ...option,
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
    return this.client.end();
  }

  getFsClient() {
    return this.sftp;
  }
}
