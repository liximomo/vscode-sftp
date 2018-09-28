import { fileOperations, FileType } from '../core';
import createFileHandler from './createFileHandler';

export const removeRemote = createFileHandler({
  name: 'removeRemote',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const { remoteFsPath } = this.target;
    const stat = await remoteFs.lstat(remoteFsPath);
    let promise;
    switch (stat.type) {
      case FileType.Directory:
        if (option.skipDir) {
          return;
        }

        promise = fileOperations.removeDir(remoteFsPath, remoteFs, {});
        break;
      case FileType.File:
      case FileType.SymbolicLink:
        promise = fileOperations.removeFile(remoteFsPath, remoteFs, {});
        break;
      default:
        throw new Error(`Unsupported file type (type = ${stat.type})`);
    }
    await promise;
  },
});
