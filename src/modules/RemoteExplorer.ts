import * as vscode from 'vscode';
import { showTextDocument } from '../host';
import { toRemotePath, toLocalPath } from '../helper';
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
    vscode.commands.registerCommand(COMMAND_SHOWRESOURCE, resource =>
      this._openResource(resource)
    );
  }

  refresh(item?: ExplorerItem) {
    if (item.resourceUri.scheme !== 'remote') {
      item.resourceUri = this.remoteUri(item.resourceUri);
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

  remoteUri(localUri: vscode.Uri, config?: any) {
    const localPath = localUri.fsPath;
    config = config || getConfig(localPath);
    const remotePath = toRemotePath(localPath, config.context, config.remotePath);
    return this._treeDataProvider.makeResourceUri({
      host: config.host,
      port: config.port,
      path: remotePath,
      id: config.id,
    });
  }

  findRoot(remoteUri: vscode.Uri) {
    return this._treeDataProvider.findRoot(remoteUri);
  }

  localUri(remoteUri: vscode.Uri, config) {
    const remoteContext = config.remotePath;
    const localContext = config.context;
    const localFilePath = toLocalPath(remoteUri.fsPath, remoteContext, localContext);
    return vscode.Uri.file(localFilePath);
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
