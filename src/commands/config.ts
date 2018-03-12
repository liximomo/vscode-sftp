import * as vscode from 'vscode';
import { COMMAND_CONFIG } from '../constants';
import createCommand from './createCommand';
import { newConfig } from '../modules/config';
import { getWorkspaceFolders } from '../host';

function editConfig() {
  const workspaceFolders = getWorkspaceFolders();
  if (workspaceFolders.length === 1) {
    newConfig(workspaceFolders[0].uri.fsPath);
    return;
  }

  const initDirs = workspaceFolders.map(folder => ({
    value: folder.uri.fsPath,
    label: folder.name,
    description: folder.uri.fsPath,
  }));

  vscode.window
    .showQuickPick(initDirs, {
      ignoreFocusOut: true,
      placeHolder: 'Select a folder...(ESC to cancel)',
    })
    .then(item => {
      if (item === undefined) {
        return;
      }

      newConfig(item.value);
    });
}

export default createCommand(COMMAND_CONFIG, 'config', editConfig);
