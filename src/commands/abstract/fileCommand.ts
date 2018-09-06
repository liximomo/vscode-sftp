import { Uri } from 'vscode';
import app from '../../app';
import { showWarningMessage } from '../../host';
import { getFileService } from '../../modules/serviceManager';
import { reportError } from '../../helper';
import { FileService, UResource } from '../../core';
import Command, { CommandOption } from './command';

type TargetGetter = (item, items?) => Uri | Uri[] | Promise<Uri | Uri[]>;

export interface FileCommandOption extends CommandOption {
  requireTarget?: boolean;
}

export default abstract class FileCommand extends Command {
  static option: FileCommandOption;
  static getFileTarget: TargetGetter;

  constructor(name: string) {
    super(name);
    this.onCommandDone(() => {
      app.sftpBarItem.showMsg(`${this._name} done`, 2000);
    });
  }

  protected abstract handleFile(uResource: UResource, fileService: FileService): Promise<any>;

  private _handleFile(uri: Uri): Promise<any> {
    let fileService: FileService;

    if (UResource.isRemote(uri)) {
      const remoteRoot = app.remoteExplorer.findRoot(uri);
      if (!remoteRoot) {
        throw new Error(`Can't find config for remote resource ${uri}.`);
      }
      fileService = remoteRoot.explorerContext.fileService;
    } else {
      fileService = getFileService(uri.fsPath);
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

    return this.handleFile(uResource, fileService);
  }

  protected async doCommandRun(item, items) {
    const clz = this.constructor as typeof FileCommand;
    const target = await clz.getFileTarget(item, items);
    if (!target) {
      if (clz.option.requireTarget) {
        showWarningMessage(`The "${this._name}" command can not find a target.`);
      }

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
