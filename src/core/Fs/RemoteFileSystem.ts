import FileSystem, { IFileOption } from './FileSystem';
import RemoteClient, { ConnectOption, Config } from '../Client/RemoteClient';

export default abstract class RemoteFileSystem extends FileSystem {
  protected client: RemoteClient;

  constructor(pathResolver, option: ConnectOption | RemoteClient) {
    super(pathResolver);
    if (option instanceof RemoteClient) {
      this.client = option;
    } else {
      this.client = this._createClient(option);
    }
  }

  protected abstract _createClient(option: ConnectOption): any;

  getClient() {
    if (!this.client) {
      throw new Error('client not found!');
    }
    return this.client;
  }

  connect(connectOpetion: ConnectOption, config: Config): Promise<void> {
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

  async readFile(path: string, option?: IFileOption): Promise<string | Buffer> {
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
}
