import * as path from 'path';
import { showErrorMessage } from '../host';
import upath from '../core/upath';
import UResource from '../core/UResource';
import FileSystem from '../core/Fs/FileSystem';
import localFs from '../modules/localFs';
import Ignore from '../modules/Ignore';
import { FileTask } from '../core/fileTransferTask';
import { getRemotefsFromConfig, simplifyPath, filesIgnoredFromConfig } from '../helper';
import app from '../app';
import logger from '../logger';
import { disableWatcher, enableWatcher } from '../modules/fileWatcher';

function onProgress(error: Error, task: FileTask) {
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

export default function createFileAction(
  actionName: string,
  func: (uResource: UResource, localFs: FileSystem, remoteFs: FileSystem, option: any) => any,
  { doNotTriggerWatcher = false } = {}
) {
  return async (uResource: UResource, config: any) => {
    const localContext = config.context;
    const remoteContext = config.remotePath;

    const ignoreConfig = filesIgnoredFromConfig(config);
    const ignore = Ignore.from(ignoreConfig);
    const ignoreFunc = fsPath => {
      // vscode will always return path with / as separator
      const normalizedPath = path.normalize(fsPath);
      let relativePath;
      if (normalizedPath.indexOf(localContext) === 0) {
        // local path
        relativePath = path.relative(localContext, fsPath);
      } else {
        // remote path
        relativePath = upath.relative(remoteContext, fsPath);
      }

      // skip root
      return relativePath !== '' && ignore.ignores(relativePath);
    };

    const remoteFs = await getRemotefsFromConfig(config);

    if (doNotTriggerWatcher) {
      disableWatcher(config);
    }

    let retValue;
    try {
      retValue = await func(uResource, localFs, remoteFs, {
        ...config,
        concurrency: config.protocol === 'ftp' ? 1 : config.concurrency,
        ignore: ignoreFunc,
        onProgress,
      });
    } catch (error) {
      throw error;
    } finally {
      if (doNotTriggerWatcher) {
        enableWatcher(config);
      }
    }

    return retValue;
  };
}
