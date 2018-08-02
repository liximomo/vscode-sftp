import * as vscode from 'vscode';
import * as path from 'path';
import * as debounce from 'lodash.debounce';
import * as output from '../ui/output';
import app from '../app';
import { executeCommand } from '../host';
import { COMMAND_UPLOAD, COMMAND_DELETEREMOTE } from '../constants';
import { reportError, isValidFile, fileDepth, simplifyPath, toRemotePath } from '../helper';
import { removeRemote } from '../actions';
import logger from '../logger';
import { getConfig } from './config';

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
  files.forEach(async file => {
    logger.info('[watcher]', `${file} updated`);
    try {
      await executeCommand(COMMAND_UPLOAD, vscode.Uri.file(file));
    } catch {
      fileError('upload', file);
    }
  });
}

function doDelete() {
  const files = Array.from(deleteQueue).sort((a, b) => fileDepth(b) - fileDepth(a));
  deleteQueue.clear();
  files.forEach(async file => {
    logger.info('[watcher]', `${file} removed`);
    try {
      await executeCommand(COMMAND_DELETEREMOTE, vscode.Uri.file(file));
    } catch {
      fileError(`delete ${file}'s remote`, false);
    }
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
