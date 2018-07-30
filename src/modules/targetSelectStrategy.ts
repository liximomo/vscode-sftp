import * as vscode from 'vscode';
import { getActiveTextEditor } from '../host';
import { getAllRawConfigs } from '../modules/config';
import { FileTarget } from '../commands/FileCommand';
import { listFiles, isSubpathOf, toLocalPath, filesIgnoredFromConfig } from '../helper';
import upath from '../core/upath';
import { getAllConfigs } from './config';
import { getHostInfo } from './config';
import getRemoteFs from './remoteFs';
import Ignore from './Ignore';

export function selectContext(): Promise<FileTarget> {
  return new Promise((resolve, reject) => {
    const configs = getAllRawConfigs();
    const projectsList = configs
      .map(cfg => ({
        value: cfg.context,
        label: cfg.name || vscode.workspace.asRelativePath(cfg.context),
        description: '',
        detail: cfg.context,
      }))
      .sort((l, r) => l.label.localeCompare(r.label));

    // if (projectsList.length === 1) {
    // return resolve(projectsList[0].value);
    // }

    vscode.window
      .showQuickPick(projectsList, {
        placeHolder: 'Select a folder...',
      })
      .then(selection => {
        if (selection) {
          return resolve({ fsPath: selection.value });
        }

        // cancel selection
        resolve(null);
      }, reject);
  });
}

function getActiveTarget(): Promise<FileTarget> {
  return new Promise((resolve, reject) => {
    const active = getActiveTextEditor();
    if (!active || !active.document) {
      throw new Error('Action must have a file or directory as target!');
    }

    resolve({
      fsPath: active.document.fileName,
    });
  });
}

function configIngoreFilterCreator(configs) {
  const filterConfigs = configs.map(config => ({
    context: config.remotePath,
    filter: Ignore.from(filesIgnoredFromConfig(config)).createFilter(),
  }));

  const filter = file => {
    const filterConfig = filterConfigs.find(f => isSubpathOf(f.context, file.fsPath));
    if (!filterConfig) {
      return true;
    }

    // $fix 目前不能确保相对路径不出错，upath 会导致 unix 有效的\\文件名被转化成路径分割符
    const relativePath = upath.relative(filterConfig.context, file.fsPath);
    if (relativePath === '') {
      return true;
    }

    return filterConfig.filter(upath.relative(filterConfig.context, file.fsPath));
  };
  return filter;
}

function createFileSelector({ filterCreator = null } = {}) {
  return async (): Promise<FileTarget> => {
    const configs = getAllConfigs();
    const remoteItems = configs.map((config, index) => ({
      name: config.name,
      description: config.host,
      fsPath: config.remotePath,
      getFs: () => getRemoteFs(getHostInfo(config)),
      index,
    }));

    const selected = await listFiles(remoteItems, {
      filter: filterCreator ? filterCreator(configs) : undefined,
    });

    if (!selected) {
      return;
    }

    const targetConfig = configs[selected.index];
    const localTarget = toLocalPath(
      upath.relative(targetConfig.remotePath, selected.fsPath),
      targetConfig.context
    );

    return {
      fsPath: localTarget,
    };
  };
}

// selected file or activeTarget or configContext
export function selectActivedFile(item, items): Promise<FileTarget> {
  // from file explorer
  if (item && item.fsPath) {
    return Promise.resolve(items ? items : item);
  }

  return getActiveTarget();
}

// selected folder or configContext
export function selectFolderFallbackToConfigContext(item, items): Promise<FileTarget> {
  // context menu
  if (item && item.fsPath) {
    return Promise.resolve(items ? items : item);
  }

  return selectContext();
}

// selected file from all remote files
export const selectFileFromAll = createFileSelector();

// selected file from remote files expect ignored
export const selectFile = createFileSelector({
  filterCreator: configIngoreFilterCreator,
});
