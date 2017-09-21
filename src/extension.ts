'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import * as output from './modules/output';
import { initConfigs, addConfig, configFileName, getShortestDistinctConfigs } from './modules/config';
// TODO
import { invalidRemote, endRemote } from './modules/remoteFs';
import { onFileChange, watchFiles, clearAllWatcher } from './modules/fileWatcher';
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

function handleDocumentChange(uri: vscode.Uri) {
  if (path.basename(uri.fsPath) === configFileName) {

    addConfig(uri.fsPath)
      .then(config => {
        watchFiles(config);
      }, output.onError);
  } else {
    autoSave(uri);
  }
};

function setUpFileChangeListenser(dir) {
  onFileChange(dir, handleDocumentChange);
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

  const setUpFileChangeListenser = dir => onFileChange(dir, handleDocumentChange);

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
  endRemote();
}
