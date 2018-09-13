import { Uri, window } from 'vscode';
import { UResource, FileService, fs } from '../core';
import { getAllFileService } from '../modules/serviceManager';
import { ExplorerItem } from '../modules/remoteExplorer';
import app from '../app';
import { getActiveTextEditor } from '../host';
import { listFiles, toLocalPath, simplifyPath } from '../helper';

// NEED_VSCODE_UPDATE: detect explorer view visible
// refresh will open explorer view which cause a problem https://github.com/liximomo/vscode-sftp/issues/286
export function refreshLocalExplorer(localUri: Uri) {
  // do nothing
}

export async function refreshRemoteExplorer(target: UResource, isDirectory: FileService | boolean) {
  if (isDirectory instanceof FileService) {
    const fileService = isDirectory;
    const localFs = fileService.getLocalFileSystem();
    const fileEntry = await localFs.lstat(target.localFsPath);
    isDirectory = fileEntry.type === fs.FileType.Directory;
  }

  app.remoteExplorer.refresh({
    resource: UResource.makeResource(target.remoteUri),
    isDirectory,
  });
}

export function selectContext(): Promise<Uri> {
  return new Promise((resolve, reject) => {
    const sercives = getAllFileService();
    const projectsList = sercives
      .map(service => ({
        value: service.baseDir,
        label: service.name || simplifyPath(service.baseDir),
        description: '',
        detail: service.baseDir,
      }))
      .sort((l, r) => l.label.localeCompare(r.label));

    // if (projectsList.length === 1) {
    // return resolve(projectsList[0].value);
    // }

    window
      .showQuickPick(projectsList, {
        placeHolder: 'Select a folder...',
      })
      .then(selection => {
        if (selection) {
          return resolve(Uri.file(selection.value));
        }

        // cancel selection
        resolve(null);
      }, reject);
  });
}

function configIngoreFilterCreator(config) {
  if (!config || !config.ignore) {
    return null;
  }

  return file => !config.ignore(file.fsPath);
}

function createFileSelector({ filterCreator = null } = {}) {
  return async (): Promise<Uri> => {
    const serviceList = getAllFileService();
    const remoteItems = serviceList.map((fileService, index) => {
      const config = fileService.getConfig();
      return {
        name: config.name,
        description: config.host,
        fsPath: config.remotePath,
        filter: filterCreator ? filterCreator(config) : undefined,
        getFs: () => fileService.getRemoteFileSystem(),
        index,
      };
    });

    const selected = await listFiles(remoteItems);

    if (!selected) {
      return;
    }

    const targetService = serviceList[selected.index];
    const localTarget = toLocalPath(
      selected.fsPath,
      targetService.remoteBaseDir,
      targetService.baseDir
    );

    return Uri.file(localTarget);
  };
}

export function getActiveDocumentUri() {
  const active = getActiveTextEditor();
  if (!active || !active.document) {
    return null;
  }

  return active.document.uri;
}

// selected file or activeTarget or configContext
export function uriFromExplorerContextOrEditorContext(item, items): Promise<Uri | Uri[]> {
  // from explorer or editor context
  if (item instanceof Uri) {
    if (Array.isArray(items) && items[0] instanceof Uri) {
      // multi-select in explorer
      return Promise.resolve(items);
    } else {
      return Promise.resolve(item);
    }
  } else if ((item as ExplorerItem).resource) {
    // from remote explorer
    return Promise.resolve(item.resource.uri);
  }

  return null;
}

// selected folder or configContext
export function selectFolderFallbackToConfigContext(item, items): Promise<Uri | Uri[]> {
  // from explorer or editor context
  if (item) {
    if (item instanceof Uri) {
      if (Array.isArray(items) && items[0] instanceof Uri) {
        // multi-select in explorer
        return Promise.resolve(items);
      } else {
        return Promise.resolve(item);
      }
    } else if ((item as ExplorerItem).resource) {
      // from remote explorer
      return Promise.resolve(item.resource.uri);
    }
  }

  return selectContext();
}

// selected file from all remote files
export const selectFileFromAll = createFileSelector();

// selected file from remote files expect ignored
export const selectFile = createFileSelector({
  filterCreator: configIngoreFilterCreator,
});
