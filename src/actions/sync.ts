import { sync } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const sync2Remote = createFileAction(
  'sync',
  (sourceUri, desUri, config, { localFs, remoteFs, onProgress }) =>
    sync(sourceUri, desUri, localFs, remoteFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: config.protocol === 'sftp',
      onProgress,
    })
);

export const sync2Local = createFileAction(
  'sync',
  (sourceUri, desUri, config, { localFs, remoteFs, onProgress }) =>
    sync(desUri, sourceUri, remoteFs, localFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);
