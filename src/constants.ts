import * as path from 'path';

const VENDOR_FOLDER = '.vscode';

export const EXTENSION_NAME = 'sftp';

export const CONFIG = 'sftp.config.default';

export const DEPRECATED_CONGIF_FILENAME = '.sftpConfig.json';
export const CONGIF_FILENAME = 'sftp.json';

export const CONFIG_PATH = path.join(VENDOR_FOLDER, CONGIF_FILENAME);

export const SYNC_TO_REMOTE = 'sftp.sync.remote';
export const SYNC_TO_LOCAL = 'sftp.sync.local';

export const UPLOAD = 'sftp.trans.remote';
export const DOWNLOAD = 'sftp.trans.local';

export const LIST_DEFAULT = 'sftp.list.default';
export const LIST_ALL = 'sftp.list.all';
