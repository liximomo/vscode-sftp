import * as vscode from 'vscode';
import FileSystem, { FileType } from '../model/Fs/FileSystem';
import { getAllConfigs } from '../modules/config';
import * as path from 'path';

const ROOT = '@root';

interface IFileLookUp {
  [x: string]: IFilePickerItem[];
}

interface IFilePickerOption {
  type?: FileType;
  filter?: (file: IFilePickerItem) => boolean;
}

interface IFilePickerItem {
  name: string;
  fsPath: string;
  parentFsPath: string;
  type: FileType;
  description: string,

  // config index
  index: number,
  getFs?: () => Promise<FileSystem>;
}

async function showFiles(
  fileLookUp: IFileLookUp,
  parent: IFilePickerItem | null,
  files: IFilePickerItem[],
  option: IFilePickerOption = {}
) {
  let avalibleFiles = files.slice();
  let filter;
  let fileFilter
  if (option.type === FileType.Directory) {
    fileFilter = file => file.type === FileType.Directory;
  } else {
    // don't show SymbolicLink
    fileFilter = file => file.type !== FileType.SymbolicLink;
  }

  if (option.filter !== undefined) {
    filter = file => {
      return fileFilter(file) && option.filter(file);
    };
  } else {
    filter = fileFilter;
  }

  avalibleFiles = avalibleFiles.filter(filter);

  const items = avalibleFiles
    .map(file => ({
      value: file,
      label: file.name,
      description: file.description,
    }))
    .sort((l, r) => {
      if (l.value.type === r.value.type) {
        return l.label.localeCompare(r.label);
      } else if (l.value.type === FileType.Directory) {
        // dir goes to first
        return -1;
      } else {
        return 1;
      }
    });

  const result = await vscode.window.showQuickPick(items, {
    ignoreFocusOut: true,
    placeHolder: 'Select a target...(ESC to cancel)',
  });

  if (result === undefined) {
    return;
  }

  // no limit or limit to dir, so we can choose current folder
  const allowChooseFolder = option.type === undefined || option.type === FileType.Directory;

  if (allowChooseFolder) {
    if (result.label === '.') {
      return result.value;
    }
  }

  // select a file
  if (result.value.type === FileType.File) {
    return result.value;
  }

  const selectedValue = result.value;
  const selectedPath = selectedValue.fsPath;
  // fs will be nerver be null if current is root, so get fs from picker item
  const fileSystem = await selectedValue.getFs();

  const nextItems = fileLookUp[selectedPath];
  if (nextItems !== undefined) {
    return showFiles(fileLookUp, selectedValue, nextItems, option);
  }

  return fileSystem.list(selectedPath).then(subFiles => {
    const subItems = subFiles.map(file => ({
      name: path.basename(file.fspath) + (file.type === FileType.Directory ? '/' : ''),
      fsPath: file.fspath,
      parentFsPath: selectedPath,
      type: file.type,
      description: '',
      getFs: selectedValue.getFs,
      index: selectedValue.index,
    }));

    subItems.unshift({
      name: '..',
      fsPath: selectedValue.parentFsPath,
      parentFsPath: '#will never reach here, cause the dir has alreay be cached#',
      type: FileType.Directory,
      description: 'go back',
      getFs: selectedValue.getFs,
      index: selectedValue.index,
    });

    if (allowChooseFolder) {
      subItems.unshift({
        name: '.',
        fsPath: selectedPath,
        parentFsPath: selectedValue.parentFsPath,
        type: FileType.Directory,
        description: ' choose current foler',
        getFs: selectedValue.getFs,
        index: selectedValue.index,
      });
    }

    fileLookUp[selectedPath] = subItems;
    return showFiles(fileLookUp, selectedValue, subItems, option);
  });
}

export function listFiles(
  items: Array<{ description: string, fsPath: string; getFs?: () => Promise<FileSystem>, index: number }>,
  option: IFilePickerOption
) {
  const baseItems = items.map(item => ({
    name: item.fsPath,
    fsPath: item.fsPath,
    parentFsPath: ROOT,
    type: FileType.Directory,
    description: item.description,
    getFs: item.getFs,
    index: item.index,
  }));
  const fileLookUp = {
    [ROOT]: baseItems,
  };
  return showFiles(fileLookUp, null, baseItems, option);
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
