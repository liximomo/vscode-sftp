import * as vscode from 'vscode';
import { COMMAND_CONFIG } from '../constants';
import { newConfig } from '../modules/config';
import {
  getWorkspaceFolders,
  showConfirmMessage,
  showOpenDialog,
  openFolder,
  addWorkspaceFolder,
} from '../host';
import Command from './abstract/command';

export default class Config extends Command {
  static id = COMMAND_CONFIG;

  async doCommandRun() {
    const workspaceFolders = getWorkspaceFolders();
    if (!workspaceFolders) {
      const result = await showConfirmMessage(
        'SFTP expects to work at a folder.',
        'Open Folder',
        'Ok'
      );

      if (!result) {
        return;
      }

      return openFolder();
    }

    if (workspaceFolders.length <= 0) {
      const result = await showConfirmMessage(
        'There are no available folders in current workspace.',
        'Add Folder to Workspace',
        'Ok'
      );

      if (!result) {
        return;
      }

      const resources = await showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: true,
      });

      if (!resources) {
        return;
      }

      addWorkspaceFolder(...resources.map(uri => ({ uri })));
      return;
    }

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
}
