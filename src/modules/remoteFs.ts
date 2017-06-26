import * as vscode from 'vscode';
import rpath from './remotePath';
import * as output from '../modules/output';
import RemoteFileSystem from '../model/Fs/RemoteFileSystem';
import SFTPFileSystem from '../model/Fs/SFTPFileSystem';
import FTPFileSystem from '../model/Fs/FTPFileSystem';
import RemoteClient from '../model/Client/RemoteClient';
import SFTPClient from '../model/Client/SFTPClient';
import FTPClient from '../model/Client/FTPClient';

let needReconect = true;

let fs: RemoteFileSystem;

// prevent concurrent connecting;
let pendingPromise = null;

export default function getRemoteFs(option): Promise<RemoteFileSystem> {
  if (!needReconect) {
    pendingPromise = null;
    return Promise.resolve(fs);
  }

  if (!pendingPromise) {
    output.debug('conncet to remote');
    if (option.protocol === 'sftp') {
      fs = new SFTPFileSystem(rpath, option);
    } else if (option.protocol === 'ftp') {
      fs = new FTPFileSystem(rpath, option);
    } else {
      return Promise.reject(new Error(`unsupported protocol ${option.protocol}`));
    }
    const client = fs.getClient();
    client.onDisconnected(invalidRemote);
    output.status.msg('connecting...');
    pendingPromise = client.connect(prompt => {
      // tslint:disable-next-line prefer-const
      let password = false;
      // if (/password/i.test(prompt)) {
      //   password = true;
      // }

      return vscode.window.showInputBox({
        ignoreFocusOut: true,
        password,
        prompt,
      }) as Promise<string | null>;
    })
    .then(() => {
      needReconect = false;
      return fs;
    }, err => {
      invalidRemote();
      throw err;
    });
  }
  return pendingPromise;
}

export function invalidRemote() {
  needReconect = true;
  pendingPromise = null;
}

export function endRemote() {
  fs.getClient().end();
  invalidRemote();
}
