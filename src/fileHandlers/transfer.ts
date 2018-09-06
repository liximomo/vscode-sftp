import { transfer, TransferOption } from '../core/fileOperations';
import createFileHandler from './createFileHandler';

export const upload = createFileHandler<TransferOption>({
  name: 'upload',
  handler(uResource, localFs, remoteFs, option) {
    return transfer(uResource.localFsPath, uResource.remoteFsPath, localFs, remoteFs, option);
  },
  transformOption(config) {
    return {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: config.protocol === 'sftp',
    };
  },
});

export const download = createFileHandler<TransferOption>({
  name: 'download',
  handler(uResource, localFs, remoteFs, option) {
    return transfer(uResource.remoteFsPath, uResource.localFsPath, remoteFs, localFs, option);
  },
  transformOption(config) {
    return {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: false,
    };
  },
  config: {
    doNotTriggerWatcher: true,
  },
});
