import { Uri } from 'vscode';
import * as path from 'path';
import { showErrorMessage } from '../host';
import { fileOps, UResource, FileService } from '../core';
import { simplifyPath } from '../helper';
import app from '../app';
import logger from '../logger';
import { getFileService } from '../modules/serviceManager';

interface FileHandlerConfig {
  doNotTriggerWatcher?: boolean;
}

type FileHandlerMethod<T> = (this: FileHandler<T>) => void;
type FileHandlerMethodArg1<T, A> = (this: FileHandler<T>, a: A) => void;
type FileHandlerMethodReturn<T, R> = (this: FileHandler<T>) => R;

// interface FileHandler<T> {
//   (target: UResource, fileService: FileService, config: any, option?: T): Promise<any>;
//   (target: Uri, option?: T): Promise<any>;
// }

interface FileHandlerOption<T> {
  name: string;
  handle: FileHandlerMethodArg1<T, any>;
  afterHandle?: FileHandlerMethod<T>;
  config?: FileHandlerConfig;
  transformOption?: FileHandlerMethodReturn<T, any>;
}

type FileHandleFunc<T> = (option?: T) => Promise<any>;

export class FileHandler<T> {
  fileService: FileService;
  target: UResource;
  config: any;
  handle: FileHandleFunc<T>;

  constructor(uri: Uri) {
    const fileService = getFileService(uri);
    if (!fileService) {
      throw new Error(`FileService Not Found. (${uri.toString(true)}) `);
    }

    const config = fileService.getConfig();
    this.target = UResource.from(uri, {
      localBasePath: fileService.baseDir,
      remoteBasePath: fileService.remoteBaseDir,
      remoteId: fileService.id,
      remote: {
        host: config.host,
        port: config.port,
      },
    });
    this.fileService = fileService;
    this.config = config;
  }
}

function onProgress(error: Error, task: fileOps.FileTask) {
  const localFsPath = task.file.fsPath;
  if (error) {
    const errorMsg = `${error.message} when ${task.type} ${localFsPath}`;
    logger.error(errorMsg);
    showErrorMessage(errorMsg);
    return;
  }

  logger.info(`${task.type} ${localFsPath}`);
  app.sftpBarItem.showMsg(`${task.type} ${path.basename(localFsPath)}`, simplifyPath(localFsPath));
}

export function extend<T>(handlerOption: FileHandlerOption<T>) {
  return class CustomFileHandler extends FileHandler<T> {
    constructor(uri: Uri) {
      super(uri);

      this.handle = async (option?: T) => {
        const target = this.target;
        const fileService = this.fileService;

        logger.trace(`handle ${handlerOption.name} for`, target.localFsPath);

        const handleConfig = handlerOption.config || {};
        if (handleConfig.doNotTriggerWatcher) {
          fileService.disableWatcher();
        }
        try {
          const optionFromConfig = handlerOption.transformOption
            ? handlerOption.transformOption.call(this)
            : {};
          const invokeOption = {
            onProgress,
            ...optionFromConfig,
          };
          if (option) {
            Object.assign(invokeOption, option);
          }

          await handlerOption.handle.call(this, invokeOption);

          if (handlerOption.afterHandle) {
            handlerOption.afterHandle.call(this);
          }
        } catch (error) {
          throw error;
        } finally {
          if (handleConfig.doNotTriggerWatcher) {
            // delay setup watcher to avoid download event
            setTimeout(() => {
              (fileService as FileService).enableWatcher();
            }, 1000 * 3);
          }
        }
      };
    }
  };
}
