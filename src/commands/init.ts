import * as vscode from 'vscode';
import * as constants from '../constants';
import * as actions from '../actions';
import app from '../app';
import commandManager from './commandManager';
import {
  selectActivedFile,
  selectFolderFallbackToConfigContext,
  selectFile,
  selectFileFromAll,
  selectContext,
} from '../modules/targetSelectStrategy';
import localFs from '../modules/localFs';
import { getAllRawConfigs } from '../modules/config';
import { FileType } from '../core/Fs/FileSystem';
import * as output from '../ui/output';
import { showTextDocument, refreshExplorer, showInformationMessage } from '../host';

export default function init(context: vscode.ExtensionContext) {
  commandManager.createCommand(constants.COMMAND_CONFIG, 'config sftp', actions.editConfig);

  commandManager.createCommand(constants.COMMAND_TOGGLE_OUTPUT, 'toggle output', () => {
    output.toggle();
  });

  commandManager.createCommand(constants.COMMAND_SET_PROFILE, 'set profile', async () => {
    const profiles: Array<vscode.QuickPickItem & { value: string }> = getAllRawConfigs().reduce(
      (acc, config) => {
        if (!config.profiles) {
          return acc;
        }

        Object.keys(config.profiles).forEach(key => {
          acc.push({
            value: key,
            label: app.state.profile === key ? `${key} (active)` : key,
          });
        });
        return acc;
      },
      [
        {
          label: 'UNSET',
        },
      ]
    );

    if (profiles.length <= 1) {
      showInformationMessage('No Avaliable Profile.');
      return;
    }

    const item = await vscode.window.showQuickPick(profiles, { placeHolder: 'select a profile' });
    if (item === undefined) return;

    app.state.profile = item.value;
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

  commandManager
    .createFileCommand(constants.COMMAND_UPLOAD, 'upload', actions.upload, selectActivedFile, true)
    .onCommandDone((uri, uris) => {
      if (uri) {
        app.remoteExplorer.refresh(uri);
      } else {
        uris.forEach(i => app.remoteExplorer.refresh(i));
      }
    });

  commandManager.createFileCommand(
    constants.COMMAND_UPLOAD_PROJECT,
    'upload project',
    actions.upload,
    selectContext,
    false
  );

  commandManager
    .createFileCommand(
      constants.COMMAND_DOWNLOAD,
      'download',
      actions.download,
      selectActivedFile,
      true
    )
    .onCommandDone(refreshExplorer);

  commandManager
    .createFileCommand(
      constants.COMMAND_DOWNLOAD_PROJECT,
      'download project',
      actions.download,
      selectContext,
      false
    )
    .onCommandDone(refreshExplorer);

  commandManager
    .createFileCommand(
      constants.COMMAND_LIST_ALL,
      '(list) download',
      async (localPath, remotePath, config) => {
        await actions.downloadWithoutIgnore(localPath, remotePath, config);
        const fileEntry = await localFs.lstat(localPath);
        if (fileEntry.type !== FileType.Directory) {
          await showTextDocument(localPath);
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
      async (localPath, remotePath, config) => {
        await actions.download(localPath, remotePath, config);
        const fileEntry = await localFs.lstat(localPath);
        if (fileEntry.type !== FileType.Directory) {
          await showTextDocument(localPath);
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
    selectActivedFile,
    true
  );

  commandManager.createFileCommand(
    constants.COMMAND_REMOTEEXPLORER_OPENINLOCAL,
    'open in local',
    async (localPath, remotePath, config) => {
      await actions.download(localPath, remotePath, config);
      await showTextDocument(localPath, { preview: false });
    },
    selectActivedFile,
    true
  );

  commandManager.registerAll(context);
}
