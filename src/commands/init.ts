import * as vscode from 'vscode';
import * as constants from '../constants';
import * as actions from '../actions';
import app from '../app';
import upath from '../core/upath';
import UResource from '../core/UResource';
import { FileType } from '../core/Fs/FileSystem';
import {
  selectActivedFile,
  selectFolderFallbackToConfigContext,
  selectFile,
  selectFileFromAll,
  selectContext,
} from '../modules/targetSelectStrategy';
import localFs from '../modules/localFs';
import { getAllRawConfigs } from '../modules/config';
import * as output from '../ui/output';
import {
  executeCommand,
  showTextDocument,
  refreshExplorer,
  showInformationMessage,
  showConfirmMessage,
} from '../host';
import commandManager from './commandManager';

async function refreshRemoteOne(localUri, isDirectory?: boolean) {
  if (isDirectory === undefined) {
    const fileEntry = await localFs.lstat(localUri.fsPath);
    isDirectory = fileEntry.type === FileType.Directory;
  }

  app.remoteExplorer.refresh({
    fsPath: localUri.fsPath,
    resourceUri: localUri,
    isDirectory,
  });
}

function refreshRemoteExplorer(localUris) {
  localUris.forEach(uri => refreshRemoteOne(uri));
}

function refreshRemoteExplorerDir(localUris) {
  localUris.forEach(uri => refreshRemoteOne(uri, true));
}

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

  commandManager
    .createFileCommand(
      constants.COMMAND_SYNC_TO_REMOTE,
      'sync to remote',
      actions.sync2Remote,
      selectFolderFallbackToConfigContext,
      true
    )
    .onCommandDone(refreshRemoteExplorerDir);

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
    .onCommandDone(refreshRemoteExplorer);

  commandManager
    .createFileCommand(
      constants.COMMAND_UPLOAD_PROJECT,
      'upload project',
      actions.upload,
      selectContext,
      false
    )
    .onCommandDone(refreshRemoteExplorerDir);

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
      async (uResource: UResource, config: any) => {
        await actions.downloadWithoutIgnore(uResource, config);
        const fileEntry = await localFs.lstat(uResource.localUri.fsPath);
        if (fileEntry.type !== FileType.Directory) {
          await showTextDocument(uResource.localUri);
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
      async (uResource: UResource, config: any) => {
        await actions.download(uResource, config);
        const fileEntry = await localFs.lstat(uResource.localUri.fsPath);
        if (fileEntry.type !== FileType.Directory) {
          await showTextDocument(uResource.localUri);
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
    constants.COMMAND_DELETEREMOTE,
    'delete',
    actions.removeRemote,
    selectActivedFile,
    true
  );

  commandManager.createFileCommand(
    constants.UI_COMMAND_DELETEREMOTE,
    'delete(explorer)',
    async (uResource: UResource) => {
      await executeCommand(constants.COMMAND_DELETEREMOTE, uResource.localUri);
    },
    async item => {
      // from remote explorer context
      const uri: vscode.Uri = item.resourceUri;
      const result = await showConfirmMessage(
        `Are you sure you want to delete ${upath.basename(uri.path)}'?`,
        'Delete',
        'Cancel'
      );

      return result ? uri : null;
    },
    false
  );

  commandManager.createFileCommand(
    constants.COMMAND_REVEALINEXPLORER,
    'reveal in explorer',
    async (uResource: UResource, config: any) => {
      await executeCommand('revealInExplorer', uResource.localUri);
    },
    selectActivedFile,
    false
  );

  commandManager.createFileCommand(
    constants.COMMAND_REMOTEEXPLORER_EDITINLOCAL,
    'edit in local',
    async (uResource: UResource, config: any) => {
      await actions.download(uResource, config);
      await showTextDocument(uResource.localUri, { preview: true });
    },
    selectActivedFile,
    true
  );

  commandManager.createFileCommand(
    constants.COMMAND_REVEALRESOURCE,
    'reveal in remote explorer',
    async (uResource: UResource, config: any) => {
      app.remoteExplorer.reveal({
        fsPath: uResource.remoteFsPath,
        resourceUri: uResource.remoteUri,
        isDirectory: false,
      });
    },
    selectActivedFile,
    false
  );

  commandManager.registerAll(context);
}
