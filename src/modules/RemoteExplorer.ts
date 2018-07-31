import * as vscode from 'vscode';
import RemoteTreeData, { ExplorerItem } from './RemoteTreeData';
import {
  COMMAND_REMOTEEXPLORER_REFRESH,
  COMMAND_REMOTEEXPLORER_SHOWRESOURCE,
  COMMAND_REMOTEEXPLORER_REVEALRESOURCE,
} from '../constants';

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
    vscode.commands.registerCommand(COMMAND_REMOTEEXPLORER_SHOWRESOURCE, resource =>
      this._openResource(resource)
    );
    vscode.commands.registerCommand(COMMAND_REMOTEEXPLORER_REVEALRESOURCE, () => this._reveal());
  }

  findRoot(uri: vscode.Uri) {
    return this._treeDataProvider.findRoot(uri);
  }

  refresh(item?: ExplorerItem | vscode.Uri) {
    // todo: check refresh
    this._treeDataProvider.refresh(item);
  }

  private _refreshSelection() {
    if (this._explorerView.selection.length) {
      this._explorerView.selection.forEach(item => this.refresh(item));
    } else {
      this.refresh();
    }
  }

  private _openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }

  private _reveal(): Thenable<void> {
    const item = this._getItemFromActiveEditor();
    return item ? this._explorerView.reveal(item) : null;
  }

  private _getItemFromActiveEditor(): ExplorerItem {
    if (!vscode.window.activeTextEditor) {
      return null;
    }

    const uri = vscode.window.activeTextEditor.document.uri;
    if (uri.scheme === 'remote') {
      return { resourceUri: uri, isDirectory: false };
    }
  }
}
