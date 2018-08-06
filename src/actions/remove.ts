import UResource from '../core/UResource';
import FileSystem from '../core/Fs/FileSystem';
import { remove } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const removeRemote = createFileAction(
  'remove',
  (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) =>
    remove(uResource.remoteFsPath, remoteFs, {
      ignore: option.ignore,
      skipDir: option.skipDir,
    })
);
