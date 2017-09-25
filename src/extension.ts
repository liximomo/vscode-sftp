'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import * as output from './modules/output';
import { CONGIF_FILENAME, DEPRECATED_CONGIF_FILENAME } from './constants';

import { initConfigs, addConfig, removeConfig, getShortestDistinctConfigs } from './modules/config';
// TODO
import { endAllRemote } from './modules/remoteFs';
import { watchFolder, watchFiles, clearAllWatcher } from './modules/fileWatcher';
// import traceFileActivities from './modules/fileActivities.js';
import { sync2RemoteCommand, sync2LocalCommand, uploadCommand, downloadCommand } from './commands/sync';
import editConfig from './commands/config';
import autoSave from './commands/auto-save';
import {
  SYNC_TO_REMOTE,
  SYNC_TO_LOCAL,
  UPLOAD,
  DOWNLOAD,
  CONFIG,
} from './constants';
import getTopFolders from './helper/getTopFolders';

function registerCommand(
  context: vscode.ExtensionContext,
  name: string,
  callback: (args: any[]) => any,
  thisArg?: any
) {
  const disposable = vscode.commands.registerCommand(name, callback, thisArg);
  context.subscriptions.push(disposable);
}

function handleConfigChange(uri: vscode.Uri) {
  addConfig(uri.fsPath)
    .then(config => {
      watchFiles(config);
    }, output.onError);
}

function handleConfigDelete(uri: vscode.Uri) {
  removeConfig(uri.fsPath);
}

function handleDocumentChange(uri: vscode.Uri) {
  autoSave(uri);
};

function setUpFileChangeListenser(dir) {
  watchFolder(dir, {
    onConfigChange: handleConfigChange,
    onConfigDelete: handleConfigDelete,
    onFileChange: handleDocumentChange,
  });
}

function setUpFolder(dir) {
  setUpFileChangeListenser(dir);
  return initConfigs(dir);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  registerCommand(context, CONFIG, editConfig);
  registerCommand(context, SYNC_TO_REMOTE, sync2RemoteCommand);
  registerCommand(context, SYNC_TO_LOCAL, sync2LocalCommand);
  registerCommand(context, UPLOAD, uploadCommand);
  registerCommand(context, DOWNLOAD, downloadCommand);

  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  const meanfulRootPaths = getTopFolders(vscode.workspace.workspaceFolders);

  output.status.msg('SFTP init...');
  const pendingInits = meanfulRootPaths.map(setUpFolder);
  return Promise.all(pendingInits)
    .then(_ => {
      watchFiles(getShortestDistinctConfigs());
      output.status.msg('SFTP Ready', 1000 * 8);
    })
    .catch(output.onError);
}

export function deactivate() {
  clearAllWatcher();
  endAllRemote();
}
