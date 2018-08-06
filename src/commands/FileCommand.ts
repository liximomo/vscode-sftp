import * as vscode from 'vscode';
import BaseCommand from './BaseCommand';
import logger from '../logger';
import app from '../app';
import UResource from '../core/UResource';
import { showWarningMessage } from '../host';
import { reportError } from '../helper';
import { getConfig } from '../modules/config';

export type FileTarget = vscode.Uri;
type FileHandler = (resource: UResource, config: any) => any;

export default class FileCommand extends BaseCommand {
  protected fileHandler: FileHandler;
  private getFileTarget: (item, items?) => Promise<FileTarget>;
  private requireTarget: boolean;

  constructor(id, name, fileHandler: FileHandler, getFileTarget, requireTarget: boolean) {
    super(id, name);
    this.fileHandler = fileHandler;
    this.getFileTarget = getFileTarget;
    this.requireTarget = requireTarget;

    this.onCommandDone(() => {
      app.sftpBarItem.showMsg(`${this.getName()} done`, 2000);
    });
  }

  protected async run(item, items) {
    const target = await this.getFileTarget(item, items);
    if (!target) {
      if (this.requireTarget) {
        showWarningMessage(`The "${this.getName()}" command can not find a target.`);
      }

      return;
    }

    const targetList: vscode.Uri[] = Array.isArray(target) ? target : [target];
    app.sftpBarItem.showMsg(`${this.getName()}...`);
    const pendingTasks = targetList.map(t => this.handleFile(t));

    try {
      return await Promise.all(pendingTasks);
    } finally {
      this.commitCommandDone(targetList);
    }
  }

  private async handleFile(fileTarget: FileTarget) {
    const activityPath = fileTarget.fsPath;

    logger.trace(`execute ${this.getName()} for`, activityPath);

    const isRemote: boolean = fileTarget.scheme === 'remote';
    let config;
    let rootResouce: UResource;

    if (isRemote) {
      const remoteRoot = app.remoteExplorer.findRoot(fileTarget);
      if (!remoteRoot) {
        throw new Error(`Can't find config for remote resource ${fileTarget}.`);
      }
      config = remoteRoot.explorerContext.config;
      const localRootUri = UResource.toLocalUri(config.context);
      rootResouce = UResource.from(localRootUri, remoteRoot.resourceUri);
    } else {
      config = getConfig(fileTarget.fsPath);
      const localRootUri = UResource.toLocalUri(config.context);
      const remoteRootUri = UResource.makeRemoteUri({
        host: config.host,
        port: config.port,
        remotePath: config.remotePath,
        rootId: config.id,
      });
      rootResouce = UResource.from(localRootUri, remoteRootUri);
    }

    const resource = UResource.from(fileTarget, isRemote, rootResouce);

    try {
      await this.fileHandler(resource, config);
    } catch (error) {
      reportError(error);
    }
  }
}
