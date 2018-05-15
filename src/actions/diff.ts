import * as path from 'path';
import createFileAction from './createFileAction';
import { diffFiles, simplifyPath } from '../host';
import { EXTENSION_NAME } from '../constants';
import { transfer } from '../core/fileTransferTask';
import makeTmpFile from '../helper/makeTmpFile';

export const diff = createFileAction(
  'diff',
  async (localFsPath, config, { localFs, remoteFs, onProgress }) => {
    const tmpPath = await makeTmpFile({
      prefix: `${EXTENSION_NAME}-`,
      postfix: path.extname(localFsPath),
    });

    await transfer(config.remotePath, tmpPath, remoteFs, localFs, {
      perserveTargetMode: false,
    });
    await diffFiles(
      localFsPath,
      tmpPath,
      `${simplifyPath(localFsPath)} (local ↔ ${config.name || 'remote'})`
    );
  },
  { doNotTriggerWatcher: true }
);
