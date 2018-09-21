import { refreshRemoteExplorer } from '../shared';
import createFileHandler from '../createFileHandler';
import { transfer, sync, TransferOption, SyncOption, TransferDirection } from './transfer';

type OptTransferOption = Partial<TransferOption>;

type OptSyncOption = Partial<SyncOption>;

export { transfer };

export const sync2Remote = createFileHandler<OptSyncOption>({
  name: 'syncToRemote',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return sync(this.fileService.getScheduler(), {
      srcFsPath: localFsPath,
      srcFs: localFs,
      targetFsPath: remoteFsPath,
      targetFs: remoteFs,
      option,
      transferDirection: TransferDirection.Upload,
    });
  },
  transformOption() {
    const config = this.config;
    return {
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
    return sync(this.fileService.getScheduler(), {
      srcFsPath: remoteFsPath,
      srcFs: remoteFs,
      targetFsPath: localFsPath,
      targetFs: localFs,
      option,
      transferDirection: TransferDirection.Download,
    });
  },
  transformOption() {
    const config = this.config;
    return {
      ignore: config.ignore,
      model: config.syncMode,
      perserveTargetMode: false,
    };
  },
  afterHandle() {
    refreshRemoteExplorer(this.target, true);
  },
});

export const upload = createFileHandler<OptTransferOption>({
  name: 'upload',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return transfer(this.fileService.getScheduler(), {
      srcFsPath: localFsPath,
      srcFs: localFs,
      targetFsPath: remoteFsPath,
      targetFs: remoteFs,
      option,
      transferDirection: TransferDirection.Upload,
    });
  },
  transformOption() {
    const config = this.config;
    return {
      ignore: config.ignore,
      perserveTargetMode: config.protocol === 'sftp',
    };
  },
  afterHandle() {
    refreshRemoteExplorer(this.target, this.fileService);
  },
});

export const uploadFile = createFileHandler<OptTransferOption>({
  name: 'upload file',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return transfer(this.fileService.getScheduler(), {
      srcFsPath: localFsPath,
      srcFs: localFs,
      targetFsPath: remoteFsPath,
      targetFs: remoteFs,
      option,
      transferDirection: TransferDirection.Upload,
    });
  },
  transformOption() {
    const config = this.config;
    return {
      ignore: config.ignore,
      perserveTargetMode: config.protocol === 'sftp',
    };
  },
  afterHandle() {
    refreshRemoteExplorer(this.target, false);
  },
});

export const uploadFolder = createFileHandler<OptTransferOption>({
  name: 'upload folder',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return transfer(this.fileService.getScheduler(), {
      srcFsPath: localFsPath,
      srcFs: localFs,
      targetFsPath: remoteFsPath,
      targetFs: remoteFs,
      option,
      transferDirection: TransferDirection.Upload,
    });
  },
  transformOption() {
    const config = this.config;
    return {
      ignore: config.ignore,
      perserveTargetMode: config.protocol === 'sftp',
    };
  },
  afterHandle() {
    refreshRemoteExplorer(this.target, true);
  },
});

export const download = createFileHandler<OptTransferOption>({
  name: 'download',
  config: {
    doNotTriggerWatcher: true,
  },
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return transfer(this.fileService.getScheduler(), {
      srcFsPath: remoteFsPath,
      srcFs: remoteFs,
      targetFsPath: localFsPath,
      targetFs: localFs,
      option,
      transferDirection: TransferDirection.Download,
    });
  },
  transformOption() {
    const config = this.config;
    return {
      ignore: config.ignore,
      perserveTargetMode: false,
    };
  },
});

export const downloadFile = createFileHandler<OptTransferOption>({
  name: 'download file',
  config: {
    doNotTriggerWatcher: true,
  },
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return transfer(this.fileService.getScheduler(), {
      srcFsPath: remoteFsPath,
      srcFs: remoteFs,
      targetFsPath: localFsPath,
      targetFs: localFs,
      option,
      transferDirection: TransferDirection.Download,
    });
  },
  transformOption() {
    const config = this.config;
    return {
      ignore: config.ignore,
      perserveTargetMode: false,
    };
  },
});

export const downloadFolder = createFileHandler<OptTransferOption>({
  name: 'download folder',
  config: {
    doNotTriggerWatcher: true,
  },
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return transfer(this.fileService.getScheduler(), {
      srcFsPath: remoteFsPath,
      srcFs: remoteFs,
      targetFsPath: localFsPath,
      targetFs: localFs,
      option,
      transferDirection: TransferDirection.Download,
    });
  },
  transformOption() {
    const config = this.config;
    return {
      ignore: config.ignore,
      perserveTargetMode: false,
    };
  },
});
