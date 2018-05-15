import * as vscode from 'vscode';
import { newConfig } from '../modules/config';
import { getWorkspaceFolders } from '../host';

export function editConfig() {
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
      placeHolder: 'Select a folder...',
    })
    .then(item => {
      if (item === undefined) {
        return;
      }

      newConfig(item.value);
    });
}
