'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import app from './app';
import initCommand from './commands/init';
import { reportError } from './helper';
import fileActivityMonitor from './modules/fileActivityMonitor';
import { initConfigs } from './modules/config';
import { endAllRemote } from './core/remoteFs';
import { watchFiles, clearAllWatcher } from './modules/fileWatcher';
import { getWorkspaceFolders, setContextValue } from './host';
import RemoteExplorer from './modules/RemoteExplorer';

function setupWorkspaceFolder(dir) {
  return initConfigs(dir).then(watchFiles);
}

function setup(workspaceFolders: vscode.WorkspaceFolder[]) {
  fileActivityMonitor.init();
  const pendingInits = workspaceFolders.map(folder => setupWorkspaceFolder(folder.uri.fsPath));

  return Promise.all(pendingInits);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  initCommand(context);

  const workspaceFolders = getWorkspaceFolders();
  if (!workspaceFolders) {
    return;
  }

  setContextValue('enabled', true);
  app.sftpBarItem.show();
  app.state.subscribe(state => {
    const currentText = app.sftpBarItem.getText();
    if (currentText.endsWith('SFTP')) {
      app.sftpBarItem.reset();
    }
  });
  try {
    await setup(workspaceFolders);
    app.remoteExplorer = new RemoteExplorer(context);
  } catch (error) {
    reportError(error);
  }
}

export function deactivate() {
  clearAllWatcher();
  endAllRemote();
  fileActivityMonitor.destory();
}
