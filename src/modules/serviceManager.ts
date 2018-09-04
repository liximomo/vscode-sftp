import * as path from 'path';
import app from '../app';
import Trie from '../core/Trie';
import FileService from '../core/FileService';
import { validateConfig } from './config';
import watcherService from './fileWatcher';

const serviceManager = new Trie<FileService>(
  {},
  {
    delimiter: path.sep,
  }
);

function normalizePathForTrie(pathname) {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    const device = pathname.substr(0, 2);
    if (device.charAt(1) === ':') {
      // lowercase drive letter
      return pathname[0].toLowerCase() + pathname.substr(1);
    }
  }

  return path.normalize(pathname);
}

export function createFileService(workspace: string, config: any) {
  if (config.defaultProfile) {
    app.state.profile = config.defaultProfile;
  }

  const baseDir = config.context ? config.context : workspace;
  const normalizedBasePath = normalizePathForTrie(baseDir);
  const service = new FileService(normalizedBasePath, workspace, config);
  serviceManager.add(normalizedBasePath, service);
  service.name = config.name;
  service.setConfigValidator(validateConfig);
  service.setWatcherService(watcherService);
  service.createWatcher();

  return service;
}

export function getFileService(filePath: string) {
  const fileService = serviceManager.findPrefix(normalizePathForTrie(filePath));
  if (!fileService) {
    throw new Error(`(${filePath}) config file not found`);
  }

  return fileService;
}

export function disposeFileService(fileService: FileService) {
  serviceManager.remove(fileService.baseDir);
  fileService.dispose();
}

export function findAllFileService(predictor: (x: FileService) => boolean): FileService[] {
  if (serviceManager === undefined) {
    return [];
  }

  return getAllFileService().filter(predictor);
}

export function getAllFileService(): FileService[] {
  if (serviceManager === undefined) {
    return [];
  }

  return serviceManager.getAllValues();
}
