import * as vscode from 'vscode';

export const EXTENSION_NAME = 'sftp';

let outputChannel;

export function success(msg: string, event?: string) {
  return vscode.window.showInformationMessage(`[${event || EXTENSION_NAME}]: ${msg}`);
}

export function errorMsg(error: Error | string, event?: string) {
  let errorString = error;
  if (error instanceof Error) {
    errorString = error.message;
  }

  return vscode.window.showErrorMessage(`[${event || EXTENSION_NAME}]: ${errorString}`);
}

const STATUS_TIMEOUT = 4200;

export function status(event: string) {
  return vscode.window.setStatusBarMessage(event, STATUS_TIMEOUT);
}

export function print(msg) {
  if (outputChannel === undefined) {
    outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
    outputChannel.show();
  }

  outputChannel.appendLine(msg);
}
