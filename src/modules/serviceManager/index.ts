import { Uri } from 'vscode';
import * as path from 'path';
import app from '../../app';
import { showErrorMessage } from '../../host';
import logger from '../../logger';
import { FileService, UResource } from '../../core';
import { validateConfig } from '../config';
import watcherService from '../fileWatcher';
import Trie from './trie';

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

export function getBasePath(context: any, workspace: string) {
  const baseDir = context ? context : workspace;
  return normalizePathForTrie(path.resolve(workspace, baseDir));
}

export function createFileService(config: any, workspace: string) {
  if (config.defaultProfile) {
    app.state.profile = config.defaultProfile;
  }

  const normalizedBasePath = getBasePath(config.context, workspace);
  const service = new FileService(normalizedBasePath, workspace, config);
  serviceManager.add(normalizedBasePath, service);
  service.name = config.name;
  service.setConfigValidator(validateConfig);
  service.setWatcherService(watcherService);
  const scheduler = service.getScheduler();
  scheduler.onTaskDone((error, task) => {
    const { localFsPath, transferType } = task;
    if (error) {
      const errorMsg = `${error.message} when ${transferType} ${localFsPath}`;
      logger.error(errorMsg);
      showErrorMessage(errorMsg);
      return;
    }
    logger.info(`${transferType} ${localFsPath}`);
  });
  scheduler.onProgress(() => {
    if (scheduler.pendingCount > 0) {
      app.sftpBarItem.startSpinner();
    } else {
      app.sftpBarItem.stopSpinner();
      app.sftpBarItem.reset();
    }
  });

  return service;
}

export function getFileService(uri: Uri): FileService {
  let fileService;
  if (UResource.isRemote(uri)) {
    const remoteRoot = app.remoteExplorer.findRoot(uri);
    if (remoteRoot) {
      fileService = remoteRoot.explorerContext.fileService;
    }
  } else {
    fileService = serviceManager.findPrefix(normalizePathForTrie(uri.fsPath));
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
