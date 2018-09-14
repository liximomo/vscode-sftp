import { transfer, TransferOption } from '../core/fileOperations';
import { refreshRemoteExplorer } from './shared';
import createFileHandler from './createFileHandler';

type OptTransferOption = Partial<TransferOption>;

export const upload = createFileHandler<OptTransferOption>({
  name: 'upload',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    return transfer(localFsPath, remoteFsPath, localFs, remoteFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
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

    return transfer(localFsPath, remoteFsPath, localFs, remoteFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
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
    return transfer(localFsPath, remoteFsPath, localFs, remoteFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
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
    return transfer(remoteFsPath, localFsPath, remoteFs, localFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
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
    return transfer(remoteFsPath, localFsPath, remoteFs, localFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
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
    return transfer(remoteFsPath, localFsPath, remoteFs, localFs, option);
  },
  transformOption() {
    const config = this.config;
    return {
      concurrency: config.concurrency,
      ignore: config.ignore,
      perserveTargetMode: false,
    };
  },
});
