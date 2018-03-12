import { sync } from '../modules/fileTransferTask';
import createFileAction from './createFileAction';
import localFs from '../modules/localFs';
import { disableWatcher, enableWatcher } from '../modules/fileWatcher';

export const sync2Remote = createFileAction((source, config, remotefs) =>
  sync(source, config.remotePath, localFs, remotefs, {
    concurrency: config.concurrency,
    ignore: config.ignore,
    model: config.syncMode,
    perserveTargetMode: config.protocol === 'sftp',
  })
);

export const sync2Local = createFileAction((source, config, remotefs) => {
  disableWatcher(config);
  return sync(config.remotePath, source, remotefs, localFs, {
    concurrency: config.concurrency,
    ignore: config.ignore,
    model: config.syncMode,
    perserveTargetMode: false,
  }).then(
    r => {
      enableWatcher(config);
      return r;
    },
    e => {
      enableWatcher(config);
      throw e;
    }
  );
});
