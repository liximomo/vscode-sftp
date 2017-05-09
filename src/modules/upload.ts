import * as fs from 'fs';
import * as path from 'path';
import * as minimatch from 'minimatch';
import rpath from './remotePath';
import Client from './sftp-client';
import * as output from './output';
import { list } from '../helper/file-utils';
import flatMap from '../helper/flatMap';

function failedTask(result) {
  return result.error
}

function printFailTask(result) {
  return output.print(`${result.target} failed: ${result.payload.message}`);
}

function printResult(tasks) {
  return Promise.all([].concat(tasks))
    .then(result => result.filter(failedTask))
    .then(fails => {
      if (!fails.length) {
        output.status('upload done');
        return;
      }

      fails.forEach(printFailTask);
    });
}

function testIgnore(target, pattern) {
  return minimatch(target, pattern);
}
 
export default function upload(localPath: string, remotePath: string, option: any) {
  const client = new Client({
    host: option.host,
    port: option.port,
    username: option.username,
    password: option.password,
    privateKeyPath: option.privateKeyPath,
    passphrase: option.passphrase,
  });
  client.connect()
    .then(() => {
      fs.stat(localPath, (err, stats) => {
        if (err) {
          throw err;
        }
        
        let result: Promise<any>;
        const uploadOption = {
          ignore: option.ignore || [],
        };
        debugger;
        if (stats.isDirectory()) {
          result = uploadDir(localPath, remotePath, client, uploadOption);
        } else {
          result = client.ensureDir(rpath.dirname(remotePath))
            .then(() => uploadFile(localPath, remotePath, client, uploadOption))
            .catch(e => {
              console.log(e);
            })
        }
        return result.then(printResult);
      });
    })
    .catch(err => {
      output.errorMsg('connect to server', err);
    })
}

function uploadDir(localDir: string, remoteDir: string, client: Client, option: any = {}) {
  if (option.ignore.length) {
    if (option.ignore.some(pattern => testIgnore(localDir, pattern))) {
      console.log('dir ignored')
      return Promise.resolve({ target: localDir });
    }
  }

  const listFiles = () => list(localDir);
  const uploadItem = item => {
    if (item.isDirectory) {
      return uploadDir(item.fspath, rpath.join(remoteDir, item.name), client, option);
    }
 
    return uploadFile(item.fspath, rpath.join(remoteDir, item.name), client, option);
  }
  
  return client.ensureDir(remoteDir)
    .then(listFiles)
    .then(items => flatMap(items, uploadItem));
}

function uploadFile(localPath: string, remotePath: string, client: Client, option: any = {}) {
  if (option.ignore.length) {
    if (option.ignore.some(pattern => testIgnore(localPath, pattern))) {
      console.log('file ignored')
      return Promise.resolve({ target: localPath });
    }
  }

  output.status(`uploading ${localPath}`);
  return client.put(localPath, remotePath)
    .then(() => ({
      target: localPath,
    }))
    .catch(err => ({
      target: localPath,
      error: true,
      payload: err,
    }))
}
