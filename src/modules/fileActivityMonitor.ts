import * as vscode from 'vscode';
import logger from '../logger';
import app from '../app';
import { COMMAND_DOWNLOAD, COMMAND_UPLOAD } from '../constants';
import { executeCommand, onDidOpenTextDocument, onDidSaveTextDocument, showConfirmMessage } from '../host';
import { getConfig, loadConfig } from './config';
import { watchFiles } from './fileWatcher';
import { endAllRemote } from './remoteFs';
import { reportError, isValidFile, isConfigFile } from '../helper';

let workspaceWatcher: vscode.Disposable;

function handleConfigSave(uri: vscode.Uri) {
  loadConfig(uri.fsPath).then(config => {
    app.remoteExplorer.refresh();

    // close connected remote, cause the remote may changed
    endAllRemote();
    watchFiles(config);
  }, reportError);
}

async function handleFileSave(uri) {
  const activityPath = uri.fsPath;
  let config;
  try {
    config = getConfig(activityPath);
  } catch (error) {
    // ignore config error
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
    // ignore config error
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
