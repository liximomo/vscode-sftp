'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import throttle from './helper/throttle';
import * as output from './modules/output';
import { initConfigs, addConfig, configFileName } from './modules/config';
import { sync2RemoteCommand, sync2LocalCommand } from './commands/sync';
import editConfig from './commands/config';
import autoSave from './commands/auto-save';
import {
  SYNC_TO_REMOTE,
  SYNC_TO_LOCAL,
  CONFIG,
} from './CommandConstants';

function registerCommand(
  context: vscode.ExtensionContext,
  name: string,
  callback: (args: any[]) => any,
  thisArg?: any
) {
  const disposable = vscode.commands.registerCommand(name, callback, thisArg);
  context.subscriptions.push(disposable);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('sftp active');
  registerCommand(context, CONFIG, editConfig);
  
  initConfigs()
    .then(() => {
      output.status('SFTP Ready');
      registerCommand(context, SYNC_TO_REMOTE, sync2RemoteCommand);

      registerCommand(context, SYNC_TO_LOCAL, sync2LocalCommand);

      const updateConfig = (file) => {
        if (path.basename(file.fileName) !== configFileName) {
          return;
        }
        addConfig(file.fileName);
      };
      vscode.workspace.onDidSaveTextDocument(throttle(updateConfig, 300));
    });
}

export function deactivate() {
}
