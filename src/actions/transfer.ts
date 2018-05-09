import { transfer } from '../modules/fileTransferTask';
import createFileAction from './createFileAction';

export const upload = createFileAction(
  'upload',
  (source, config, { localFs, remoteFs, scheduler, onProgress }) =>
    transfer(source, config.remotePath, localFs, remoteFs, scheduler, {
      ignore: config.ignore,
      perserveTargetMode: config.protocol === 'sftp',
      onProgress,
    })
);

export const download = createFileAction(
  'download',
  (source, config, { localFs, remoteFs, scheduler, onProgress }) =>
    transfer(config.remotePath, source, remoteFs, localFs, scheduler, {
      ignore: config.ignore,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);

export const downloadWithoutIgnore = createFileAction(
  'download',
  (source, config, { localFs, remoteFs, scheduler, onProgress }) =>
    transfer(config.remotePath, source, remoteFs, localFs, scheduler, {
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);
