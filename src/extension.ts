'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';

import { sftpBarItem } from './global';
import commands from './commands';
import { COMMAND_OPEN_OUTPUT } from './constants';

import * as output from './modules/output';
import fileActivityMonitor from './modules/fileActivityMonitor';
import { initConfigs, loadConfig } from './modules/config';
import { endAllRemote } from './modules/remoteFs';
import { watchWorkspace, watchFiles, clearAllWatcher } from './modules/fileWatcher';
import autoSave from './modules/autoSave';
import { getWorkspaceFolders } from './host';

function registerCommand(
  context: vscode.ExtensionContext,
  name: string,
  callback: (args: any[]) => any,
  thisArg?: any
) {
  const disposable = vscode.commands.registerCommand(name, callback, thisArg);
  context.subscriptions.push(disposable);
}

function handleConfigSave(uri: vscode.Uri) {
  loadConfig(uri.fsPath).then(config => {
    // close connected remote, cause the remote may changed
    endAllRemote();
    watchFiles(config);
  }, output.onError);
}

function handleDocumentSave(uri: vscode.Uri) {
  autoSave(uri);
}

function setupWorkspaceFolder(dir) {
  return initConfigs(dir).then(watchFiles);
}

function setup() {
  fileActivityMonitor();

  watchWorkspace({
    onDidSaveFile: handleDocumentSave,
    onDidSaveSftpConfig: handleConfigSave,
  });

  const workspaceFolders = getWorkspaceFolders();
  const pendingInits = workspaceFolders.map(folder => setupWorkspaceFolder(folder.uri.fsPath));

  return Promise.all(pendingInits);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  commands.forEach(cmd => cmd.register(context));

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_OPEN_OUTPUT, () => {
      output.toggle();
    })
  );

  const workspaceFolders = getWorkspaceFolders();
  if (!workspaceFolders) {
    return;
  }

  setup()
    .then(_ => sftpBarItem.show())
    .catch(output.onError);
}

export function deactivate() {
  clearAllWatcher();
  endAllRemote();
}
