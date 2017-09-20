import * as vscode from 'vscode';

export default function checkRequire(cmd) {
  return (...args) => {
    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage('The SFTP extension requires to work with an opened folder.');
      return;
    }

    cmd(...args);
  };
}
