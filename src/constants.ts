import * as path from 'path';

const VENDOR_FOLDER = '.vscode';

export const EXTENSION_NAME = 'sftp';

export const REMOTE_SCHEME = 'remote';

export const CONGIF_FILENAME = 'sftp.json';
export const CONFIG_PATH = path.join(VENDOR_FOLDER, CONGIF_FILENAME);

export const COMMAND_CONFIG = 'sftp.config.default';
export const COMMAND_TOGGLE_OUTPUT = 'sftp.toggleOutput';
export const COMMAND_SET_PROFILE = 'sftp.setProfile';

export const COMMAND_SYNC_TO_REMOTE = 'sftp.sync.remote';
export const COMMAND_SYNC_TO_LOCAL = 'sftp.sync.local';
export const COMMAND_UPLOAD = 'sftp.trans.remote';
export const COMMAND_UPLOAD_PROJECT = 'sftp.trans.remote.project';
export const COMMAND_DOWNLOAD = 'sftp.trans.local';
export const COMMAND_DOWNLOAD_PROJECT = 'sftp.trans.local.project';
export const COMMAND_LIST_DEFAULT = 'sftp.list.default';
export const COMMAND_LIST_ALL = 'sftp.list.all';
export const COMMAND_DIFF = 'sftp.diff';
export const COMMAND_DELETEREMOTE = 'sftp.deleteRemote';
export const COMMAND_REVEALINEXPLORER = 'sftp.revealInExplorer';
export const COMMAND_REVEALRESOURCE = 'sftp.revealInRemoteExplorer';
export const COMMAND_SHOWRESOURCE = 'sftp.showResource';

export const UI_COMMAND_DELETEREMOTE = 'ui.sftp.deleteRemote';
export const COMMAND_REMOTEEXPLORER_DELETE = 'sftp.remoteExplorer.delete';
export const COMMAND_REMOTEEXPLORER_REFRESH = 'sftp.remoteExplorer.refresh';
export const COMMAND_REMOTEEXPLORER_EDITINLOCAL = 'sftp.remoteExplorer.editInLocal';
