import * as vscode from 'vscode';
import * as output from '../modules/output';
import logger from '../logger';

export interface ITarget {
  fsPath: string;
}

export default class Command {
  protected handler: (...args: any[]) => any;
  private name: string;
  private id: string;

  constructor(id, name, handler) {
    this.id = id;
    this.name = name;
    this.handler = handler;
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
    logger.debug(`run command ${this.getName()}`, ...args);
    try {
      await this.handler(...args);
    } catch (error) {
      logger.error(error);
      output.onError(error);
    }
  }

  register(context: vscode.ExtensionContext) {
    this.wrapHandler();
    const disposable = vscode.commands.registerCommand(this.id, this.run, this);
    context.subscriptions.push(disposable);
  }
}
