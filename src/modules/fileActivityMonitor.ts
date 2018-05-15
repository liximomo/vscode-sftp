import * as vscode from 'vscode';
import logger from '../logger';
import sftpBarItem from '../ui/sftpBarItem';
import { onDidOpenTextDocument, onDidSaveTextDocument } from '../host';
import { getConfig, loadConfig } from './config';
import { upload } from '../actions';
import { watchFiles } from './fileWatcher';
import { endAllRemote } from './remoteFs';
import { download } from '../actions';
import reportError from '../helper/reportError';
import { isValidFile, isConfigFile } from '../helper/fileType';

let workspaceWatcher: vscode.Disposable;

function handleConfigSave(uri: vscode.Uri) {
  loadConfig(uri.fsPath).then(config => {
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
    await upload(activityPath, config).catch(reportError);
    logger.info(`[file-save] upload ${activityPath}`);
    sftpBarItem.showMsg('upload done', 2 * 1000);
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
    await download(activityPath, config).catch(reportError);
    logger.info(`[file-open] download ${activityPath}`);
    sftpBarItem.showMsg('download done', 2 * 1000);
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

    // let configWatcher do this
    if (isConfigFile(uri)) {
      onDidSaveSftpConfig(uri);
      return;
    }

    onDidSaveFile(uri);
  });
}

function init() {
  onDidOpenTextDocument((doc: vscode.TextDocument) => {
    downloadOnOpen(doc.uri);
  });

  watchWorkspace({
    onDidSaveFile: handleFileSave,
    onDidSaveSftpConfig: handleConfigSave,
  });
}

function destory() {
  onDidOpenTextDocument((doc: vscode.TextDocument) => {
    downloadOnOpen(doc.uri);
  });

  watchWorkspace({
    onDidSaveFile: handleFileSave,
    onDidSaveSftpConfig: handleConfigSave,
  });
}

export default {
  init,
  destory,
};
