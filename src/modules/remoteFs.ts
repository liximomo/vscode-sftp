import * as path from 'path';
import upath from '../core/upath';
import { promptForPassword } from '../host';
import logger from '../logger';
import FileSystem from '../core/Fs/FileSystem';
import RemoteFileSystem from '../core/Fs/RemoteFileSystem';
import LocalFileSystem from '../core/Fs/LocalFileSystem';
import SFTPFileSystem from '../core/Fs/SFTPFileSystem';
import FTPFileSystem from '../core/Fs/FTPFileSystem';

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

    if (this.pendingPromise) {
      return this.pendingPromise;
    }

    let shouldPromptForPass = false;
    let connectOption: any = {
      host: option.host,
      port: option.port,
      username: option.username,
      password: option.password,
      connectTimeout: option.connectTimeout,
    };
    let FsConstructor;
    if (option.protocol === 'sftp') {
      connectOption = {
        ...connectOption,
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
        ...connectOption,
        secure: option.secure,
        secureOptions: option.secureOptions,
        passive: option.passive,
        debug(str) {
          const log = str.match(/^\[connection\] (>|<) '(.*?)(\\r\\n)?'$/);

          if (!log) return;

          if (log[2].match(/200 NOOP/)) return;

          if (log[2].match(/^PASS /)) log[2] = 'PASS ******';

          logger.debug(`${log[1]} ${log[2]}`);
        },
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
    this.fs.onDisconnected(this.invalid.bind(this));
    this.pendingPromise = this.fs.connect(promptForPassword).then(
      () => {
        this.isValid = true;
        return this.fs;
      },
      err => {
        this.invalid('error');
        throw err;
      }
    );

    return this.pendingPromise;
  }

  invalid(reason: string) {
    this.pendingPromise = null;
    this.isValid = false;
  }

  end() {
    this.fs.end();
  }
}

let localFs;
function getLocalFs() {
  if (!localFs) {
    localFs = new LocalFileSystem(path);
  }

  return Promise.resolve(localFs);
}

const fsTable: {
  [x: string]: KeepAliveRemoteFs;
} = {};

export default function getFileSystem(option): Promise<FileSystem> {
  if (option.protocol === 'local') {
    return getLocalFs();
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
