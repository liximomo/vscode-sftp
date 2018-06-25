import * as vscode from 'vscode';
import * as constants from '../constants';
import * as actions from '../actions';
import commandManager from './commandManager';
import {
  selectFileFallbackToConfigContext,
  selectFolderFallbackToConfigContext,
  selectFile,
  selectFileFromAll,
  selectFileOnly,
} from '../modules/targetSelectStrategy';
import localFs from '../modules/localFs';
import { getAllConfigs } from '../modules/config';
import appState from '../modules/appState';
import { FileType } from '../core/Fs/FileSystem';
import * as output from '../ui/output';
import { showTextDocument, refreshExplorer, showInformationMessage } from '../host';

export default function init(context: vscode.ExtensionContext) {
  commandManager.createCommand(constants.COMMAND_CONFIG, 'config sftp', actions.editConfig);

  commandManager.createCommand(constants.COMMAND_TOGGLE_OUTPUT, 'toggle output', () => {
    output.toggle();
  });

  commandManager.createCommand(constants.COMMAND_SET_PROFILE, 'set profile', async () => {
    const profiles: Array<vscode.QuickPickItem & { value: string }> = getAllConfigs().reduce(
      (acc, config) => {
        if (!config.profiles) {
          return acc;
        }

        Object.keys(config.profiles).forEach(key => {
          acc.push({
            value: key,
            label: appState.profile === key ? `${key} (active)` : key,
          });
        });
        return acc;
      },
      [{
        label: 'UNSET',
      }]
    );

    if (profiles.length <= 1) {
      showInformationMessage('No Avaliable Profile.');
      return;
    }

    const item = await vscode.window.showQuickPick(profiles, { placeHolder: 'select a profile' });
    if (item === undefined) return;

    appState.profile = item.value;
  });

  commandManager.createFileCommand(
    constants.COMMAND_SYNC_TO_REMOTE,
    'sync to remote',
    actions.sync2Remote,
    selectFolderFallbackToConfigContext,
    true
  );

  commandManager
    .createFileCommand(
      constants.COMMAND_SYNC_TO_LOCAL,
      'sync to local',
      actions.sync2Local,
      selectFolderFallbackToConfigContext,
      true
    )
    .onCommandDone(refreshExplorer);

  commandManager.createFileCommand(
    constants.COMMAND_UPLOAD,
    'upload',
    actions.upload,
    selectFileFallbackToConfigContext,
    true
  );

  commandManager
    .createFileCommand(
      constants.COMMAND_DOWNLOAD,
      'download',
      actions.download,
      selectFileFallbackToConfigContext,
      true
    )
    .onCommandDone(refreshExplorer);

  commandManager
    .createFileCommand(
      constants.COMMAND_LIST_ALL,
      '(list) download',
      async (fsPath, config) => {
        await actions.downloadWithoutIgnore(fsPath, config);
        const fileEntry = await localFs.lstat(fsPath);
        if (fileEntry.type !== FileType.Directory) {
          await showTextDocument(fsPath);
        }
      },
      selectFileFromAll,
      false
    )
    .onCommandDone(refreshExplorer);

  commandManager
    .createFileCommand(
      constants.COMMAND_LIST_DEFAULT,
      '(list) download',
      async (fsPath, config) => {
        await actions.download(fsPath, config);
        const fileEntry = await localFs.lstat(fsPath);
        if (fileEntry.type !== FileType.Directory) {
          await showTextDocument(fsPath);
        }
      },
      selectFile,
      false
    )
    .onCommandDone(refreshExplorer);

  commandManager.createFileCommand(
    constants.COMMAND_DIFF,
    'diff',
    actions.diff,
    selectFileOnly,
    true
  );

  commandManager.registerAll(context);
}
