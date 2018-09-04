import { createRemoteIfNoneExist } from '../core/remoteFs';

export * from './paths';
export * from './config';
export * from './file';
export * from './error';
export * from './select';

export function getHostInfo(config) {
  const ignoreOptions = [
    'name',
    'remotePath',
    'uploadOnSave',
    'downloadOnOpen',
    'syncMode',
    'ignore',
    'ignoreFile',
    'watcher',
    'concurrency',
    'sshConfigPath',
  ];

  return Object.keys(config).reduce((obj, key) => {
    if (ignoreOptions.indexOf(key) === -1) {
      obj[key] = config[key];
    }
    return obj;
  }, {});
}

// to-remove
export function getRemotefsFromConfig(config) {
  return createRemoteIfNoneExist(getHostInfo(config));
}
