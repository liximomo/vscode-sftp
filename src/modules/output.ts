import * as vscode from 'vscode';
import { EXTENSION_NAME } from '../constants';

let isShow = false;
const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);

export function onError(err: Error | string) {
  let errorString = err;
  if (err instanceof Error) {
    errorString = err.message;
    error(`${err.stack}`);
  }

  return vscode.window.showErrorMessage(`[${EXTENSION_NAME}] ${errorString}`);
}

export function show() {
  outputChannel.show();
  isShow = true;
}

export function hide() {
  outputChannel.hide();
  isShow = false;
}

export function toggle() {
  if (isShow) {
    hide();
  } else {
    show();
  }
}

export function print(...args) {
  const msg = args
    .map(arg => {
      if (arg instanceof Error) {
        return arg.stack;
      } else if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      return arg;
    })
    .join(' ');

  outputChannel.appendLine(msg);
}

export function error(...args) {
  print('[error]:', ...args);
}
