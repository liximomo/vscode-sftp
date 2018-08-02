import { transfer } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const upload = createFileAction(
  'upload',
  (localFsPath, remoteFsPath, localUri, remoteUri, config, { localFs, remoteFs, onProgress }) =>
    transfer(localFsPath, remoteFsPath, localUri, remoteUri, localFs, remoteFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: config.protocol === 'sftp',
      onProgress,
    })
);

export const download = createFileAction(
  'download',
  (localFsPath, remoteFsPath, localUri, remoteUri, config, { localFs, remoteFs, onProgress }) =>
    transfer(remoteFsPath, localFsPath, remoteUri, localUri, remoteFs, localFs, {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);

export const downloadWithoutIgnore = createFileAction(
  'download',
  (localFsPath, remoteFsPath, localUri, remoteUri, config, { localFs, remoteFs, onProgress }) =>
    transfer(remoteFsPath, localFsPath, remoteUri, localUri, remoteFs, localFs, {
      concurrency: config.concurrency,
      perserveTargetMode: false,
      onProgress,
    }),
  { doNotTriggerWatcher: true }
);
