import { getActiveTextEditor } from '../host';
import { FileTarget } from '../commands/FileCommand';
import { listFiles } from '../helper/select';
import * as paths from '../helper/paths';
import { selectContext } from '../helper/select';
import upath from '../core/upath';
import { getAllConfigs } from '../modules/config';
import { getHostInfo } from '../modules/config';
import getRemoteFs from '../modules/remoteFs';
import Ignore from '../modules/Ignore';

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
    filter: Ignore.from(config.ignore).createFilter(),
  }));

  const filter = file => {
    const filterConfig = filterConfigs.find(f => paths.isSubpathOf(f.context, file.fsPath));
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
    const localTarget = paths.toLocal(
      upath.relative(targetConfig.remotePath, selected.fsPath),
      targetConfig.context
    );

    return {
      fsPath: localTarget,
    };
  };
}

// selected file or activeTarget or configContext
export function selectFileFallbackToConfigContext(item, items): Promise<FileTarget> {
  // command palette
  if (item === undefined) {
    return selectContext().then(path => ({ fsPath: path }));
  }

  // short cut
  if (item === null || !item.fsPath) {
    return getActiveTarget();
  }

  return Promise.resolve(items ? items : item);
}

// selected folder or configContext
export function selectFolderFallbackToConfigContext(item, items): Promise<FileTarget> {
  // context menu
  if (item && item.fsPath) {
    return Promise.resolve(items ? items : item);
  }

  return selectContext().then(path => ({ fsPath: path }));
}

// selected file from all remote files
export const selectFileFromAll = createFileSelector();

// selected file from remote files expect ignored
export const selectFile = createFileSelector({
  filterCreator: configIngoreFilterCreator,
});

// selected file from remote files expect ignored
export function selectFileOnly(item, items): Promise<FileTarget> {
  // context menu
  if (item && item.fsPath) {
    return Promise.resolve(items ? items : item);
  }

  // short cut
  if (item === null || item === undefined || !item.fsPath) {
    return getActiveTarget();
  }

  return null;
}
