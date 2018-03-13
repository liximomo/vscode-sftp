import { transfer } from '../modules/fileTransferTask';
import createFileAction from './createFileAction';

export const upload = createFileAction((source, config, { localFs, remoteFs, onProgress }) =>
  transfer(source, config.remotePath, localFs, remoteFs, {
    concurrency: config.concurrency,
    ignore: config.ignore,
    perserveTargetMode: config.protocol === 'sftp',
    onProgress,
  })
);

export const download = createFileAction(
  (source, config, { localFs, remoteFs, onProgress }) =>
    transfer(config.remotePath, source, remoteFs, localFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);

export const downloadWithoutIgnore = createFileAction(
  (source, config, { localFs, remoteFs, onProgress }) =>
    transfer(config.remotePath, source, remoteFs, localFs, {
      concurrency: config.concurrency,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);
