import * as vscode from 'vscode';
import { FileSystem, FileType } from '../core/fs';
import * as path from 'path';

const ROOT = '@root';

interface IFileLookUp {
  [x: string]: IFilePickerItem[];
}

interface IFilePickerOption {
  type?: FileType;
}

interface IFilePickerItem {
  name: string;
  fsPath: string;
  parentFsPath: string;
  type: FileType;
  description: string;

  getFs?: () => Promise<FileSystem>;
  filter: (x: string) => boolean;

  // config index
  index: number;
}

async function showFiles(
  fileLookUp: IFileLookUp,
  parent: IFilePickerItem | null,
  files: IFilePickerItem[],
  option: IFilePickerOption = {}
) {
  let avalibleFiles = files;
  let filter;
  if (option.type === FileType.Directory) {
    filter = file => file.type === FileType.Directory;
  } else {
    // don't show SymbolicLink
    filter = file => file.type !== FileType.SymbolicLink;
  }
  if (parent && parent.filter) {
    const oldFilter = filter;
    filter = file => {
      return oldFilter(file) && parent.filter(file);
    };
  }
  avalibleFiles = avalibleFiles.filter(file => {
    if (file.name === '.' || file.name === '..') {
      return true;
    }

    return filter(file);
  });

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
    placeHolder: 'Select a target...',
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
      filter: selectedValue.filter,
      index: selectedValue.index,
    }));

    subItems.unshift({
      name: '..',
      fsPath: selectedValue.parentFsPath,
      parentFsPath: '#will never reach here, cause the dir has alreay be cached#',
      type: FileType.Directory,
      description: 'go back',
      getFs: selectedValue.getFs,
      filter: selectedValue.filter,
      index: selectedValue.index,
    });

    if (allowChooseFolder) {
      subItems.unshift({
        name: '.',
        fsPath: selectedPath,
        parentFsPath: selectedValue.parentFsPath,
        type: FileType.Directory,
        description: 'choose current folder',
        getFs: selectedValue.getFs,
        filter: selectedValue.filter,
        index: selectedValue.index,
      });
    }

    fileLookUp[selectedPath] = subItems;
    return showFiles(fileLookUp, selectedValue, subItems, option);
  });
}

export function listFiles(
  items: Array<{
    name?: string;
    description: string;
    fsPath: string;
    getFs: () => Promise<FileSystem>;
    filter: (x: string) => boolean;
    index: number;
  }>,
  option?: IFilePickerOption
) {
  const baseItems = items.map(item => ({
    ...item,
    name: item.name || item.fsPath,
    parentFsPath: ROOT,
    type: FileType.Directory,
  }));
  const fileLookUp = {
    [ROOT]: baseItems,
  };
  return showFiles(fileLookUp, null, baseItems, option);
}
