import * as vscode from 'vscode';
import { showTextDocument } from '../host';
import UResource from '../core/UResource';
import { toRemotePath } from '../helper';
import { getConfig } from './config';
import RemoteTreeData, { ExplorerItem } from './RemoteTreeData';
import { COMMAND_REMOTEEXPLORER_REFRESH, COMMAND_SHOWRESOURCE } from '../constants';

export default class RemoteExplorer {
  private _explorerView: vscode.TreeView<ExplorerItem>;
  private _treeDataProvider: RemoteTreeData;

  constructor(context: vscode.ExtensionContext) {
    this._treeDataProvider = new RemoteTreeData();
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider('remote', this._treeDataProvider)
    );

    this._explorerView = vscode.window.createTreeView('remoteExplorer', {
      treeDataProvider: this._treeDataProvider,
    });

    vscode.commands.registerCommand(COMMAND_REMOTEEXPLORER_REFRESH, () => this._refreshSelection());
    vscode.commands.registerCommand(COMMAND_SHOWRESOURCE, resource => this._openResource(resource));
  }

  refresh(item?: ExplorerItem) {
    if (item.resourceUri.scheme !== 'remote') {
      item.resourceUri = this._remoteUri(item.resourceUri);
    }

    this._treeDataProvider.refresh(item);
  }

  reveal(uri: vscode.Uri): Thenable<void> {
    return uri
      ? this._explorerView.reveal({
          resourceUri: uri,
          isDirectory: false,
        })
      : null;
  }

  findRoot(remoteUri: vscode.Uri) {
    return this._treeDataProvider.findRoot(remoteUri);
  }

  private _remoteUri(localUri: vscode.Uri) {
    const localPath = localUri.fsPath;
    const config = getConfig(localPath);
    const remotePath = toRemotePath(localPath, config.context, config.remotePath);
    return UResource.makeRemoteUri({
      host: config.host,
      port: config.port,
      remotePath,
      rootId: config.id,
    });
  }

  private _refreshSelection() {
    if (this._explorerView.selection.length) {
      this._explorerView.selection.forEach(item => this.refresh(item));
    } else {
      this.refresh();
    }
  }

  private _openResource(resource: vscode.Uri): void {
    showTextDocument(resource);
  }
}
