import * as vscode from 'vscode';
import * as path from 'path';
import upath from '../core/upath';
import localFs from '../modules/localFs';
import Ignore from '../modules/Ignore';
import { FileTask } from '../core/fileTransferTask';
import { getRemotefsFromConfig, simplifyPath, filesIgnoredFromConfig } from '../helper';
import app from '../app';
import logger from '../logger';
import { disableWatcher, enableWatcher } from '../modules/fileWatcher';

function onProgress(error, task: FileTask) {
  if (error) {
    logger.error(error, `${task.type} ${task.resourceUri.fsPath}`);
  }

  logger.info(`${task.type} ${task.resourceUri.fsPath}`);
  app.sftpBarItem.showMsg(
    `${task.type} ${path.basename(task.resourceUri.fsPath)}`,
    simplifyPath(task.resourceUri.fsPath)
  );
}

export default function createFileAction(
  actionName: string,
  func: (
    localFsPath: string,
    remoteFsPath: string,
    localUri: vscode.Uri,
    remoteUri: vscode.Uri,
    config: any,
    option: any
  ) => any,
  { doNotTriggerWatcher = false } = {}
) {
  return async (
    localFsPath: string,
    localUri: vscode.Uri,
    remoteFsPath: string,
    remoteUri: vscode.Uri,
    config: any
  ) => {
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
      retValue = await func(
        localFsPath,
        remoteFsPath,
        localUri,
        remoteUri,
        {
          ...config,
          concurrency: config.protocol === 'ftp' ? 1 : config.concurrency,
          ignore: ignoreFunc,
        },
        {
          localFs,
          remoteFs,
          onProgress,
        }
      );
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
