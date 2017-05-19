import * as path from 'path';

import * as output from './output';
import rpath from './remotePath';
import { transport, sync } from './conveyer';
import getRemoteClient from './client';
import Client from '../model/SFTPClient';
import SFTPFileSystem from '../model/SFTPFileSystem';
import LocalFileSystem from '../model/LocalFileSystem';

function failedTask(result, index, array) {
  return result.error;
}

function printFailTask(result) {
  return output.print(`${result.target} failed: ${result.payload.message}`);
}

function printResult(msg, result) {
  const fails = [].concat(result).filter(failedTask)
  if (!fails.length) {
    output.status.msg(msg, 2000);
    return;
  }
  fails.forEach(printFailTask);
}

const getHostInfo = config => ({
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  privateKeyPath: config.privateKeyPath,
  passphrase: config.passphrase,
});

// const getRemoteClient = option => {
//   const client = new Client(option);
//   output.status.msg('connecting...');
//   return client.connect()
//     .then(() => client);
// }

const createTask = (name, func) => (source, config) =>
  getRemoteClient(getHostInfo(config))
    .then(remoteClient => func(source, config, remoteClient))
    .then(result => printResult(`${name} done`, result));

export const upload = createTask('upload', (source, config, remoteClient) => transport(
  source,
  config.remotePath,
  new LocalFileSystem(path),
  new SFTPFileSystem(rpath, remoteClient.sftp),
  {
    ignore: config.ignore,
  }
));

export const download = createTask('download', (source, config, remoteClient) => transport(
  config.remotePath,
  source,
  new SFTPFileSystem(rpath, remoteClient.sftp),
  new LocalFileSystem(path),
  {
    ignore: config.ignore,
  }
));

export const sync2Remote = createTask('sync remote', (source, config, remoteClient) => sync(
  source,
  config.remotePath,
  new LocalFileSystem(path),
  new SFTPFileSystem(rpath, remoteClient.sftp),
  {
    ignore: config.ignore,
    model: config.syncMode,
    
  }
));

export const sync2Local= createTask('sync local', (source, config, remoteClient) => sync(
  config.remotePath,
  source,
  new SFTPFileSystem(rpath, remoteClient.sftp),
  new LocalFileSystem(path),
  {
    ignore: config.ignore,
    model: config.syncMode,
  }
));
