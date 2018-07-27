import * as vscode from 'vscode';
import { registerCommand } from '../host';
import { reportError } from '../helper';

export interface ITarget {
  fsPath: string;
}

export default abstract class BaseCommand {
  private id: string;
  private name: string;
  private commandDoneListeners: Array<() => void>;

  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.commandDoneListeners = [];
  }

  getName() {
    return this.name;
  }

  onCommandDone(listener) {
    this.commandDoneListeners.push(listener);

    return () => {
      const index = this.commandDoneListeners.indexOf(listener);
      if (index > -1) this.commandDoneListeners.splice(index, 1);
    };
  }

  commitCommandDone() {
    this.commandDoneListeners.forEach(listener => listener());
  }

  register(context: vscode.ExtensionContext) {
    registerCommand(context, this.id, this._commandHandler, this);
  }

  protected abstract async run(...args: any[]);

  private async _commandHandler(...args) {
    try {
      await this.run(...args);
    } catch (error) {
      reportError(error);
    }
  }
}
