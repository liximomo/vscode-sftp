import { Uri } from 'vscode';
import app from '../../app';
import { showWarningMessage } from '../../host';
import { getFileService } from '../../modules/serviceManager';
import { reportError } from '../../helper';
import { FileService, UResource } from '../../core';
import Command, { CommandOption } from './command';
import logger from '../../logger';

type TargetGetter = (...args: any[]) => Uri | Uri[] | Promise<Uri | Uri[]>;

export default abstract class FileCommand extends Command {
  static getFileTarget: TargetGetter;

  constructor(name: string) {
    super(name);
    this.onCommandDone(() => {
      app.sftpBarItem.showMsg(`${this._name} done`, 2000);
    });
  }

  protected abstract handleFile(uResource: UResource, fileService: FileService, config: any): Promise<any>;

  private _handleFile(uri: Uri): Promise<any> {
    const fileService = getFileService(uri);
    if (!fileService) {
      throw new Error(`FileService Not Found. (${uri.toString(true)}) `);
    }

    const config = fileService.getConfig();
    const uResource = UResource.from(uri, {
      localBasePath: fileService.baseDir,
      remoteBasePath: fileService.remoteBaseDir,
      remoteId: fileService.id,
      remote: {
        host: config.host,
        port: config.port,
      },
    });

    return this.handleFile(uResource, fileService, config);
  }

  protected async doCommandRun(...args) {
    const clz = this.constructor as typeof FileCommand;
    const target = await clz.getFileTarget(...args);
    if (!target) {
      logger.warn(`The "${this._name}" command get canceled without because of missing targets.`);
      return;
    }

    const targetList: Uri[] = Array.isArray(target) ? target : [target];
    app.sftpBarItem.showMsg(`${this._name}...`);
    const pendingTasks = targetList.map(async t => {
      try {
        await this._handleFile(t);
      } catch (error) {
        reportError(error);
      }
    });

    await Promise.all(pendingTasks);
  }
}
