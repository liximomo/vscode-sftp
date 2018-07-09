import BaseCommand from './BaseCommand';
import logger from '../logger';
import sftpBarItem from '../ui/sftpBarItem';
import { showWarningMessage } from '../host';
import reportError from '../helper/reportError';
import { getConfig } from '../modules/config';

export interface FileTarget {
  fsPath: string;
}

export default class FileCommand extends BaseCommand {
  protected fileHandler: (fspath: string, config: any) => any;
  private getFileTarget: (item, items?) => Promise<FileTarget>;
  private requireTarget: boolean;

  constructor(id, name, fileHandler, getFileTarget, requireTarget: boolean) {
    super(id, name);
    this.fileHandler = fileHandler;
    this.getFileTarget = getFileTarget;
    this.requireTarget = requireTarget;

    this.onCommandDone(() => {
      sftpBarItem.showMsg(`${this.getName()} done`, 2000);
    });
  }

  protected async run(...args) {
    return this.handler(args[0], args[1]);
  }

  private async handleFile(fileTarget) {
    const activityPath = fileTarget.fsPath;
    logger.trace(`execute ${this.getName()} for`, activityPath);
    try {
      const config = getConfig(activityPath);
      await this.fileHandler(activityPath, config);
    } catch (error) {
      reportError(error);
    }
  }

  private async handler(item, items) {
    const targets = await this.getFileTarget(item, items);

    if (!targets) {
      if (this.requireTarget) {
        showWarningMessage(`The "${this.getName()}" command can not find a target.`);
      }

      return;
    }

    sftpBarItem.showMsg(`${this.getName()}...`);
    const pendingTasks = [].concat(targets).map(target => this.handleFile(target));

    try {
      return await Promise.all(pendingTasks);
    } finally {
      this.commitCommandDone();
    }
  }
}
