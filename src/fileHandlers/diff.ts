import * as path from 'path';
import { diffFiles } from '../host';
import { EXTENSION_NAME } from '../constants';
import { transfer } from '../core/fileOperations';
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

    await transfer(remoteFsPath, tmpPath, remoteFs, localFs, {
      perserveTargetMode: false,
    });
    await diffFiles(
      localFsPath,
      tmpPath,
      `${simplifyPath(localFsPath)} (local ↔ ${option.name || 'remote'})`
    );
  },
  config: {
    doNotTriggerWatcher: true,
  },
});
