import * as vscode from 'vscode';

export function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders;
}

export function refreshExplorer() {
  return vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
}

export function focusOpenEditors() {
  return vscode.commands.executeCommand('workbench.files.action.focusOpenEditorsView');
}

export function showTextDocument(filepath: string) {
  return vscode.window.showTextDocument(vscode.Uri.file(filepath));
}
