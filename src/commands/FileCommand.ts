import * as vscode from 'vscode';
import * as path from 'path';
import upath from '../core/upath';
import BaseCommand from './BaseCommand';
import logger from '../logger';
import app from '../app';
import { showWarningMessage } from '../host';
import { reportError, toRemotePath, toLocalPath } from '../helper';
import { getConfig } from '../modules/config';

export type FileTarget = vscode.Uri;

export default class FileCommand extends BaseCommand {
  protected fileHandler: (localPath: string, remotePath: string, config: any) => any;
  private getFileTarget: (item, items?) => Promise<FileTarget>;
  private requireTarget: boolean;

  constructor(id, name, fileHandler, getFileTarget, requireTarget: boolean) {
    super(id, name);
    this.fileHandler = fileHandler;
    this.getFileTarget = getFileTarget;
    this.requireTarget = requireTarget;

    this.onCommandDone(() => {
      app.sftpBarItem.showMsg(`${this.getName()} done`, 2000);
    });
  }

  protected async run(...args) {
    try {
      return await this.handler(args[0], args[1]);
    } finally {
      this.commitCommandDone(...args);
    }
  }

  private async handleFile(fileTarget: FileTarget) {
    const activityPath = fileTarget.fsPath;
    logger.trace(`execute ${this.getName()} for`, activityPath);
    try {
      let config;
      if (fileTarget.scheme === 'remote') {
        const root = app.remoteExplorer.findRoot(fileTarget);
        if (!root) {
          throw new Error(`Can't find config for remote resource ${fileTarget}.`);
        }
        config = root.explorerContext.config;
      } else {
        config = getConfig(fileTarget.fsPath);
      }

      const localContext = config.context;
      const remoteContext = config.remotePath;
      let localFilePath;
      let remotePath;
      if (fileTarget.scheme === 'remote') {
        remotePath = fileTarget.fsPath;
        localFilePath = toLocalPath(upath.relative(remoteContext, remotePath), localContext);
      } else {
        localFilePath = fileTarget.fsPath;
        remotePath = toRemotePath(path.relative(localContext, localFilePath), remoteContext);
      }

      await this.fileHandler(localFilePath, remotePath, config);
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

    app.sftpBarItem.showMsg(`${this.getName()}...`);
    const pendingTasks = [].concat(targets).map(target => this.handleFile(target));

    return await Promise.all(pendingTasks);
  }
}
