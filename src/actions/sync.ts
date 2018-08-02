import { sync } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const sync2Remote = createFileAction(
  'sync',
  (localFsPath, remoteFsPath, localUri, remoteUri, config, { localFs, remoteFs, onProgress }) =>
    sync(localFsPath, remoteFsPath, localUri, remoteUri, localFs, remoteFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: config.protocol === 'sftp',
      onProgress,
    })
);

export const sync2Local = createFileAction(
  'sync',
  (localFsPath, remoteFsPath, localUri, remoteUri, config, { localFs, remoteFs, onProgress }) =>
    sync(remoteFsPath, localFsPath, remoteUri, localUri, remoteFs, localFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);
