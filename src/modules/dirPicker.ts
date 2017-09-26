import * as vscode from 'vscode';
import FileSystem, { IFileEntry, FileType } from '../model/Fs/FileSystem';

const ROOT = '@root';

interface IFileLookUp {
  [x: string]: IFilePickerItem[]
};

interface IFilePickerOption {
  type?: FileType,
  filter?: (file: IFilePickerItem) => boolean,
};

interface IFilePickerItem {
  fspath: string,
  type: FileType,
};

function showFiles(
  fileLookUp: IFileLookUp,
  isTop: (x: string) => boolean,
  parent: string | null,
  files: IFilePickerItem[],
  fs: FileSystem,
  option: IFilePickerOption = {}
) {
  let avalibleFiles = files.slice();
  const filterCreator = filter => file => filter(file) && option.filter ? option.filter(file) : true;
  let fileFilter;
  if (option.type !== undefined && option.type === FileType.Directory) {
    fileFilter = filterCreator(file => file.type === FileType.Directory);
  }

  if (fileFilter) {
    avalibleFiles = avalibleFiles.filter(fileFilter);
  }

  const isRoot = parent === ROOT;

  const items = avalibleFiles.map(file => ({
    value: file,
    label: file.fspath,
    description: '',
  }))
  .sort((l, r) => l.label.localeCompare(r.label));

  if (!isRoot) {
    const parentLookup = isTop(parent) ? ROOT : fs.pathResolver.resolve(parent, '..');

    items.unshift({
      value: {
        fspath: parentLookup,
        type: FileType.Directory,
      },
      label: '..',
      description: 'go back',
    });
    items.unshift({
      value: {
        fspath: parent,
        type: FileType.Directory,
      },
      label: '.',
      description: ' choose current foler',
    });
  }

  return vscode.window
    .showQuickPick(items, {
      ignoreFocusOut: true,
      placeHolder: 'Select a folder...(ESC to cancel)',
    })
    .then(result => {
      if (result === undefined) {
        return;
      }

      if (option.type === FileType.Directory) {
        if (result.label === '.') {
          return result.value;
        }
      } else {
        if (result.value.type === FileType.File) {
          return result.value;
        }
      }

      const targetPath = result.value.fspath;
      const nextItems = fileLookUp[targetPath];
      if (nextItems !== undefined) {
        return  showFiles(fileLookUp, isTop, targetPath, nextItems, fs, option);
      }

      return fs.list(targetPath)
        .then(subFiles =>  {
          const subItems = subFiles.map(file => ({
            fspath: file.fspath,
            type: file.type,
          }));
          fileLookUp[targetPath] = subItems;
          return showFiles(fileLookUp, isTop, targetPath, subItems, fs, option);
        });
    });
}

export default function filePicker(baseFile: IFilePickerItem[], fs: FileSystem, option: IFilePickerOption) {
  const filelookup = {
    [ROOT]: baseFile,
  };
  const isTop = file => baseFile.some(item => item.fspath === file);
  return showFiles(filelookup, isTop, ROOT, baseFile, fs, option);
}
