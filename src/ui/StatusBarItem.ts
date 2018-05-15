import * as vscode from 'vscode';

export default class StatusBarItem {
  private name: string;
  private tooltip: string;
  private statusBarItem: vscode.StatusBarItem;
  private timer: any = null;

  constructor(name, tooltip, command) {
    this.name = name;
    this.tooltip = tooltip;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.statusBarItem.command = command;

    this.clear = this.clear.bind(this);
    this.clear();
  }

  show() {
    this.statusBarItem.show();
  }

  showMsg(text: string, hideAfterTimeout?: number);
  showMsg(text: string, tooltip: string, hideAfterTimeout?: number);
  showMsg(text: string, tooltip?: string | number, hideAfterTimeout?: number) {
    if (typeof tooltip === 'number') {
      hideAfterTimeout = tooltip;
      tooltip = text;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
    if (hideAfterTimeout) {
      this.timer = setTimeout(this.clear, hideAfterTimeout);
    }
  }

  clear() {
    this.statusBarItem.text = this.name;
    this.statusBarItem.tooltip = this.tooltip;
  }
}
