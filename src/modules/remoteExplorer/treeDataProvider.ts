import * as vscode from 'vscode';
import { upath, UResource, Resource, FileService, FileType } from '../../core';
import { COMMAND_REMOTEEXPLORER_VIEW_CONTENT, COMMAND_REMOTEEXPLORER_EDITINLOCAL } from '../../constants';
import { getAllFileService } from '../serviceManager';
import { getExtensionSetting } from '../../helper';

type Id = number;

interface ExplorerChild {
  resource: Resource;
  isDirectory: boolean;
}

export interface ExplorerRoot extends ExplorerChild {
  explorerContext: {
    fileService: FileService;
    id: Id;
  };
}

export type ExplorerItem = ExplorerRoot | ExplorerChild;

function dirFirstSort(fileA: ExplorerItem, fileB: ExplorerItem) {
  if (fileA.isDirectory === fileB.isDirectory) {
    return fileA.resource.fsPath.localeCompare(fileB.resource.fsPath);
  }

  return fileA.isDirectory ? -1 : 1;
}

export default class RemoteTreeData
  implements vscode.TreeDataProvider<ExplorerItem>, vscode.TextDocumentContentProvider {
  private _roots: ExplorerRoot[];
  private _rootsMap: Map<Id, ExplorerRoot>;
  private _onDidChangeFolder: vscode.EventEmitter<ExplorerItem> = new vscode.EventEmitter<
    ExplorerItem
  >();
  private _onDidChangeFile: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChangeTreeData: vscode.Event<ExplorerItem> = this._onDidChangeFolder.event;
  readonly onDidChange: vscode.Event<vscode.Uri> = this._onDidChangeFile.event;

  // FIXME: refresh can't work for user created ExplorerItem
  async refresh(item?: ExplorerItem): Promise<any> {
    // refresh root
    if (!item) {
      // clear cache
      this._roots = null;
      this._rootsMap = null;

      this._onDidChangeFolder.fire();
      return;
    }

    if (item.isDirectory) {
      this._onDidChangeFolder.fire(item);

      // refresh top level files as well
      const children = await this.getChildren(item);
      children.filter(i => !i.isDirectory).forEach(i => this._onDidChangeFile.fire(i.resource.uri));
    } else {
      this._onDidChangeFile.fire(item.resource.uri);
    }
  }

  getTreeItem(item: ExplorerItem): vscode.TreeItem {
    const isRoot = (item as ExplorerRoot).explorerContext !== undefined;
    let customLabel;
    if (isRoot) {
      customLabel = (item as ExplorerRoot).explorerContext.fileService.name;
      if (!customLabel) {
        customLabel = upath.basename(item.resource.fsPath);
      }
    }
    return {
      ...(customLabel
        ? {
            label: customLabel,
          }
        : {}),
      resourceUri: item.resource.uri,
      collapsibleState: item.isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : undefined,
      contextValue: isRoot ? 'root' : item.isDirectory ? 'folder' : 'file',
      command: item.isDirectory
        ? undefined
        : {
            command: getExtensionSetting().downloadWhenOpenInRemoteExplorer
              ? COMMAND_REMOTEEXPLORER_EDITINLOCAL
              : COMMAND_REMOTEEXPLORER_VIEW_CONTENT,
            arguments: [item],
            title: 'View Remote Resource',
          },
    };
  }

  async getChildren(item?: ExplorerItem): Promise<ExplorerItem[]> {
    if (!item) {
      return this._getRoots();
    }

    const root = this.findRoot(item.resource.uri);
    if (!root) {
      throw new Error(`Can't find config for remote resource ${item.resource.uri}.`);
    }
    const remotefs = await root.explorerContext.fileService.getRemoteFileSystem();
    const fileEntries = await remotefs.list(item.resource.fsPath);

    return fileEntries
      .map(file => {
        const isDirectory = file.type === FileType.Directory;

        return {
          resource: UResource.updateResource(item.resource, {
            remotePath: file.fspath,
          }),
          isDirectory,
        };
      })
      .sort(dirFirstSort);
  }

  getParent(item: ExplorerChild): ExplorerItem {
    const resourceUri = item.resource.uri;
    const root = this.findRoot(resourceUri);
    if (!root) {
      throw new Error(`Can't find config for remote resource ${resourceUri}.`);
    }

    if (item.resource.fsPath === root.resource.fsPath) {
      return null;
    }

    return {
      resource: UResource.updateResource(item.resource, {
        remotePath: upath.dirname(item.resource.fsPath),
      }),
      isDirectory: true,
    };
  }

  findRoot(uri: vscode.Uri): ExplorerRoot {
    if (!this._rootsMap) {
      return null;
    }

    const rootId = UResource.makeResource(uri).remoteId;
    return this._rootsMap.get(rootId);
  }

  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<string> {
    const root = this.findRoot(uri);
    if (!root) {
      throw new Error(`Can't find remote for resource ${uri}.`);
    }

    const remotefs = await root.explorerContext.fileService.getRemoteFileSystem();
    const buffer = await remotefs.readFile(
      UResource.makeResource(uri).fsPath || remotefs.pathResolver.normalize(uri.fsPath)
    );
    return buffer.toString();
  }

  private _getRoots(): ExplorerRoot[] {
    if (this._roots) {
      return this._roots;
    }

    this._roots = [];
    this._rootsMap = new Map();
    getAllFileService().forEach(fileService => {
      const config = fileService.getConfig();
      const id = fileService.id;
      const item = {
        resource: UResource.makeResource({
          remote: {
            host: config.host,
            port: config.port,
          },
          fsPath: config.remotePath,
          remoteId: id,
        }),
        isDirectory: true,
        explorerContext: {
          fileService,
          id,
        },
      };
      this._roots.push(item);
      this._rootsMap.set(id, item);
    });
    return this._roots;
  }
}
