import * as vscode from 'vscode';
import FileSystem, { IFileEntry, FileType } from '../model/Fs/FileSystem';

const ROOT = '@root';

interface IFileLookUp {
  [x: string]: IFilePickerItem[]
};

interface IFilePickerOption {
  type: FileType,
};

interface IFilePickerItem {
  fspath: string,
  type: FileType,
};

function showFiles(
  fileLookUp: IFileLookUp,
  isTop: (x: string) => boolean,
  files: IFilePickerItem[],
  fs: FileSystem,
  option?: IFilePickerOption
) {
  let avalibleFiles = files.slice();
  if (option.type !== undefined && option.type === FileType.Directory) {
    avalibleFiles = avalibleFiles.filter(file => file.type === FileType.Directory);
  }

  const afile = avalibleFiles[0];
  const isRoot = isTop(afile.fspath);
  const items = avalibleFiles.map(file => ({
    value: file,
    label: file.fspath,
    description: '',
  }))
  .sort((l, r) => l.label.localeCompare(r.label));

  if (!isRoot) {
    const current = fs.pathResolver.dirname(afile.fspath);
    const parent = isTop(current) ? ROOT : fs.pathResolver.resolve(current, '..');

    items.unshift({
      value: {
        fspath: parent,
        type: FileType.Directory,
      },
      label: '..',
      description: 'go back',
    });
    items.unshift({
      value: {
        fspath: current,
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
        return  showFiles(fileLookUp, isTop, nextItems, fs, option);
      }

      return fs.list(targetPath)
        .then(subFiles =>  {
          const subItems = subFiles.map(file => ({
            fspath: file.fspath,
            type: file.type,
          }));
          fileLookUp[targetPath] = subItems;
          return showFiles(fileLookUp, isTop, subItems, fs, option);
        });
    });
}

export default function filePicker(baseFile: IFilePickerItem[], fs: FileSystem, option: IFilePickerOption) {
  const filelookup = {
    [ROOT]: baseFile,
  };
  const isTop = file => baseFile.some(item => item.fspath === file);
  return showFiles(filelookup, isTop, baseFile, fs, option);
}
