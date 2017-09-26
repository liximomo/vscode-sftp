import * as vscode from 'vscode';
import { newConfig } from '../modules/config';
import dirPicker from '../modules/dirPicker';
import localFs from '../modules/localFs';
import { FileType } from '../model/Fs/FileSystem';
import checkRequire from '../helper/checkRequire';
import getTopFolders from '../helper/getTopFolders';

function editConfig() {
  // TODO pick workspaceFolder
  const initDirs = getTopFolders(vscode.workspace.workspaceFolders).map(fspath => ({
    fspath,
    type: FileType.Directory,
  }));
  dirPicker(initDirs, localFs, {
    type: FileType.Directory,
    filter: file => !file.fspath.endsWith('.vscode'),
  }).then(result => {
    newConfig(result.fspath);
  });
}

export default checkRequire(editConfig);
