import * as path from 'path';
import createCommand from '../helper/createCommand';
import { listFiles } from '../helper/select';
import * as paths from '../helper/paths';
import * as output from '../modules/output';
import upath from '../modules/upath';
import { getAllConfigs } from '../modules/config';
import { download } from '../modules/sync';
import { getHostInfo } from '../modules/config';
import getRemoteFs from '../modules/remoteFs';
import Ignore from '../modules/Ignore';
import { FileType } from '../model/Fs/FileSystem';
import { refreshExplorer, focusOpenEditors, showTextDocument } from '../host';

const configIngoreCreator = configs => {
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
};

function createList({
  filterCreator = null,
  respectIgnore = true,
  showDotFiles = true,
} = {}) {
  return async () => {
    const configs = getAllConfigs();
    const remoteItems = configs.map(config => ({
      fsPath: config.remotePath,
      getFs: () => getRemoteFs(getHostInfo(config)),
    }));

    const selected = await listFiles(remoteItems, {
      filter: filterCreator ? filterCreator(configs) : undefined,
    });

    if (!selected) {
      return;
    }

    const config = configs.find(cfg => paths.isSubpathOf(cfg.remotePath, selected.fsPath));
    const localTarget = paths.toLocal(
      path.relative(config.remotePath, selected.fsPath),
      config.context
    );

    const ignore = Ignore.from(config.ignore);
    const remoteContxt = config.remotePath;

    const ignoreFunc = fsPath => {
      // $fix
      const relativePath = upath.relative(remoteContxt, fsPath);

      // skip root
      return relativePath !== '' && ignore.ignores(relativePath);
    };

    try {
      await download(localTarget, {
        ...config,
        remotePath: selected.fsPath,
        ignore: respectIgnore ? ignoreFunc : undefined,
      });
      if (selected.type === FileType.Directory) {
        await refreshExplorer();
        await focusOpenEditors();
      } else {
        showTextDocument(localTarget);
      }
    } catch (error) {
      output.debug(error);
    }
  };
}

export const listAllCommand = createCommand(createList({
  respectIgnore: false,
}));

export const listCommand = createCommand(createList({
  filterCreator: configIngoreCreator,
  respectIgnore: true,
}));
