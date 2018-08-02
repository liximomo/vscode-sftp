import { remove } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const removeRemote = createFileAction(
  'remove',
  (localFsPath, remoteFsPath, localUri, remoteUri, config, { remoteFs }) =>
    remove(remoteFsPath, remoteUri, remoteFs, {
      ignore: config.ignore,
      skipDir: config.skipDir,
    })
);
