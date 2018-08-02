import * as vscode from 'vscode';
import { getActiveTextEditor } from '../host';
import { getAllRawConfigs } from './config';
import { FileTarget } from '../commands/FileCommand';
import {
  getRemotefsFromConfig,
  listFiles,
  isSubpathOf,
  toLocalPath,
  filesIgnoredFromConfig,
} from '../helper';
import upath from '../core/upath';
import { getAllConfigs } from './config';
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
          return resolve(vscode.Uri.file(selection.value));
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

    resolve(active.document.uri);
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
      getFs: () => getRemotefsFromConfig(config),
      index,
    }));

    const selected = await listFiles(remoteItems, {
      filter: filterCreator ? filterCreator(configs) : undefined,
    });

    if (!selected) {
      return;
    }

    const targetConfig = configs[selected.index];
    const localTarget = toLocalPath(selected.fsPath, targetConfig.remotePath, targetConfig.context);

    return vscode.Uri.file(localTarget);
  };
}

// selected file or activeTarget or configContext
export function selectActivedFile(item, items): Promise<FileTarget | FileTarget[]> {
  // from explorer or editor context
  if (item) {
    if (item.fsPath) {
      if (Array.isArray(items) && items[0].fsPath) {
        // multi-select in explorer
        return Promise.resolve(items);
      } else {
        return Promise.resolve(item);
      }
    } else if (item.resourceUri) {
      // from remote explorer
      return Promise.resolve(item.resourceUri);
    }
  }

  return getActiveTarget();
}

// selected folder or configContext
export function selectFolderFallbackToConfigContext(item, items): Promise<FileTarget> {
  // from explorer or editor context
  if (item) {
    if (item.fsPath) {
      return Promise.resolve(items ? items : item);
    } else if (item.resourceUri) {
      // from remote explorer
      return Promise.resolve(item.resourceUri);
    }
  }

  return selectContext();
}

// selected file from all remote files
export const selectFileFromAll = createFileSelector();

// selected file from remote files expect ignored
export const selectFile = createFileSelector({
  filterCreator: configIngoreFilterCreator,
});
