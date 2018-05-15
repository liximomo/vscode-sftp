'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import sftpBarItem from './ui/sftpBarItem';
import initCommand from './commands/init';
import reportError from './helper/reportError';
import fileActivityMonitor from './modules/fileActivityMonitor';
import { initConfigs } from './modules/config';
import { endAllRemote } from './modules/remoteFs';
import { watchFiles, clearAllWatcher } from './modules/fileWatcher';
import { getWorkspaceFolders, setContextValue } from './host';

function setupWorkspaceFolder(dir) {
  return initConfigs(dir).then(watchFiles);
}

function setup() {
  fileActivityMonitor.init();

  const workspaceFolders = getWorkspaceFolders();
  const pendingInits = workspaceFolders.map(folder => setupWorkspaceFolder(folder.uri.fsPath));

  return Promise.all(pendingInits);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  initCommand(context);

  setContextValue('enabled', true);
  setup()
    .then(_ => {
      sftpBarItem.show();
    })
    .catch(reportError);
}

export function deactivate() {
  clearAllWatcher();
  endAllRemote();
  fileActivityMonitor.destory();
}
