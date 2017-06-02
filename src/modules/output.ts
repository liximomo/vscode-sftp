import * as vscode from 'vscode';
import { EXTENSION_NAME } from '../constants';

class StatusBarItem {
  private name: string;
  private statusBarItem: vscode.StatusBarItem;

  public isShow: boolean;

  constructor(name) {
    this.name = name;
    this.isShow = false;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
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
      varient.then(this.hide, this.hide)
    }
  }

  hide = () => {
    this.statusBarItem.hide();
    this.isShow = false;
  }
}

export const status = new StatusBarItem('info');

export function success(msg: string, event?: string) {
  return vscode.window.showInformationMessage(`[${event || EXTENSION_NAME}]: ${msg}`);
}

export function onError(error: Error | string, event?: string) {
  let errorString = error;
  if (error instanceof Error) {
    errorString = error.message;
    print(event, '\n', error.stack);
  }

  status.msg('fail', 2000);

  return vscode.window.showErrorMessage(`[${event || EXTENSION_NAME}]: ${errorString}`);
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

  const msg = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 4);
    }
    return arg;
  }).join(' ');

  outputChannel.appendLine(msg);
}

export function debug(...args) {
  print('[debug]:', ...args);
}

export function error(...args) {
  print('[error]:', ...args);
}
