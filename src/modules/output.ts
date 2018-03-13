import * as vscode from 'vscode';
import { getConfig } from './editorConfig';
import { EXTENSION_NAME } from '../constants';

const config = getConfig();
const printDebugLog = config.printDebugLog;

class StatusBarItem {
  isShow: boolean;

  private name: string;
  private statusBarItem: vscode.StatusBarItem;

  constructor(name) {
    this.name = name;
    this.isShow = false;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    this.hide = this.hide.bind(this);
  }

  getName() {
    return this.name;
  }

  msg(text: string, varient?: number | Promise<any>) {
    if (!this.isShow) {
      this.statusBarItem.show();
      this.isShow = true;
    }

    this.statusBarItem.text = text;

    if (typeof varient === 'number') {
      setTimeout(this.hide, varient);
    }

    if (typeof varient === 'object' && typeof varient.then === 'function') {
      varient.then(this.hide, this.hide);
    }
  }

  hide() {
    this.statusBarItem.hide();
    this.isShow = false;
  }
}

export const status = new StatusBarItem('info');

export function success(msg: string, event?: string) {
  return vscode.window.showInformationMessage(`[${event || EXTENSION_NAME}] ${msg}`);
}

export function onError(err: Error | string) {
  let errorString = err;
  if (err instanceof Error) {
    errorString = err.message;
    error(`${err.stack}`);
  }

  status.msg('fail', 2000);

  return vscode.window.showErrorMessage(`[${EXTENSION_NAME}] ${errorString}`);
}

let outputChannel;

export function showOutPutChannel() {
  if (outputChannel !== undefined) {
    outputChannel.show();
  }
}

export function print(...args) {
  if (outputChannel === undefined) {
    outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
  }

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

export function info(...args) {
  print('[info]:', ...args);
}

export function debug(...args) {
  if (!printDebugLog) {
    return;
  }
  print('[debug]:', ...args);
}

export function error(...args) {
  print('[error]:', ...args);
}
