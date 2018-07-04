import * as vscode from 'vscode';
import * as path from 'path';
import * as debounce from 'lodash.debounce';
import sftpBarItem from '../ui/sftpBarItem';
import * as output from '../ui/output';
import { isValidFile } from '../helper/fileType';
import reportError from '../helper/reportError';
import fileDepth from '../helper/fileDepth';
import { simplifyPath } from '../helper/paths';
import { upload, removeRemote } from '../actions';
import { getConfig } from './config';
import logger from '../logger';

const watchers: {
  [x: string]: vscode.FileSystemWatcher;
} = {};

const uploadQueue = new Set<string>();
const deleteQueue = new Set<string>();

// less than 550 will not work
const ACTION_INTEVAL = 550;

function fileError(event, file, showErrorWindow = true) {
  return error => {
    logger.error(`${event} ${file}`, '\n', error.stack);
    if (showErrorWindow) {
      output.show();
    }
  };
}

function doUpload() {
  const files = Array.from(uploadQueue).sort((a, b) => fileDepth(b) - fileDepth(a));
  uploadQueue.clear();
  files.forEach(file => {
    let config;
    try {
      config = getConfig(file);
    } catch (error) {
      reportError(error);
      return;
    }

    upload(file, config).then(() => {
      logger.info('[watcher]', `upload ${file}`);
      sftpBarItem.showMsg(`upload ${path.basename(file)}`, simplifyPath(file), 2 * 1000);
    }, fileError('upload', file));
  });
}

function doDelete() {
  const files = Array.from(deleteQueue).sort((a, b) => fileDepth(b) - fileDepth(a));
  deleteQueue.clear();
  let config;
  files.forEach(file => {
    try {
      config = getConfig(file);
    } catch (error) {
      reportError(error);
      return;
    }

    removeRemote(file, {
      ...config,
      // skipDir: true,
    }).then(() => {
      logger.info('[watcher]', `delete ${file}`);
      sftpBarItem.showMsg(`delete ${path.basename(file)}`, simplifyPath(file), 2 * 1000);
    }, fileError('delete', config.remotePath, false));
  });
}

const debouncedUpload = debounce(doUpload, ACTION_INTEVAL, { leading: true, trailing: true });
const debouncedDelete = debounce(doDelete, ACTION_INTEVAL, { leading: true, trailing: true });

function uploadHandler(uri: vscode.Uri) {
  if (!isValidFile(uri)) {
    return;
  }

  uploadQueue.add(uri.fsPath);
  debouncedUpload();
}

function getWatcherByConfig(config) {
  return watchers[config.context];
}

function removeWatcherByConfig(config) {
  return delete watchers[config.context];
}

function getWatchs() {
  return Object.keys(watchers).map(key => watchers[key]);
}

function setUpWatcher(config) {
  const watchConfig = config.watcher !== undefined ? config.watcher : {};

  let watcher = getWatcherByConfig(config);
  if (watcher) {
    // clear old watcher
    watcher.dispose();
  }

  const shouldAddListenser = watchConfig.autoUpload || watchConfig.autoDelete;
  // tslint:disable-next-line triple-equals
  if (watchConfig.files == false || !shouldAddListenser) {
    return;
  }

  watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(config.context, watchConfig.files),
    false,
    false,
    false
  );
  watchers[config.context] = watcher;

  if (watchConfig.autoUpload) {
    watcher.onDidCreate(uploadHandler);
    watcher.onDidChange(uploadHandler);
  }

  if (watchConfig.autoDelete) {
    watcher.onDidDelete(uri => {
      if (!isValidFile(uri)) {
        return;
      }

      deleteQueue.add(uri.fsPath);
      debouncedDelete();
    });
  }
}

export function disableWatcher(config) {
  const watcher = getWatcherByConfig(config);
  if (watcher) {
    watcher.dispose();
    removeWatcherByConfig(config);
  }
}

export function enableWatcher(config) {
  if (getWatcherByConfig(config) !== undefined) {
    return;
  }

  // delay setup watcher to avoid download event
  setTimeout(() => {
    setUpWatcher(config);
  }, 1000 * 3);
}

export function watchFiles(config) {
  const configs = [].concat(config);
  configs.forEach(setUpWatcher);
}

export function clearAllWatcher() {
  const disposable = vscode.Disposable.from(...getWatchs());
  disposable.dispose();
}
