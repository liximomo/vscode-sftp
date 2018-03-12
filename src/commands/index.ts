import {
  COMMAND_SYNC_TO_REMOTE,
  COMMAND_SYNC_TO_LOCAL,
  COMMAND_UPLOAD,
  COMMAND_DOWNLOAD,
  COMMAND_LIST_DEFAULT,
  COMMAND_LIST_ALL,
} from '../constants';
import { createFileCommand } from './createCommand';
import {
  selectFileFallbackToConfigContext,
  selectFolderFallbackToConfigContext,
  selectFile,
  selectFileFromAll,
} from '../modules/targetSelectStrategy';
import localFs from '../modules/localFs';
import { FileType } from '../model/Fs/FileSystem';
import { sync2Local, sync2Remote, upload, download, downloadWithoutIgnore } from '../actions';
import { refreshExplorer, focusOpenEditors, showTextDocument } from '../host';

const commands = [];

commands.push(
  createFileCommand(COMMAND_SYNC_TO_REMOTE, 'sync to remote', sync2Remote, selectFolderFallbackToConfigContext)
);
commands.push(
  createFileCommand(COMMAND_SYNC_TO_LOCAL, 'sync to local', sync2Local, selectFolderFallbackToConfigContext)
);
commands.push(createFileCommand(COMMAND_UPLOAD, 'upload', upload, selectFileFallbackToConfigContext));
commands.push(createFileCommand(COMMAND_DOWNLOAD, 'download', download, selectFileFallbackToConfigContext));
commands.push(createFileCommand(COMMAND_LIST_ALL, '(list) download', async (fsPath, config) => {
  await downloadWithoutIgnore(fsPath, config);
  const fileEntry = await localFs.lstat(fsPath);
  if (fileEntry.type === FileType.Directory) {
    await refreshExplorer();
    await focusOpenEditors();
  } else {
    showTextDocument(fsPath);
  }
}, selectFileFromAll));
commands.push(createFileCommand(COMMAND_LIST_DEFAULT, '(list) download', async (fsPath, config) => {
  await download(fsPath, config);
  const fileEntry = await localFs.lstat(fsPath);
  if (fileEntry.type === FileType.Directory) {
    await refreshExplorer();
    await focusOpenEditors();
  } else {
    showTextDocument(fsPath);
  }
}, selectFile));

export default commands;
