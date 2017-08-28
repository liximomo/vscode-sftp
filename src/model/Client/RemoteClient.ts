import * as output from '../../modules/output';

export interface IClientOption {
  host: string,
  port: number,
  username: string,
  password: string,
  privateKeyPath?: string,  // ssh-only
  passphrase?: string,  // ssh-only
  interactiveAuth?: boolean, // ssh-only
  agent?: string, // ssh-only
  passive?: boolean, // ftp-only
};

export default abstract class RemoteClient {
  protected client: any;
  private option: any;

  constructor(option?: IClientOption) {
    this.option = option;
    this.client = this.initClient();
  }

  abstract initClient(): any;
  abstract connect(readline?: (text: string) => Promise<string | undefined> ): Promise<void>;
  abstract end(): void;
  abstract getFsClient(): any;

  onDisconnected(cb) {
    this.client
      .on('end', () => {
        output.debug('connect end');
        cb();
      })
      .on('close', () => {
        output.debug('connect close');
        cb();
      })
      .on('error', err => {
        output.debug('remote error', err);
        cb();
      });
  }

  setOption(option: IClientOption) {
    this.option = option;
  }

  getOption() {
    return this.option;
  }
}
