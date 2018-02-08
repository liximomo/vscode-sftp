import * as output from './output';
import { getHostInfo } from './config';
import { transport, sync, remove } from './conveyer';
import getRemoteFs from './remoteFs';
import localFs from './localFs';
import { disableWatcher, enableWatcher } from './fileWatcher';

function logIgnored(result) {
  output.debug(['', `ignore: ${result.target}`].join('\n'));
}

function printFailTask(result) {
  const error = result.payload;
  const errorMsg = error.stack !== undefined ? error.stack : error.toString();
  output.debug(
    [
      '',
      '------',
      `target: ${result.target}`,
      `context: ${result.op}`,
      `error: ${errorMsg}`,
      '------',
    ].join('\n')
  );
}

function printResult(msg, result, silent) {
  // return;
  const { success, fails, ignored } = []
    .concat(result)
    .filter(resultItem => typeof resultItem === 'object')
    .reduce(
      (classification, resultItem) => {
        if (resultItem.error) {
          classification.fails.push(resultItem);
        } else if (resultItem.ignored) {
          classification.ignored.push(resultItem);
        } else {
          classification.success.push(resultItem);
        }
        return classification;
      },
      {
        success: [],
        fails: [],
        ignored: [],
      }
    );

  ignored.forEach(logIgnored);

  success.forEach(item => {
    output.debug(`${item.op} ${item.target} at ${new Date()}`);
  });

  if (fails.length) {
    fails.forEach(printFailTask);
    output.showOutPutChannel();
    output.status.msg(`${msg} done (${fails.length} fails)`, 2000);
  } else {
    if (silent) {
      output.status.msg('', 0);
    } else {
      output.status.msg(`${msg} done`, 2000);
    }
  }
}

const createTask = (name, func) => (source, config, silent: boolean = false) => {
  output.print(`\n`);
  output.debug(`task: ${name} ${source}`);
  return getRemoteFs(getHostInfo(config))
    .then(remotefs => func(source, config, remotefs))
    .then(result => printResult(name, result, silent));
}

export const upload = createTask('upload', (source, config, remotefs) =>
  transport(source, config.remotePath, localFs, remotefs, {
    concurrency: config.concurrency,
    ignore: config.ignore,
    perserveTargetMode: config.protocol === 'sftp',
  })
);

export const download = createTask('download', (source, config, remotefs) => {
  disableWatcher(config);
  return transport(config.remotePath, source, remotefs, localFs, {
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

export const sync2Remote = createTask('sync remote', (source, config, remotefs) =>
  sync(source, config.remotePath, localFs, remotefs, {
    concurrency: config.concurrency,
    ignore: config.ignore,
    model: config.syncMode,
    perserveTargetMode: true,
  })
);

export const sync2Local = createTask('sync local', (source, config, remotefs) => {
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

export const removeRemote = createTask('remove', (source, config, remotefs) =>
  remove(source, remotefs, {
    ignore: config.ignore,
    skipDir: config.skipDir,
  })
);
