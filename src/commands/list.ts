import * as vscode from 'vscode';
import * as path from 'path';
import createCommand from '../helper/createCommand';
import { selectContext, listFiles } from '../helper/select';
import * as paths from '../helper/paths';
import * as output from '../modules/output';
import upath from '../modules/upath';
import { getConfig, getAllConfigs } from '../modules/config';
import { download } from '../modules/sync';
import { getHostInfo } from '../modules/config';
import getRemoteFs from '../modules/remoteFs';
import Ignore from '../modules/Ignore';
import { FileType } from '../model/Fs/FileSystem';
import { debug } from '../modules/output';

function isContainPath(pathname, contained) {
  path.normalize(pathname).indexOf(path.normalize(contained));
}

function createList(filterCreator?) {
  return async () => {
    const configs = getAllConfigs();
    const remoteItems = configs.map(config => ({
      fsPath: config.remotePath,
      getFs: () => getRemoteFs(getHostInfo(config)),
    }));

    const selected = await listFiles(remoteItems, {
      filter: filterCreator ? filterCreator(configs) : undefined,
    });

    const config = configs.find(cfg => paths.isSubpathOf(cfg.remotePath, selected.fsPath));
    const localTarget = paths.toLocal(
      path.relative(config.remotePath, selected.fsPath),
      config.context
    );

    try {
      await download(localTarget, {
        ...config,
        remotePath: selected.fsPath,
        ignore: undefined, // $todo $fix 分开两个命令 目前这样会导致 list 下下载目录不遵从 ignore remove ignore
      });
    } catch (error) {
      output.debug(error);
    }
  };
}

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

    // $todo 确保优化相对路径不出错，upath 会导致 unix 有效的\\文件名被转化成路径分割符
    const relativePath = upath.relative(filterConfig.context, file.fsPath);
    if (relativePath === '') {
      return true;
    }

    return filterConfig.filter(upath.relative(filterConfig.context, file.fsPath));
  };
  return filter;
};

export const listAllCommand = createCommand(createList());

export const listCommand = createCommand(createList(configIngoreCreator));
