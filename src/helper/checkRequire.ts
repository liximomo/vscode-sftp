import * as vscode from 'vscode';
import { getWorkspaceFolders } from '../host';

export default function checkRequire(cmd) {
  return (...args) => {
    const workspaceFolders = getWorkspaceFolders();
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('The SFTP extension requires to work with an opened folder.');
      return;
    }

    cmd(...args);
  };
}
