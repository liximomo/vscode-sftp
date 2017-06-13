import FileSystem, { IFileEntry, FileType, IStats } from './FileSystem';
import RemoteClient from '../Client/RemoteClient';

export default abstract class RemoteFileSystem extends FileSystem {
  private client: RemoteClient;

  constructor(pathResolver) {
    super(pathResolver);
  }

  getClient() {
    if (!this.client) {
      throw new Error('client not found!');
    }
    return this.client;
  }

  setClient(client: RemoteClient) {
    this.client = client;
  }
}
