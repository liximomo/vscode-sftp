import * as vscode from 'vscode';
import * as output from '../modules/output';
import { getConfig, getAllConfigs } from '../modules/config';
import createCommand from '../helper/createCommand';

import { selectContext, listFiles } from '../helper/select';
import { getHostInfo } from '../modules/config';
import getRemoteFs from '../modules/remoteFs';
import { FileType } from '../model/Fs/FileSystem';

function createList(filter?) {
  return async () => {
    const configs = getAllConfigs();
    const remoteItems = configs.map(config => {
      return {
        fsPath: config.remotePath,
        getFs: () => getRemoteFs(getHostInfo(config)),
      };
    });

    const selectedFsPath = await listFiles(remoteItems, {
      filter,
    });

    output.debug('select ', selectedFsPath);
    console.log('select ', selectedFsPath);
  };
}

export const listAllCommand = createCommand(createList());
