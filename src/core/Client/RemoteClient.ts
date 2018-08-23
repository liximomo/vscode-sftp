export interface IClientOption {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKeyPath?: string; // ssh-only
  passphrase?: string; // ssh-only
  interactiveAuth?: boolean; // ssh-only
  agent?: string; // ssh-only
  secure?: any; // ftp-only
  secureOptions?: object; // ftp-only
  passive?: boolean; // ftp-only
}

export default abstract class RemoteClient {
  protected client: any;
  private option: any;

  constructor(option: IClientOption = {}) {
    this.option = option;
    this.client = this.initClient();
  }

  protected abstract initClient(): any;
  abstract connect(readline?: (text: string) => Promise<string | undefined>): Promise<void>;
  abstract end(): void;
  abstract getFsClient(): any;

  onDisconnected(cb) {
    this.client
      .on('end', () => {
        cb('end');
      })
      .on('close', () => {
        cb('close');
      })
      .on('error', err => {
        cb('error');
      });
  }

  setOption(option: IClientOption) {
    this.option = option;
  }

  getOption() {
    return this.option;
  }
}
