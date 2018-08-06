import * as path from 'path';
import UResource from '../core/UResource';
import FileSystem from '../core/Fs/FileSystem';
import { diffFiles } from '../host';
import { EXTENSION_NAME } from '../constants';
import { transfer } from '../core/fileTransferTask';
import { makeTmpFile, simplifyPath } from '../helper';
import createFileAction from './createFileAction';

export const diff = createFileAction(
  'diff',
  async (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) => {
    const localFsPath = uResource.localFsPath;
    const tmpPath = await makeTmpFile({
      prefix: `${EXTENSION_NAME}-`,
      postfix: path.extname(localFsPath),
    });

    await transfer(uResource.remoteFsPath, tmpPath, remoteFs, localFs, {
      perserveTargetMode: false,
    });
    await diffFiles(
      localFsPath,
      tmpPath,
      `${simplifyPath(localFsPath)} (local ↔ ${option.name || 'remote'})`
    );
  }
);
