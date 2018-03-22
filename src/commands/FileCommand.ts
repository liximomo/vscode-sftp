import * as vscode from 'vscode';
import Command from './Command';
import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import logger from '../logger';

export interface FileTarget {
  fsPath: string;
}

export default class FileCommand extends Command {
  private getFileTarget: (item, items?) => Promise<FileTarget>;

  constructor(
    id,
    name,
    handler: (fsPath: string, config: object) => any,
    getFileTarget: (item, items?) => Promise<FileTarget>
  ) {
    super(id, name, handler);
    this.getFileTarget = getFileTarget;

    this.onCommandDone(() => {
      output.status.msg(`${this.getName()} done`, 2000);
    });
  }

  async handleFile(fileTarget, handler) {
    const activityPath = fileTarget.fsPath;

    try {
      const config = getConfig(activityPath);
      await handler(activityPath, config);
      logger.info(`${this.getName()} ${fileTarget.fsPath}`);
    } catch (error) {
      output.onError(error);
    }
  }

  decorateHandler(handler) {
    return async (item, items) => {
      const targets = await this.getFileTarget(item, items);
      if (!targets) {
        vscode.window.showWarningMessage(`The "${this.getName()}" command can not find a target.`);
        return;
      }

      // $todo sequence exec if in ftp protocol
      const pendingTasks = [].concat(targets).map(target => this.handleFile(target, handler));
      return await Promise.all(pendingTasks);
    };
  }
}
