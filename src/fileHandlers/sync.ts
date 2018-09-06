import { sync, SyncOption } from '../core/fileOperations';
import createFileHandler from './createFileHandler';

export const sync2Remote = createFileHandler<SyncOption>({
  name: 'syncToRemote',
  handler(uResource, localFs, remoteFs, option) {
    return sync(uResource.localFsPath, uResource.remoteFsPath, localFs, remoteFs, option);
  },
  transformOption(config) {
    return {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: config.protocol === 'sftp',
    };
  },
});

export const sync2Local = createFileHandler<SyncOption>({
  name: 'syncToLocal',
  handler(uResource, localFs, remoteFs, option) {
    return sync(uResource.remoteFsPath, uResource.localFsPath, remoteFs, localFs, option);
  },
  transformOption(config) {
    return {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: false,
    };
  },
  config: {
    doNotTriggerWatcher: true,
  },
});
