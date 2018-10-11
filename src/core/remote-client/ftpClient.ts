import * as Client from 'ftp';
import RemoteClient, { ConnectOption } from './remoteClient';

Client.prototype.setLastMod = function(path: string, date: Date, cb) {
  const dateStr =
    date.getUTCFullYear() +
    ('00' + (date.getUTCMonth() + 1)).slice(-2) +
    ('00' + date.getUTCDate()).slice(-2) +
    ('00' + date.getUTCHours()).slice(-2) +
    ('00' + date.getUTCMinutes()).slice(-2) +
    ('00' + date.getUTCSeconds()).slice(-2);

  this._send('MFMT ' + dateStr + ' ' + path, cb);
};

export default class FTPClient extends RemoteClient {
  private connected: boolean = false;

  _initClient() {
    return new Client();
  }

  _hasProvideAuth(connectOption: ConnectOption) {
    // tslint:disable-next-line triple-equals
    return connectOption.password != undefined;
  }

  _doConnect(connectOption: ConnectOption): Promise<void> {
    this.onDisconnected(() => {
      this.connected = false;
    });

    const { username, connectTimeout, ...option } = connectOption;
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (!this.connected) {
          this.end();
          reject(new Error('Timeout while connecting to server'));
        }
      }, connectTimeout);

      this._client
        .on('ready', () => {
          this.connected = true;
          if (option.passive) {
            this._client._pasv(resolve);
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
    return this._client.end();
  }

  getFsClient() {
    return this._client;
  }
}
