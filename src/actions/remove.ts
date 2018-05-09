import { remove } from '../modules/fileTransferTask';
import createFileAction from './createFileAction';

export const removeRemote = createFileAction('remove', (source, config, { remoteFs, scheduler }) =>
  remove(source, remoteFs, scheduler, {
    ignore: config.ignore,
    skipDir: config.skipDir,
  })
);
