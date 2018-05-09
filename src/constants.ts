import * as path from 'path';

const VENDOR_FOLDER = '.vscode';

export const EXTENSION_NAME = 'sftp';

export const CONGIF_FILENAME = 'sftp.json';

export const CONFIG_PATH = path.join(VENDOR_FOLDER, CONGIF_FILENAME);

export const COMMAND_OPEN_OUTPUT = 'sftp.open-output';

export const COMMAND_CONFIG = 'sftp.config.default';

export const COMMAND_SYNC_TO_REMOTE = 'sftp.sync.remote';
export const COMMAND_SYNC_TO_LOCAL = 'sftp.sync.local';

export const COMMAND_UPLOAD = 'sftp.trans.remote';
export const COMMAND_DOWNLOAD = 'sftp.trans.local';

export const COMMAND_LIST_DEFAULT = 'sftp.list.default';
export const COMMAND_LIST_ALL = 'sftp.list.all';

export const COMMAND_DIFF = 'sftp.diff';
