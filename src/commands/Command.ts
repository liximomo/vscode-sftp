import * as vscode from 'vscode';
import * as output from '../modules/output';
import logger from '../logger';
import { getWorkspaceFolders } from '../host';

export interface ITarget {
  fsPath: string;
}

export default class Command {
  protected handler: (...args: any[]) => any;
  private name: string;
  private id: string;
  private commandDoneListeners: Array<() => void>;

  constructor(id, name, handler) {
    this.id = id;
    this.name = name;
    this.handler = handler;
    this.commandDoneListeners = [];
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

  getName() {
    return this.name;
  }

  decorateHandler(handler) {
    return (...args) => handler(...args);
  }

  wrapHandler() {
    const originHandler = this.handler;
    this.handler = this.decorateHandler(originHandler);
  }

  async run(...args) {
    const workspaceFolders = getWorkspaceFolders();
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('The SFTP extension requires to work with an opened folder.');
      return;
    }

    logger.debug(`run command ${this.getName()}`, ...args);
    try {
      await this.handler(...args);
    } catch (error) {
      logger.error(error);
      output.onError(error);
    }

    this.commitCommandDone();
  }

  register(context: vscode.ExtensionContext) {
    this.wrapHandler();
    const disposable = vscode.commands.registerCommand(this.id, this.run, this);
    context.subscriptions.push(disposable);
  }
}
