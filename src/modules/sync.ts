import * as path from 'path';

import * as output from '../modules/output';
import Client from '../modules/sftp-client';
import rpath from '../modules/remotePath';
import { transport } from '../modules/conveyer';
import SFTPFileSystem from '../model/SFTPFileSystem';
import LocalFileSystem from '../model/LocalFileSystem';

function failedTask(result, index, array) {
  return result.error;
}

function printFailTask(result) {
  return output.print(`${result.target} failed: ${result.payload.message}`);
}

function printResult(result) {
  const fails = [].concat(result).filter(failedTask)
  if (!fails.length) {
    output.status('sync done');
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

const getRemoteClient = option => {
  const client = new Client(option);
  return client.connect()
    .then(() => client);
}

const createTask = func => (source, config) =>
  getRemoteClient(getHostInfo(config))
    .then(remoteClient => func(source, remoteClient, config), err => {
      output.errorMsg(err, 'connect to server')
    }).then(printResult);

export const upload = createTask((source, remoteClient, config) => transport(
  source,
  config.remotePath,
  new LocalFileSystem(path),
  new SFTPFileSystem(rpath, remoteClient.sftp),
  {
    ignore: config.ignore,
  }
));

export const download = createTask((source, remoteClient, config) => transport(
  config.remotePath,
  source,
  new SFTPFileSystem(rpath, remoteClient.sftp),
  new LocalFileSystem(path),
  {
    ignore: config.ignore,
  }
));

// // config syncMode: 'full' | 'update'
// export function sync2Remote(source, config) {
//   return getRemoteClient({
//     host: config.host,
//     port: config.port,
//     username: config.username,
//     password: config.password,
//     privateKeyPath: config.privateKeyPath,
//     passphrase: config.passphrase,
//   }).then(remoteClient => {
//     return transport(
//       config.remotePath,
//       source,
//       new SFTPFileSystem(rpath, remoteClient.sftp),
//       new LocalFileSystem(path),
//       {
//         ignore: config.ignore,
//       }
//     );
//   }, err => {
//       output.errorMsg(err, 'connect to server')
//   }).then(printResult);
// }
