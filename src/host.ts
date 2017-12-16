import * as vscode from 'vscode';

export function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders;
}
