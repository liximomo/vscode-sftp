import * as output from '../modules/output';
import Client from '../model/SFTPClient';

let needReconect = true;

const client = new Client();
client.onDisconnected(invalidClient);

// prevent concurrent connecting;
let pendingPromise = null;

export default function getClient(option) {
  if (!needReconect) {
    pendingPromise = null;
    return Promise.resolve(client);
  }

  if (!pendingPromise) {
    client.setOption(option);
    output.status.msg('connecting...');
    pendingPromise = client.connect()
    .then(() => {
      needReconect = false;
      return client;
    }, err => {
      invalidClient();
      throw err;
    });
  }
  return pendingPromise;
}

export function invalidClient() {
  needReconect = true;
}

export function endClient() {
  client.end();
  invalidClient();
}
