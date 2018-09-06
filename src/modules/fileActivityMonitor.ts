import * as vscode from 'vscode';
import logger from '../logger';
import app from '../app';
import { COMMAND_DOWNLOAD, COMMAND_UPLOAD } from '../constants';
import {
  executeCommand,
  onDidOpenTextDocument,
  onDidSaveTextDocument,
  showConfirmMessage,
} from '../host';
import { readConfigsFromFile } from './config';
import {
  createFileService,
  getFileService,
  findAllFileService,
  disposeFileService,
} from './serviceManager';
import { reportError, isValidFile, isConfigFile, isInWorksapce } from '../helper';

let workspaceWatcher: vscode.Disposable;

async function handleConfigSave(uri: vscode.Uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const workspacePath = workspaceFolder.uri.fsPath;

  // dispose old service
  findAllFileService(service => service.workspace === workspacePath).forEach(disposeFileService);

  // create new service
  try {
    const configs = await readConfigsFromFile(uri.fsPath, workspacePath);
    configs.forEach(config => createFileService(workspacePath, config));
  } catch (error) {
    reportError(error);
  } finally {
    app.remoteExplorer.refresh();
  }
}

async function handleFileSave(uri) {
  const activityPath = uri.fsPath;
  let config;
  try {
    config = getFileService(activityPath).getConfig();
  } catch (error) {
    logger.error(error);
    return;
  }

  if (config.uploadOnSave) {
    logger.info(`[file-save] ${activityPath}`);
    await executeCommand(COMMAND_UPLOAD, uri);
  }
}

async function downloadOnOpen(uri) {
  const activityPath = uri.fsPath;
  let config;
  try {
    config = getFileService(activityPath).getConfig();
  } catch (error) {
    // a new-created config
    if (!isConfigFile(uri)) {
      logger.error(error);
    }
    return;
  }

  if (config.downloadOnOpen) {
    if (config.downloadOnOpen === 'confirm') {
      const isConfirm = await showConfirmMessage('Do you want SFTP to download this file?');
      if (!isConfirm) return;
    }

    logger.info(`[file-open] download ${activityPath}`);
    await executeCommand(COMMAND_DOWNLOAD, uri);
  }
}

function watchWorkspace({
  onDidSaveFile,
  onDidSaveSftpConfig,
}: {
  onDidSaveFile: (uri: vscode.Uri) => void;
  onDidSaveSftpConfig: (uri: vscode.Uri) => void;
}) {
  if (workspaceWatcher) {
    workspaceWatcher.dispose();
  }

  workspaceWatcher = onDidSaveTextDocument((doc: vscode.TextDocument) => {
    const uri = doc.uri;
    if (!isValidFile(uri) || !isInWorksapce(uri.fsPath)) {
      return;
    }

    if (isConfigFile(uri)) {
      onDidSaveSftpConfig(uri);
      return;
    }

    // remove staled cache
    if (app.ignoreFileCache.has(uri.fsPath)) {
      app.ignoreFileCache.del(uri.fsPath);
    }

    onDidSaveFile(uri);
  });
}

function init() {
  onDidOpenTextDocument((doc: vscode.TextDocument) => {
    if (!isValidFile(doc.uri) || !isInWorksapce(doc.uri.fsPath)) {
      return;
    }

    downloadOnOpen(doc.uri);
  });

  watchWorkspace({
    onDidSaveFile: handleFileSave,
    onDidSaveSftpConfig: handleConfigSave,
  });
}

function destory() {
  if (workspaceWatcher) {
    workspaceWatcher.dispose();
  }
}

export default {
  init,
  destory,
};
