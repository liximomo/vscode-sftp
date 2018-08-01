import getFileSystem from '../modules/remoteFs';

export * from './paths';
export * from './config';
export * from './file';
export * from './error';
export * from './select';

function getHostInfo(config) {
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

export function getRemotefsFromConfig(config) {
  return getFileSystem(getHostInfo(config));
}
