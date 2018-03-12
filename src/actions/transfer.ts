import { transfer } from '../modules/fileTransferTask';
import createFileAction from './createFileAction';
import localFs from '../modules/localFs';
import { disableWatcher, enableWatcher } from '../modules/fileWatcher';

export const upload = createFileAction((source, config, remotefs) =>
  transfer(source, config.remotePath, localFs, remotefs, {
    concurrency: config.concurrency,
    ignore: config.ignore,
    perserveTargetMode: config.protocol === 'sftp',
  })
);

export const download = createFileAction((source, config, remotefs) => {
  disableWatcher(config);
  return transfer(config.remotePath, source, remotefs, localFs, {
    concurrency: config.concurrency,
    ignore: config.ignore,
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

export const downloadWithoutIgnore = createFileAction((source, config, remotefs) => {
  disableWatcher(config);
  return transfer(config.remotePath, source, remotefs, localFs, {
    concurrency: config.concurrency,
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
