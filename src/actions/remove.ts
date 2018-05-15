import { remove } from '../core/fileTransferTask';
import createFileAction from './createFileAction';

export const removeRemote = createFileAction('remove', (source, config, { remoteFs }) =>
  remove(source, remoteFs, {
    ignore: config.ignore,
    skipDir: config.skipDir,
  })
);
