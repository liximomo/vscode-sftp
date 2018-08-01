import * as vscode from 'vscode';
import BaseCommand from './BaseCommand';
import logger from '../logger';
import app from '../app';
import { showWarningMessage } from '../host';
import { reportError } from '../helper';
import { getConfig } from '../modules/config';

export type FileTarget = vscode.Uri;

export default class FileCommand extends BaseCommand {
  protected fileHandler: (localPath: vscode.Uri, remotePath: vscode.Uri, config: any) => any;
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

    let config;
    let localUri: vscode.Uri = fileTarget;
    let remoteUri: vscode.Uri;

    if (fileTarget.scheme === 'remote') {
      remoteUri = fileTarget;
      const remoteRoot = app.remoteExplorer.findRoot(remoteUri);
      if (!remoteRoot) {
        throw new Error(`Can't find config for remote resource ${remoteUri}.`);
      }
      config = remoteRoot.explorerContext.config;
      localUri = app.remoteExplorer.localUri(remoteUri, config);
    } else {
      localUri = fileTarget;
      config = getConfig(localUri.fsPath);
      remoteUri = app.remoteExplorer.remoteUri(localUri, config);
    }

    try {
      await this.fileHandler(localUri, remoteUri, config);
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
