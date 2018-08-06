import UResource from '../core/UResource';
import FileSystem from '../core/Fs/FileSystem';
import { sync } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const sync2Remote = createFileAction(
  'sync',
  (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) =>
    sync(uResource.localFsPath, uResource.remoteFsPath, localFs, remoteFs, {
      concurrency: option.concurrency,
      ignore: option.ignore,
      model: option.syncMode,
      perserveTargetMode: option.protocol === 'sftp',
      onProgress: option.onProgress,
    })
);

export const sync2Local = createFileAction(
  'sync',
  (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) =>
    sync(uResource.remoteFsPath, uResource.localFsPath, remoteFs, localFs, {
      concurrency: option.concurrency,
      ignore: option.ignore,
      model: option.syncMode,
      perserveTargetMode: false,
      onProgress: option.onProgress,
    }),
  { doNotTriggerWatcher: true }
);
