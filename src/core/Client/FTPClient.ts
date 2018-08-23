import * as Client from 'ftp';
import RemoteClient, { IClientOption } from './RemoteClient';

export default class FTPClient extends RemoteClient {
  private connected: boolean = false;

  constructor(option?: IClientOption) {
    super(option);
  }

  initClient() {
    return new Client();
  }

  connect(): Promise<void> {
    this.onDisconnected(() => {
      this.connected = false;
    });

    const { username, connectTimeout, ...option } = this.getOption();
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (!this.connected) {
          this.end();
          reject(new Error('Timeout while connecting to server'));
        }
      }, connectTimeout);

      this.client
        .on('ready', () => {
          this.connected = true;
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
          pasvTimeout: connectTimeout,
          ...option,
          connTimeout: connectTimeout,
          user: username,
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
