import * as path from 'path';
import { diffFiles } from '../host';
import { EXTENSION_NAME } from '../constants';
import { fileOperations } from '../core';
import { makeTmpFile, simplifyPath } from '../helper';
import createFileHandler from './createFileHandler';

export const diff = createFileHandler({
  name: 'diff',
  async handle(option) {
    const remoteFs = await this.fileService.getRemoteFileSystem();
    const localFs = this.fileService.getLocalFileSystem();
    const { localFsPath, remoteFsPath } = this.target;
    const tmpPath = await makeTmpFile({
      prefix: `${EXTENSION_NAME}-`,
      postfix: path.extname(localFsPath),
    });

    await fileOperations.transferFile(remoteFsPath, tmpPath, remoteFs, localFs);
    await diffFiles(
      localFsPath,
      tmpPath,
      `${simplifyPath(localFsPath)} (local ↔ ${option.name || 'remote'})`
    );
  },
});
