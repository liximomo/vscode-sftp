import * as vscode from 'vscode';
import * as path from 'path';
import { newConfig } from '../modules/config';
import localFs from '../modules/localFs';
import { FileType } from '../model/Fs/FileSystem';
import checkRequire from '../helper/checkRequire';
import getTopFolders from '../helper/getTopFolders';

function editConfig() {
  if (vscode.workspace.workspaceFolders.length === 1) {
    newConfig(vscode.workspace.workspaceFolders[0].uri.fsPath);
    return;
  }

  const initDirs = vscode.workspace.workspaceFolders.map(folder => ({
    value: folder.uri.fsPath,
    label: folder.name,
    description: folder.uri.fsPath,
  }));

  vscode.window
    .showQuickPick(initDirs, {
      ignoreFocusOut: true,
      placeHolder: 'Select a folder...(ESC to cancel)',
    }).then(item => {
      if (item === undefined) {
        return;
      }
      newConfig(item.value);
    });
}

export default checkRequire(editConfig);
