import { remove } from '../modules/fileTransferTask';
import createFileAction from './createFileAction';

export const removeRemote = createFileAction((source, config, remotefs) =>
  remove(source, remotefs, {
    ignore: config.ignore,
    skipDir: config.skipDir,
  })
);
