import * as vscode from 'vscode';
import { FileSystem, FileType } from '../core';
import * as path from 'path';

const ROOT = '@root';

interface IFileLookUp<T> {
  [x: string]: T[];
}

interface IFilePickerOption {
  type?: FileType;
}

interface FileListChildItem extends FileListItem {
  parentFsPath: string;
}

interface FileListItem {
  name: string;
  fsPath: string;
  type: FileType;

  description: string;

  getFs?: (() => Promise<FileSystem>) | FileSystem;
  filter?: (x: string) => boolean;
}

async function showFiles<T extends FileListChildItem>(
  fileLookUp: IFileLookUp<T>,
  parent: T | null,
  files: T[],
  option: IFilePickerOption = {}
): Promise<T> {
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
  const fileSystem =
    typeof selectedValue.getFs === 'function' ? await selectedValue.getFs() : selectedValue.getFs;

  const nextItems = fileLookUp[selectedPath];
  if (nextItems !== undefined) {
    return showFiles(fileLookUp, selectedValue, nextItems, option);
  }

  return fileSystem.list(selectedPath).then(subFiles => {
    const subItems = subFiles.map(file =>
      Object.assign({}, selectedValue, {
        name: path.basename(file.fspath) + (file.type === FileType.Directory ? '/' : ''),
        fsPath: file.fspath,
        parentFsPath: selectedPath,
        type: file.type,
        description: '',
      })
    );

    subItems.unshift(
      Object.assign({}, selectedValue, {
        name: '..',
        fsPath: selectedValue.parentFsPath,
        parentFsPath: '#will never reach here, cause the dir has alreay be cached#',
        type: FileType.Directory,
        description: 'go back',
      })
    );

    if (allowChooseFolder) {
      subItems.unshift(
        Object.assign({}, selectedValue, {
          name: '.',
          fsPath: selectedPath,
          parentFsPath: selectedValue.parentFsPath,
          type: FileType.Directory,
          description: 'choose current folder',
        })
      );
    }

    fileLookUp[selectedPath] = subItems;
    return showFiles(fileLookUp, selectedValue, subItems, option);
  });
}

export function listFiles<T extends FileListItem>(
  items: T[],
  option?: IFilePickerOption
): Promise<T & FileListChildItem> {
  const baseItems = items.map(item => Object.assign({}, item, { parentFsPath: ROOT }));
  const fileLookUp = {
    [ROOT]: baseItems,
  };
  return showFiles(fileLookUp, null, baseItems, option);
}
