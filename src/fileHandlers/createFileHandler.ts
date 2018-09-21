import { Uri } from 'vscode';
import { UResource, FileService } from '../core';
import logger from '../logger';
import { getFileService } from '../modules/serviceManager';

interface FileHandlerConfig {
  doNotTriggerWatcher?: boolean;
}

export interface FileHandlerContext {
  target: UResource;
  fileService: FileService;
  config: any;
}

type FileHandlerContextMethod<R = void> = (this: FileHandlerContext) => R;
type FileHandlerContextMethodArg1<A, R = void> = (this: FileHandlerContext, a: A) => R;

interface FileHandlerOption<T> {
  name: string;
  handle: FileHandlerContextMethodArg1<any, Promise<any>>;
  afterHandle?: FileHandlerContextMethod;
  config?: FileHandlerConfig;
  transformOption?: FileHandlerContextMethod<any>;
}

export function handleCtxFromUri(uri: Uri): FileHandlerContext {
  const fileService = getFileService(uri);
  if (!fileService) {
    throw new Error(`FileService Not Found. (${uri.toString(true)}) `);
  }
  const config = fileService.getConfig();
  const target = UResource.from(uri, {
    localBasePath: fileService.baseDir,
    remoteBasePath: config.remotePath,
    remoteId: fileService.id,
    remote: {
      host: config.host,
      port: config.port,
    },
  });

  return {
    fileService,
    config,
    target,
  };
}

export default function createFileHandler<T>(
  handlerOption: FileHandlerOption<T>
): (ctx: FileHandlerContext | Uri, option?: T) => Promise<void> {
  async function fileHandle(ctx: Uri | FileHandlerContext, option?: T) {
    const handleCtx = ctx instanceof Uri ? handleCtxFromUri(ctx) : ctx;
    const { fileService, target } = handleCtx;

    logger.trace(`handle ${handlerOption.name} for`, target.localFsPath);

    const handleConfig = handlerOption.config || {};
    if (handleConfig.doNotTriggerWatcher) {
      fileService.disableWatcher();
    }
    try {
      const optionFromConfig = handlerOption.transformOption
        ? handlerOption.transformOption.call(handleCtx)
        : {};
      if (option) {
        Object.assign(optionFromConfig, option);
      }

      await handlerOption.handle.call(handleCtx, optionFromConfig);

      if (handlerOption.afterHandle) {
        handlerOption.afterHandle.call(handleCtx);
      }
    } catch (error) {
      // todo: catchError
      throw error;
    } finally {
      if (handleConfig.doNotTriggerWatcher) {
        // delay setup watcher to avoid download event
        setTimeout(() => {
          (fileService as FileService).enableWatcher();
        }, 1000 * 3);
      }
    }
  }

  return fileHandle;
}
