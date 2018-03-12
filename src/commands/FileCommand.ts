import * as vscode from 'vscode';
import Command from './Command';
import * as output from '../modules/output';
import { getConfig } from '../modules/config';
import { getWorkspaceFolders, refreshExplorer } from '../host';
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
  }

  async handleFile(fileTarget, handler) {
    const activityPath = fileTarget.fsPath;

    try {
      const config = getConfig(activityPath);
      await handler(activityPath, config);
    } catch (error) {
      logger.error(error);
      output.onError(error);
    }
    output.status.msg(`${this.getName()} done`, 2000);

    refreshExplorer();
    return;
  }

  decorateHandler(handler) {
    return async (item, items) => {
      const workspaceFolders = getWorkspaceFolders();
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          'The SFTP extension requires to work with an opened folder.'
        );
        return;
      }

      const targets = await this.getFileTarget(item, items);
      if (!targets) {
        return;
      }

      const pendingTasks = [].concat(targets).map(target => this.handleFile(target, handler));
      return await Promise.all(pendingTasks);
    };
  }
}
