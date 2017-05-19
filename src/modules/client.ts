import * as output from '../modules/output';
import Client from '../model/SFTPClient';

let needReconect = true;

const client = new Client();
client.onDisconnected(invalidClient);

export default function getClient(option) {
  if (!needReconect) {
    return Promise.resolve(client);
  }

  client.setOption(option);
  output.status.msg('connecting...');
  return client.connect()
    .then(() => {
      needReconect = false;
      return client;
    }, err => {
      invalidClient();
      throw err;
    });
}

export function invalidClient() {
  needReconect = true;
}
