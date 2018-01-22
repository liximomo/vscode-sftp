import * as vscode from 'vscode';
import FileSystem, { IFileEntry, FileType } from '../model/Fs/FileSystem';
import { getAllConfigs } from '../modules/config';

const ROOT = '@root';

interface IFileLookUp {
  [x: string]: IFilePickerItem[];
}

interface IFilePickerOption {
  type?: FileType;
  filter?: (file: IFilePickerItem) => boolean;
}

interface IFilePickerItem {
  fsPath: string;
  type: FileType;
  isTop?: boolean;
  getFs?: () => Promise<FileSystem>;
}

async function showFiles(
  fileLookUp: IFileLookUp,
  parent: IFilePickerItem | null,
  files: IFilePickerItem[],
  fs: FileSystem | null,
  option: IFilePickerOption = {}
) {
  let avalibleFiles = files.slice();
  let fileFilter;
  if (option.type === FileType.Directory) {
    fileFilter = file => file.type === FileType.Directory;
  } else {
    // don't show SymbolicLink
    fileFilter = file => file.type !== FileType.SymbolicLink;
  }

  if (option.filter !== undefined) {
    fileFilter = file => fileFilter(file) && option.filter(file);
  }

  avalibleFiles = avalibleFiles.filter(fileFilter);

  const isRoot = parent === null || parent.fsPath === ROOT;

  const items = avalibleFiles
    .map(file => ({
      value: file,
      label: file.fsPath,
      description: '',
    }))
    .sort((l, r) => l.label.localeCompare(r.label));

  // no limit or limit to dir, so we can choose current folder
  const allowChooseFolder = option.type === undefined || option.type === FileType.Directory;

  if (!isRoot) {
    // fs will nerver be null if current is not root
    const parentLookup = parent.isTop ? ROOT : fs.pathResolver.resolve(parent.fsPath, '..');

    items.unshift({
      value: {
        fsPath: parentLookup,
        type: FileType.Directory,
      },
      label: '..',
      description: 'go back',
    });

    if (allowChooseFolder) {
      items.unshift({
        value: parent,
        label: '.',
        description: ' choose current foler',
      });
    }
  }

  const result = await vscode.window.showQuickPick(items, {
    ignoreFocusOut: true,
    placeHolder: 'Select a target...(ESC to cancel)',
  });

  if (result === undefined) {
    return;
  }

  if (allowChooseFolder) {
    if (result.label === '.') {
      return result.value;
    }
  }

  // select a file
  if (result.value.type === FileType.File) {
    return result.value;
  }

  const targetPath = result.value.fsPath;
  // fs will be nerver be null if current is root, so get fs from picker item
  const fileSystem = fs ? fs : await result.value.getFs();

  const nextItems = fileLookUp[targetPath];
  if (nextItems !== undefined) {
    return showFiles(fileLookUp, result.value, nextItems, fileSystem, option);
  }

  return fileSystem.list(targetPath).then(subFiles => {
    const subItems = subFiles.map(file => ({
      fsPath: file.fspath,
      type: file.type,
    }));
    fileLookUp[targetPath] = subItems;
    return showFiles(fileLookUp, result.value, subItems, fileSystem, option);
  });
}

export function listFiles(
  items: Array<{ fsPath: string; getFs?: () => Promise<FileSystem> }>,
  option: IFilePickerOption
) {
  const baseItems = items.map(item => ({
    fsPath: item.fsPath,
    type: FileType.Directory,
    isTop: true,
    getFs: item.getFs,
  }));
  const fileLookUp = {
    [ROOT]: baseItems,
  };
  return showFiles(fileLookUp, null, baseItems, null, option);
}

export function selectContext(): Promise<string> {
  return new Promise((resolve, reject) => {
    const configs = getAllConfigs();
    const projectsList = configs
      .map(cfg => ({
        value: cfg.context,
        label: vscode.workspace.asRelativePath(cfg.context),
        description: '',
        detail: cfg.context,
      }))
      .sort((l, r) => l.label.localeCompare(r.label));

    vscode.window
      .showQuickPick(projectsList, {
        ignoreFocusOut: true,
        placeHolder: 'Select a folder...(ESC to cancel)',
      })
      .then(selection => {
        if (selection) {
          resolve(selection.value);
          return;
        }

        // cancel selection
        return null;
      }, reject);
  });
}
