import * as path from 'path';
import { diffFiles } from '../host';
import { EXTENSION_NAME } from '../constants';
import { fileOperations } from '../core';
import { makeTmpFile } from '../helper';
import createFileHandler from './createFileHandler';

export const diff = createFileHandler({
  name: 'diff',
  async handle() {
    const remoteFs = await this.fileService.getRemoteFileSystem(this.config);
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    const tmpPath = await makeTmpFile({
      prefix: `${EXTENSION_NAME}-`,
      postfix: path.extname(localFsPath),
    });

    await fileOperations.transferFile(remoteFsPath, tmpPath, remoteFs, localFs);
    await diffFiles(
      tmpPath,
      localFsPath,
      `${path.basename(localFsPath)} (${this.fileService.name || 'remote'} ↔ local)`
    );
  },
});
