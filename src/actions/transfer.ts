import { transfer } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const upload = createFileAction(
  'upload',
  (sourceUri, desUri, config, { localFs, remoteFs, onProgress }) =>
    transfer(sourceUri, desUri, localFs, remoteFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: config.protocol === 'sftp',
      onProgress,
    })
);

export const download = createFileAction(
  'download',
  (sourceUri, desUri, config, { localFs, remoteFs, onProgress }) =>
    transfer(desUri, sourceUri, remoteFs, localFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);

export const downloadWithoutIgnore = createFileAction(
  'download',
  (sourceUri, desUri, config, { localFs, remoteFs, onProgress }) =>
    transfer(desUri, sourceUri, remoteFs, localFs, {
      concurrency: config.concurrency,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);
