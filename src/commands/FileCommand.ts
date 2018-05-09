import * as vscode from 'vscode';
import { sftpBarItem } from '../global';
import Command from './Command';
import * as output from '../modules/output';
import { getConfig } from '../modules/config';

export interface FileTarget {
  fsPath: string;
}

export default class FileCommand extends Command {
  private getFileTarget: (item, items?) => Promise<FileTarget>;
  private warnEmptyTarget: boolean;

  constructor(
    id,
    name,
    handler: (fsPath: string, config: object) => any,
    getFileTarget: (item, items?) => Promise<FileTarget>,
    warnEmptyTarget: boolean
  ) {
    super(id, name, handler);
    this.getFileTarget = getFileTarget;
    this.warnEmptyTarget = warnEmptyTarget;

    this.onCommandDone(() => {
      sftpBarItem.showMsg(`${this.getName()} done`, 2000);
    });
  }

  async handleFile(fileTarget, handler) {
    const activityPath = fileTarget.fsPath;

    try {
      const config = getConfig(activityPath);
      await handler(activityPath, config);
    } catch (error) {
      output.onError(error);
    }
  }

  decorateHandler(handler) {
    return async (item, items) => {
      const targets = await this.getFileTarget(item, items);
      if (!targets) {
        if (this.warnEmptyTarget) {
          vscode.window.showWarningMessage(`The "${this.getName()}" command can not find a target.`);
        }
        return;
      }

      // $todo sequence exec if in ftp protocol
      const pendingTasks = [].concat(targets).map(target => this.handleFile(target, handler));
      return await Promise.all(pendingTasks);
    };
  }
}
