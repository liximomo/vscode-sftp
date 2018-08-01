import { remove } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const removeRemote = createFileAction('remove', (_, desUri, config, { remoteFs }) =>
  remove(desUri, remoteFs, {
    ignore: config.ignore,
    skipDir: config.skipDir,
  })
);
