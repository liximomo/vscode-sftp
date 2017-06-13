import * as Client from 'ftp';
import RemoteClient, { IClientOption } from './RemoteClient';

export default class FTPClient extends RemoteClient {
  constructor(option?: IClientOption) {
    super(option);
  }

  initClient() {
    return new Client();
  }

  connect() {
    const option = this.getOption();
    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          if (option.passive) {
            this.client._pasv(resolve);
          } else {
            resolve();
          }
        })
        .on('error', err => {
          reject(err);
        })
        .connect({
          keepalive: 1000 * 10,
          ...option,
          user: option.username,
        });
    });
  }

  end() {
    return this.client.end();
  }

  getFsClient() {
    return this.client;
  }
}
