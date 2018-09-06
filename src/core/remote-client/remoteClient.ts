export interface ConnectOption {
  host: string;
  port: number;
  username?: string;
  password?: string;
  connectTimeout?: number;
  privateKeyPath?: string; // ssh-only
  privateKey?: string; // ssh-only
  passphrase?: string | boolean; // ssh-only
  interactiveAuth?: boolean; // ssh-only
  agent?: string; // ssh-only
  sock?: any; // ssh-only
  hop?: ConnectOption | ConnectOption[]; // ssh-only

  secure?: any; // ftp-only
  secureOptions?: object; // ftp-only
  passive?: boolean; // ftp-only

  debug(x: string): void;
}

export interface Config {
  askForPasswd(msg: string): Promise<string | undefined>;
}

export default abstract class RemoteClient {
  protected _client: any;
  protected _option: ConnectOption;

  constructor(option: ConnectOption) {
    this._option = option;
    this._client = this._initClient();
  }

  abstract end(): void;
  abstract getFsClient(): any;
  protected abstract _doConnect(connectOption: ConnectOption, config: Config): Promise<void>;
  protected abstract _hasProvideAuth(connectOption: ConnectOption): boolean;
  protected abstract _initClient(): any;

  async connect(connectOption: ConnectOption, config: Config) {
    if (this._hasProvideAuth(connectOption)) {
      return this._doConnect(connectOption, config);
    }

    const password = await config.askForPasswd(`[${connectOption.host}]: Enter your password`);

    // cancel connect
    if (password === undefined) {
      return;
    }

    return this._doConnect({ ...connectOption, password }, config);
  }

  onDisconnected(cb) {
    this._client
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
}
