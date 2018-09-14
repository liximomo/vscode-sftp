import { sync, SyncOption } from '../core/fileOperations';
import { refreshRemoteExplorer } from './shared';
import createFileHandler from './createFileHandler';

type OptSyncOption = Partial<SyncOption>;

export const sync2Remote = createFileHandler<OptSyncOption>({
  name: 'syncToRemote',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return sync(localFsPath, remoteFsPath, localFs, remoteFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: config.protocol === 'sftp',
    };
  },
  afterHandle() {
    refreshRemoteExplorer(this.target, true);
  },
});

export const sync2Local = createFileHandler<OptSyncOption>({
  name: 'syncToLocal',
  config: {
    doNotTriggerWatcher: true,
  },
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return sync(remoteFsPath, localFsPath, remoteFs, localFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: false,
    };
  },
  afterHandle() {
    refreshRemoteExplorer(this.target, true);
  },
});
