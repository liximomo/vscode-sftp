import * as Client from 'ftp';
import RemoteClient, { ConnectOption } from './remoteClient';

// tslint:disable
Client.prototype._send = function(cmd: string, cb: (err: Error) => void, promote: boolean) {
  clearTimeout(this._keepalive);
  if (cmd !== undefined) {
    if (promote) this._queue.unshift({ cmd: cmd, cb: cb });
    else this._queue.push({ cmd: cmd, cb: cb });

    if (cmd === 'ABOR') {
      if (this._pasvSocket) this._pasvSocket.aborting = true;
      this._debug && this._debug('[connection] > ' + cmd);
      this._socket.write(cmd + '\r\n');
      return;
    }
  }
  var queueLen = this._queue.length;
  if (!this._curReq && queueLen && this._socket && this._socket.readable) {
    this._curReq = this._queue.shift();
    if (this._curReq.cmd !== 'ABOR') {
      this._debug && this._debug('[connection] > ' + this._curReq.cmd);
      this._socket.write(this._curReq.cmd + '\r\n');
    }
  } else if (!this._curReq && !queueLen && this._ending) this._reset();
};
// tslint:enable

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

    const { username, connectTimeout = 3 * 1000, ...option } = connectOption;
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
