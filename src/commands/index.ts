import {
  COMMAND_CONFIG,
  COMMAND_SYNC_TO_REMOTE,
  COMMAND_SYNC_TO_LOCAL,
  COMMAND_UPLOAD,
  COMMAND_DOWNLOAD,
  COMMAND_LIST_DEFAULT,
  COMMAND_LIST_ALL,
  COMMAND_DIFF,
} from '../constants';
import createCommand, { createFileCommand } from './createCommand';
import {
  selectFileFallbackToConfigContext,
  selectFolderFallbackToConfigContext,
  selectFile,
  selectFileFromAll,
  selectFileOnly,
} from '../modules/targetSelectStrategy';
import localFs from '../modules/localFs';
import { FileType } from '../model/Fs/FileSystem';
import {
  editConfig,
  sync2Local,
  sync2Remote,
  upload,
  download,
  downloadWithoutIgnore,
  diff,
} from '../actions';
import { showTextDocument, refreshExplorer } from '../host';

const configCmd = createCommand(COMMAND_CONFIG, 'config sftp', editConfig);

const sync2remoteCmd = createFileCommand(
  COMMAND_SYNC_TO_REMOTE,
  'sync to remote',
  sync2Remote,
  selectFolderFallbackToConfigContext
);

const sync2localCmd = createFileCommand(
  COMMAND_SYNC_TO_LOCAL,
  'sync to local',
  sync2Local,
  selectFolderFallbackToConfigContext
);
sync2localCmd.onCommandDone(refreshExplorer);

const uploadCmd = createFileCommand(
  COMMAND_UPLOAD,
  'upload',
  upload,
  selectFileFallbackToConfigContext
);
const downloadCmd = createFileCommand(
  COMMAND_DOWNLOAD,
  'download',
  download,
  selectFileFallbackToConfigContext
);
downloadCmd.onCommandDone(refreshExplorer);

const listAllCmd = createFileCommand(
  COMMAND_LIST_ALL,
  '(list) download',
  async (fsPath, config) => {
    await downloadWithoutIgnore(fsPath, config);
    const fileEntry = await localFs.lstat(fsPath);
    if (fileEntry.type !== FileType.Directory) {
      await showTextDocument(fsPath);
    }
  },
  selectFileFromAll
);
listAllCmd.onCommandDone(refreshExplorer);

const listCmd = createFileCommand(
  COMMAND_LIST_DEFAULT,
  '(list) download',
  async (fsPath, config) => {
    await download(fsPath, config);
    const fileEntry = await localFs.lstat(fsPath);
    if (fileEntry.type === FileType.Directory) {
      await showTextDocument(fsPath);
    }
  },
  selectFile
);
listCmd.onCommandDone(refreshExplorer);

const diffCmd = createFileCommand(COMMAND_DIFF, 'diff', diff, selectFileOnly);

export default [
  configCmd,
  sync2remoteCmd,
  sync2localCmd,
  uploadCmd,
  downloadCmd,
  listAllCmd,
  listCmd,
  diffCmd,
];
