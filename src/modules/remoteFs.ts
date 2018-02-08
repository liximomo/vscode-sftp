import * as path from 'path';
import { promptForPassword } from '../host';
import upath from './upath';
import * as output from '../modules/output';
import FileSystem from '../model/Fs/FileSystem';
import RemoteFileSystem from '../model/Fs/RemoteFileSystem';
import LocalFileSystem from '../model/Fs/LocalFileSystem';
import SFTPFileSystem from '../model/Fs/SFTPFileSystem';
import FTPFileSystem from '../model/Fs/FTPFileSystem';
import RemoteClient from '../model/Client/RemoteClient';

function hashOption(opiton) {
  return Object.keys(opiton)
    .map(key => opiton[key])
    .join('');
}

class KeepAliveRemoteFs {
  private isValid: boolean = false;

  private pendingPromise: Promise<RemoteFileSystem>;

  private fs: RemoteFileSystem;

  async getFs(option): Promise<RemoteFileSystem> {
    if (this.isValid) {
      this.pendingPromise = null;
      return Promise.resolve(this.fs);
    }

    if (!this.pendingPromise) {
      output.debug('connect to remote');
      // $todo implement promptForPass

      let shouldPromptForPass = false;
      let connectOption;
      let FsConstructor;
      if (option.protocol === 'sftp') {
        connectOption = {
          host: option.host,
          port: option.port,
          username: option.username,
          password: option.password,
          agent: option.agent,
          privateKeyPath: option.privateKeyPath,
          passphrase: option.passphrase,
          interactiveAuth: option.interactiveAuth,
          algorithms: option.algorithms,
        };

        // tslint:disable triple-equals
        shouldPromptForPass =
          connectOption.password == undefined &&
          connectOption.agent == undefined &&
          connectOption.privateKeyPath == undefined;
        // tslint:enable

        // explict compare to true, cause we want to distinct between string and true
        if (option.passphrase === true) {
          connectOption.passphrase = await promptForPassword('Enter your passphrase');
        }
        FsConstructor = SFTPFileSystem;
      } else if (option.protocol === 'ftp') {
        connectOption = {
          host: option.host,
          port: option.port,
          username: option.username,
          password: option.password,
          secure: option.secure,
          secureOptions: option.secureOptions,
          passive: option.passive,
        };
        // tslint:disable-next-line triple-equals
        shouldPromptForPass = connectOption.password == undefined;
        FsConstructor = FTPFileSystem;
      } else {
        return Promise.reject(new Error(`unsupported protocol ${option.protocol}`));
      }

      if (shouldPromptForPass) {
        connectOption.password = await promptForPassword('Enter your password');
      }
      this.fs = new FsConstructor(upath, connectOption);
      const client = this.fs.getClient();
      client.onDisconnected(this.invalid.bind(this));
      output.status.msg('connecting...');
      this.pendingPromise = client.connect(promptForPassword).then(
        () => {
          this.isValid = true;
          return this.fs;
        },
        err => {
          this.invalid();
          throw err;
        }
      );
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
  [x: string]: KeepAliveRemoteFs;
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

export function endAllRemote() {
  Object.keys(fsTable).forEach(key => {
    const fs = fsTable[key];
    fs.end();
    delete fsTable[key];
  });
}
