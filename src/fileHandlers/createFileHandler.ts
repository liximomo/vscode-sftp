import * as path from 'path';
import { showErrorMessage } from '../host';
import { fs, fileOps, UResource, FileService } from '../core';
import { simplifyPath } from '../helper';
import app from '../app';
import logger from '../logger';

interface FileHandlerOption {
  name: string;
  handler: FileHandlerImpl;
  config?: FileHandlerConfig;
  transformOption?: (x: any) => any;
}

interface FileHandlerConfig {
  doNotTriggerWatcher?: boolean;
}

type FileHandler<T> = (target: UResource, fileService: FileService, option?: T) => Promise<any>;

type FileHandlerImpl = (
  uResource: UResource,
  localFs: fs.FileSystem,
  remoteFs: fs.FileSystem,
  option: any
) => any;

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

export default function createFileHandler<T>(
  handlerOption: FileHandlerOption
): FileHandler<Partial<T>> {
  return async (target: UResource, fileService: FileService, option: T) => {
    logger.trace(`handle ${handlerOption.name} for`, target.localFsPath);

    const handleConfig = handlerOption.config || {};

    const config = fileService.getConfig();
    const remoteFs = await fileService.getRemoteFileSystem();
    const optionFromConfig = handlerOption.transformOption
      ? handlerOption.transformOption(config)
      : {};
    const invokeOption = {
      onProgress,
      ...optionFromConfig,
    };
    if (option) {
      Object.assign(invokeOption, option);
    }

    if (handleConfig.doNotTriggerWatcher) {
      fileService.disableWatcher();
    }

    try {
      return await handlerOption.handler(
        target,
        fileService.getLocalFileSystem(),
        remoteFs,
        invokeOption
      );
    } catch (error) {
      throw error;
    } finally {
      if (handleConfig.doNotTriggerWatcher) {
        // delay setup watcher to avoid download event
        setTimeout(() => {
          fileService.enableWatcher();
        }, 1000 * 3);
      }
    }
  };
}
