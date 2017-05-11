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

function shouldSkip(path, ignore) {
  return ignore.some(pattern => testIgnore(path, pattern));
}

export function transport(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option: TransportOption = defaultTransportOption): Promise<TransportResult[] | TransportResult> {
  return srcFs.lstat(src)
    .then(stat => {
      let result: Promise<any> | Promise<any>[] ;
      
      if (stat.type === FileType.Directory) {
        result = transportDir(src, des, srcFs, desFs, option);
      } else if (stat.type === FileType.File) {
        result = desFs.ensureDir(desFs.pathResolver.dirname(des))
          .then(() => transportFile(src, des, srcFs, desFs, option));
      } else if (stat.type === FileType.SymbolicLink) {
        result = desFs.ensureDir(desFs.pathResolver.dirname(des))
          .then(() => transportSymlink(src, des, srcFs, desFs, option));
      }
      return result;
    });
}

function transportDir(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult[]> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve([{ target: src }]);
  }

  const listFiles = () => {
    output.status(`retriving directory ${src}`);
    return srcFs.list(src);
  };

  const uploadItem = (item: FileEntry) => {
    if (item.type === FileType.Directory) {
      return transportDir(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
    } else if (item.type === FileType.SymbolicLink) {
      return transportSymlink(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
    } else if (item.type === FileType.File) {
      return transportFile(item.fspath, rpath.join(des, item.name), srcFs, desFs, option);
    }

    return [{
      target: item.fspath,
      error: true,
      payload: new Error(`${item.fspath} with unsupport file type`),
    }];
  }
  
  return desFs.ensureDir(des)
    .then(listFiles)
    .then(items => items.map(uploadItem))
    .then(tasks => Promise.all<TransportResult[] | TransportResult>(tasks))
    .then(result => flatMap(result, a => a))
    .catch(err => ({
      target: src,
      error: true,
      payload: err,
    }));
}

function transportFile(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve({ target: src });
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

function transportSymlink(src: string, des: string, srcFs: FileSystem, desFs: FileSystem, option): Promise<TransportResult> {
  if (shouldSkip(src, option.ignore)) {
    return Promise.resolve({ target: src });
  }
  
  output.status(`uploading ${src}`);
  return srcFs.readlink(src)
    .then(targetPath => {
      const absolutePath = srcFs.pathResolver.isAbsolute(targetPath)
        ? targetPath
        : srcFs.pathResolver.resolve(src, targetPath);
      desFs.symlink(absolutePath, des);
    })
    .then(() => ({
      target: src,
    }))
    .catch(err => ({
      target: src,
      error: true,
      payload: err,
    }));
}
