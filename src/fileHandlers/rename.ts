import { fileOperations } from '../core';
import createFileHandler from './createFileHandler';

export const renameRemote = createFileHandler<{ originPath: string }>({
  name: 'rename',
  async handle({ originPath }) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const { localFsPath } = this.target;
    await fileOperations.rename(originPath, localFsPath, remoteFs);
  },
});
