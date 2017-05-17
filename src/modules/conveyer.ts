import * as minimatch from 'minimatch';

import * as output from '../modules/output';
import FileSystem, { FileEntry, FileType }  from '../model/FileSystem';
import rpath, { normalize } from './remotePath';
import flatMap from '../helper/flatMap';

interface TransportOption {
  ignore: string[],
};

type SyncModel = 'full' | 'update';

interface SyncOption {
  ignore: string[],
  model: SyncModel,
};

interface TransportResult {
  target: string,
  error?: boolean,
  payload?: any,
};

const defaultTransportOption = {
  ignore: [],
};

const defaultSyncOption = {
  ignore: [],
  model: <SyncModel>'update',
};

function testIgnore(target, pattern) {
  return minimatch(target, pattern);
}

function shouldSkip(path, ignore) {
  return ignore.some(pattern => testIgnore(path, pattern));
}

const toHash = (items: any[], key: string, transform?: (a: any) => any): { [key: string]: any } =>
  items.reduce((hash, item) => {
    let transformedItem = item;
    if (transform) {
      transformedItem = transform(item);
    }
    hash[transformedItem[key]] = transformedItem;
    return hash;
  }, {});

export function sync(srcDir: string, desDir: string, srcFs: FileSystem, desFs: FileSystem, option: SyncOption = defaultSyncOption): Promise<TransportResult[] | TransportResult> {
  const syncFiles = ([srcFileEntries, desFileEntries]) => {
    const srcFileTable = toHash(srcFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: normalize(srcFs.pathResolver.relative(srcDir, fileEntry.fspath)),
    }));

    const desFileTable = toHash(desFileEntries, 'id', fileEntry => ({
      ...fileEntry,
      id: normalize(desFs.pathResolver.relative(desDir, fileEntry.fspath)),
    }));

    const fileExisted = [];
    const symExisted = [];

    const fileMissed = [];
    const symMissed = [];

    Object.keys(srcFileTable).forEach(id => {
      const srcFile = srcFileTable[id];
      const file = desFileTable[id];
      if (file) {
        switch (file.type) {
          case FileType.File:
            fileExisted.push([srcFile, file]);
            break;
          case FileType.SymbolicLink:
            symExisted.push([srcFile, file]);
            break;
          default:
            // do not process
        }
      } else {
        switch (file.type) {
          case FileType.File:
            fileMissed.push([srcFile, file]);
            break;
          case FileType.SymbolicLink:
            symMissed.push([srcFile, file]);
            break;
          default:
            // do not process
        }
      }
    });

    const createTransport = transFunc => ([srcfile, desFile]) => transFunc(srcfile.fspath, desFile.fspath, srcFs, desFs, option);
    const transportTasks = [
      ...fileExisted.map(createTransport(transportFile)),
      ...symExisted.map(createTransport(transportSymlink)),
    ];

    const result = Promise.all<TransportResult[] | TransportResult>(transportTasks)
      .then(result => flatMap(result, a => a));
    return result;
  };

  return Promise.all([srcFs.list(srcDir), desFs.list(desDir)])
    .then(syncFiles)
    .catch(err => ({
      target: srcDir,
      error: true,
      payload: err,
    }));
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
