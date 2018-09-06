import { remove } from '../core/fileOperations';
import createFileHandler from './createFileHandler';

export const removeRemote = createFileHandler({
  name: 'removeRemote',
  handler(uResource, localFs, remoteFs, option) {
    return remove(uResource.remoteFsPath, remoteFs, {
      ignore: option.ignore,
      skipDir: option.skipDir,
    });
  },
});
