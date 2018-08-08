import * as vscode from 'vscode';
import { showTextDocument } from '../host';
import UResource, { Resource } from '../core/UResource';
import { toRemotePath } from '../helper';
import { REMOTE_SCHEME } from '../constants';
import { getConfig } from './config';
import RemoteTreeData, { ExplorerItem } from './RemoteTreeData';
import { COMMAND_REMOTEEXPLORER_REFRESH, COMMAND_SHOWRESOURCE } from '../constants';

export default class RemoteExplorer {
  private _explorerView: vscode.TreeView<ExplorerItem>;
  private _treeDataProvider: RemoteTreeData;

  constructor(context: vscode.ExtensionContext) {
    this._treeDataProvider = new RemoteTreeData();
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(REMOTE_SCHEME, this._treeDataProvider)
    );

    this._explorerView = vscode.window.createTreeView('remoteExplorer', {
      treeDataProvider: this._treeDataProvider,
    });

    vscode.commands.registerCommand(COMMAND_REMOTEEXPLORER_REFRESH, () => this._refreshSelection());
    vscode.commands.registerCommand(COMMAND_SHOWRESOURCE, (resource: Resource) =>
      this._openResource(resource)
    );
  }

  refresh(item?: ExplorerItem) {
    if (!item.resource.isRemote) {
      const localPath = item.resource.fsPath;
      const config = getConfig(localPath);
      const remotePath = toRemotePath(localPath, config.context, config.remotePath);
      item.resource = UResource.makeResource({
        remote: {
          host: config.host,
          port: config.port,
        },
        fsPath: remotePath,
        remoteId: config.id,
      });
    }

    this._treeDataProvider.refresh(item);
  }

  reveal(item: ExplorerItem): Thenable<void> {
    return item ? this._explorerView.reveal(item) : null;
  }

  findRoot(remoteUri: vscode.Uri) {
    return this._treeDataProvider.findRoot(remoteUri);
  }

  private _refreshSelection() {
    if (this._explorerView.selection.length) {
      this._explorerView.selection.forEach(item => this.refresh(item));
    } else {
      this.refresh();
    }
  }

  private _openResource(resource: Resource): void {
    showTextDocument(resource.uri);
  }
}
