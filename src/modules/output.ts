import * as vscode from 'vscode';
import { EXTENSION_NAME } from '../constants';

class StatusBarItem {
  isShow: boolean;

  private name: string;
  private statusBarItem: vscode.StatusBarItem;
  private timer: any = null;

  constructor(name) {
    this.name = name;
    this.isShow = false;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    this.hide = this.hide.bind(this);
  }

  getName() {
    return this.name;
  }

  msg(content: string | { text: string, tooltip: string }, varient?: number | Promise<any>) {
    let text;
    let tooltip;

    if (typeof content === 'object' && content.text !== undefined) {
      text = content.text;
      tooltip = content.tooltip;
    } else {
      text = content;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.isShow) {
      this.statusBarItem.show();
      this.isShow = true;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;

    if (typeof varient === 'number') {
      this.timer = setTimeout(this.hide, varient);
      return;
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

export function error(...args) {
  print('[error]:', ...args);
}
