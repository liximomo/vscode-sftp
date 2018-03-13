import * as path from 'path';
import * as tmp from 'tmp';
import { transfer } from '../modules/fileTransferTask';
import { downloadWithoutIgnore } from './transfer';
import createFileAction from './createFileAction';
import { EXTENSION_NAME } from '../constants';
import logger from '../logger';
import { diffFiles } from '../host';

export const diff = createFileAction(
  async (localFsPath, config, { localFs, remoteFs, onProgress }) => {
    tmp.file(
      { prefix: `${EXTENSION_NAME}-`, postfix: path.extname(localFsPath), discardDescriptor: true },
      async (err, tmpPath) => {
        if (err) throw err;

        console.log('tmpFile: ', path);
        await transfer(config.remotePath, tmpPath, remoteFs, localFs, {
          perserveTargetMode: false,
        });
        await diffFiles(localFsPath, tmpPath, `${localFsPath} ↔ ${tmpPath}`);
      }
    );
  },
  { doNotTriggerWatcher: true }
);
