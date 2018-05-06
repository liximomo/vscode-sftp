import * as vscode from 'vscode';
import { EXTENSION_NAME } from './constants';

export function getConfig() {
  return vscode.workspace.getConfiguration(EXTENSION_NAME);
}

export function onDidOpenTextDocument(
  listener: (e: vscode.TextDocument) => any,
  thisArgs?: any
) {
  return vscode.workspace.onDidOpenTextDocument(listener, thisArgs);
}

export function simplifyPath(localPath) {
  return vscode.workspace.asRelativePath(localPath);
}

export function getActiveTextEditor() {
  return vscode.window.activeTextEditor;
}

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

export function diffFiles(leftFsPath, rightFsPath, title, option?) {
  const leftUri = vscode.Uri.file(leftFsPath);
  const rightUri = vscode.Uri.file(rightFsPath);

  return vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title, option);
}

export function promptForPassword(prompt: string): Promise<string | null> {
  return vscode.window.showInputBox({
    ignoreFocusOut: true,
    password: true,
    prompt,
  }) as Promise<string | null>;
}

export function setContextValue(key: string, value: any) {
  vscode.commands.executeCommand("setContext", EXTENSION_NAME + ":" + key, value);
}