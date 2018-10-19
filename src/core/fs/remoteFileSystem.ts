import FileSystem, { FileOption } from './fileSystem';
import { RemoteClient, ConnectOption, RemoteClientConfig } from '../remote-client';

interface RFSOption {
  remoteTimeOffsetInHours?: number;
  client?: RemoteClient;
  clientOption?: ConnectOption;
}

const SECONDS_PER_HOUR = 60 * 60;
const MILLISECONDS_PER_HOUR = SECONDS_PER_HOUR * 1000;

const defaultOption: Partial<RFSOption> = {
  remoteTimeOffsetInHours: 0,
};

export default abstract class RemoteFileSystem extends FileSystem {
  protected client: RemoteClient;
  private _remoteTimeOffsetInMilliseconds: number = 0;
  private _remoteTimeOffsetInSeconds: number = 0;

  constructor(pathResolver, option: RFSOption) {
    super(pathResolver);

    const _option = {
      ...defaultOption,
      ...option,
    };
    const { client, clientOption, remoteTimeOffsetInHours } = _option;
    if (client) {
      this.client = client;
    } else if (clientOption) {
      this.client = this._createClient(clientOption);
    } else {
      throw new Error('No client or clientOption is provided');
    }

    this.setRemoteTimeOffsetInHours(remoteTimeOffsetInHours);
  }

  setRemoteTimeOffsetInHours(offset: number) {
    this._remoteTimeOffsetInSeconds = offset * SECONDS_PER_HOUR;
    this._remoteTimeOffsetInMilliseconds = offset * MILLISECONDS_PER_HOUR;
  }

  getClient() {
    if (!this.client) {
      throw new Error('client not found!');
    }
    return this.client;
  }

  connect(connectOpetion: ConnectOption, config: RemoteClientConfig): Promise<void> {
    return this.client.connect(
      connectOpetion,
      config
    );
  }

  onDisconnected(cb) {
    this.client.onDisconnected(cb);
  }

  end() {
    this.client.end();
  }

  toLocalTime(remoteTimeMilliseconds: number): number {
    return remoteTimeMilliseconds - this._remoteTimeOffsetInMilliseconds;
  }

  toRemoteTimeInSecnonds(localtime: number): number {
    return localtime + this._remoteTimeOffsetInSeconds;
  }

  async readFile(path: string, option?: FileOption): Promise<string | Buffer> {
    return new Promise<string | Buffer>(async (resolve, reject) => {
      let stream;
      try {
        stream = await this.get(path, option);
      } catch (error) {
        return reject(error);
      }

      const arr = [];
      const onData = chunk => {
        arr.push(chunk);
      };
      const onEnd = err => {
        if (err) {
          return reject(err);
        }

        const buffer = Buffer.concat(arr);
        resolve(option && option.encoding ? buffer.toString(option.encoding) : buffer);
      };

      stream.on('data', onData);
      stream.on('error', onEnd);
      stream.on('end', onEnd);
    });
  }

  protected abstract _createClient(option: ConnectOption): any;
}
