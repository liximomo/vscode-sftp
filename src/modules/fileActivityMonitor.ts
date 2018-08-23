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
import { getConfig, loadConfig, getAllRawConfigs, removeConfig } from './config';
import { watchFiles, removeWatcher } from './fileWatcher';
import { endAllRemote, removeRemote } from './remoteFs';
import { reportError, isValidFile, isConfigFile, getHostInfo } from '../helper';

let workspaceWatcher: vscode.Disposable;

function clearResource(config) {
  removeConfig(config);
  removeWatcher(config);
  removeRemote(getHostInfo(config));
}

async function handleConfigSave(uri: vscode.Uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const workspacePath = workspaceFolder.uri.fsPath;

  // clear old config
  getAllRawConfigs()
    .filter(config => config.workspace === workspacePath)
    .forEach(clearResource);

  // add new config
  try {
    const config = await loadConfig(uri.fsPath, workspacePath);
    watchFiles(config);
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
    config = getConfig(activityPath);
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
    config = getConfig(activityPath);
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
    if (!isValidFile(uri)) {
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
    if (!isValidFile(doc.uri)) {
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
