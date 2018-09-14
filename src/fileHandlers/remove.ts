import { remove } from '../core/fileOperations';
import createFileHandler from './createFileHandler';

export const removeRemote = createFileHandler({
  name: 'removeRemote',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const { remoteFsPath } = this.target;
    return remove(remoteFsPath, remoteFs, {
      ignore: option.ignore,
      skipDir: option.skipDir,
    });
  },
});
