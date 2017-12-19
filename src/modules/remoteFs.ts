import * as path from 'path';
import * as vscode from 'vscode';
import rpath from './remotePath';
import * as output from '../modules/output';
import FileSystem from '../model/Fs/FileSystem';
import RemoteFileSystem from '../model/Fs/RemoteFileSystem';
import LocalFileSystem from '../model/Fs/LocalFileSystem';
import SFTPFileSystem from '../model/Fs/SFTPFileSystem';
import FTPFileSystem from '../model/Fs/FTPFileSystem';
import RemoteClient from '../model/Client/RemoteClient';
import SFTPClient from '../model/Client/SFTPClient';
import FTPClient from '../model/Client/FTPClient';

function hashOption(opiton) {
  return Object.keys(opiton).map(key => opiton[key]).join('');
}

class KeepAliveRemoteFs {
  private isValid: boolean = false;

  private pendingPromise: Promise<RemoteFileSystem>;

  private fs: RemoteFileSystem;

  private option: any;

  getFs(option): Promise<RemoteFileSystem> {
    if (this.isValid && this.option === option) {
      this.pendingPromise = null;
      return Promise.resolve(this.fs);
    }

    if (!this.pendingPromise) {
      output.debug('connect to remote');
      if (option.protocol === 'sftp') {
        const willFullCiphers = {
          algorithms: {
            cipher: [
              'aes128-ctr',
              'aes192-ctr',
              'aes256-ctr',
              'aes128-gcm',
              'aes128-gcm@openssh.com',
              'aes256-gcm',
              'aes256-gcm@openssh.com',
              'aes256-cbc',
              'aes192-cbc',
              'aes128-cbc',
              'blowfish-cbc',
              '3des-cbc',
              'arcfour256',
              'arcfour128',
              'cast128-cbc',
              'arcfour',
            ],
          },
          ...option,
        };
        this.fs = new SFTPFileSystem(rpath, willFullCiphers);
      } else if (option.protocol === 'ftp') {
        this.fs = new FTPFileSystem(rpath, option);
      } else {
        return Promise.reject(new Error(`unsupported protocol ${option.protocol}`));
      }
      const client = this.fs.getClient();
      client.onDisconnected(this.invalid.bind(this));
      output.status.msg('connecting...');
      this.pendingPromise = client.connect(prompt => {
        // tslint:disable-next-line prefer-const
        let password = true;
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
        this.isValid = true;
        return this.fs;
      }, err => {
        this.invalid();
        throw err;
      });
    }
    return this.pendingPromise;
  }

  invalid() {
    this.pendingPromise = null;
    this.isValid = false;
  }

  end() {
    this.invalid();
    this.fs.getClient().end();
  }
}

let testFs;
function getTestFs() {
  if (!testFs) {
    testFs = new LocalFileSystem(path);
  }

  return Promise.resolve(testFs);
}

const fsTable: {
  [x: string]: KeepAliveRemoteFs,
} = {};

export default function getFileSystem(option): Promise<FileSystem> {
  if (option.protocol === 'test') {
    return getTestFs();
  }

  const identity = hashOption(option);
  const fs = fsTable[identity];
  if (fs !== undefined) {
    return fs.getFs(option);
  }

  const fsInstance = new KeepAliveRemoteFs();
  fsTable[identity] = fsInstance;
  return fsInstance.getFs(option);
}

// TODO
export function endAllRemote() {
  Object.keys(fsTable).forEach(key => {
    const fs = fsTable[key];
    fs.end();
  });
}
