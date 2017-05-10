import * as minimatch from 'minimatch';

import * as output from '../modules/output';
import FileSystem, { FileEntry, FileType }  from '../model/FileSystem';
import Client from './sftp-client';
import rpath from './remotePath';
import flatMap from '../helper/flatMap';


type TransportOption = {
  ignore: string[],
};

type TransportResult = {
  target: string,
  error?: boolean,
  payload?: any,
};

const defaultTransportOption = {
  ignore: [],
};

function testIgnore(target, pattern) {
  return minimatch(target, pattern);
}

export function transport(src, des, srcFs: FileSystem, desFs: FileSystem, option: TransportOption = defaultTransportOption): Promise<TransportResult[] | TransportResult> {
  return srcFs.stat(src)
    .then(stat => {
      let result: Promise<any> | Promise<any>[] ;
      if (stat.isDirectory()) {
        result = transportDir(src, des, srcFs, desFs, option);
      } else {
        result = desFs.ensureDir(desFs.pathResolver.dirname(des))
          .then(() => transportFile(src, des, srcFs, desFs, option))
      }
      return result;
    });
}

function transportDir(src, des, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult[]> {
  if (option.ignore.length) {
    if (option.ignore.some(pattern => testIgnore(src, pattern))) {
      return Promise.resolve([{ target: src }]);
    }
  }

  const listFiles = () => {
    output.status(`retriving directory ${src}`);
    return srcFs.list(src);
  };

  const uploadItem = (item: FileEntry) => {
    if (item.type === FileType.Directory) {
      return transportDir(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
    }
 
    return transportFile(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
  }
  
  return desFs.ensureDir(des)
    .then(listFiles)
    .then(items => items.map(uploadItem))
    .then(tasks => Promise.all<TransportResult[] | TransportResult>(tasks))
    .then(result => flatMap(result, a => a));
}

function transportFile(src, des, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult> {
  if (option.ignore.length) {
    if (option.ignore.some(pattern => testIgnore(src, pattern))) {
      return Promise.resolve({ target: src });
    }
  }

  output.status(`uploading ${src}`);
  return srcFs.get(src)
    .then(inputStream => desFs.put(inputStream, des))
    .then(() => ({
      target: src,
    }))
    .catch(err => ({
      target: src,
      error: true,
      payload: err,
    }));
}
