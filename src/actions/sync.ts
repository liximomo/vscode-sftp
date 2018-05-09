import { sync } from '../modules/fileTransferTask';
import createFileAction from './createFileAction';

export const sync2Remote = createFileAction(
  'sync',
  (source, config, { localFs, remoteFs, scheduler, onProgress }) =>
    sync(source, config.remotePath, localFs, remoteFs, scheduler, {
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: config.protocol === 'sftp',
      onProgress,
    })
);

export const sync2Local = createFileAction(
  'sync',
  (source, config, { localFs, remoteFs, scheduler, onProgress }) =>
    sync(config.remotePath, source, remoteFs, localFs, scheduler, {
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);
