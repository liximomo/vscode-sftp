import UResource from '../core/UResource';
import FileSystem from '../core/Fs/FileSystem';
import { transfer } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const upload = createFileAction(
  'upload',
  (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) =>
    transfer(uResource.localFsPath, uResource.remoteFsPath, localFs, remoteFs, {
      concurrency: option.concurrency,
      ignore: option.ignore,
      perserveTargetMode: option.protocol === 'sftp',
      onProgress: option.onProgress,
    })
);

export const download = createFileAction(
  'download',
  (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) =>
    transfer(uResource.remoteFsPath, uResource.localFsPath, remoteFs, localFs, {
      concurrency: option.concurrency,
      ignore: option.ignore,
      perserveTargetMode: false,
      onProgress: option.onProgress,
    }),
  { doNotTriggerWatcher: true }
);

export const downloadWithoutIgnore = createFileAction(
  'download',
  (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) =>
    transfer(uResource.remoteFsPath, uResource.localFsPath, remoteFs, localFs, {
      concurrency: option.concurrency,
      perserveTargetMode: false,
      onProgress: option.onProgress,
    }),
  { doNotTriggerWatcher: true }
);
