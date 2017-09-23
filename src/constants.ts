export const EXTENSION_NAME = 'sftp';

export const CONFIG = 'sftp.config.default';

export const VSCODE_FOLDER = '.vscode';
export const DEPRECATED_CONGIF_FILENAME = '.sftpConfig.json';
export const CONGIF_FILENAME = 'sftp.json';

export const CONFIG_GLOB_PATTERN = `**/${VSCODE_FOLDER}/{${CONGIF_FILENAME},${DEPRECATED_CONGIF_FILENAME}}`;

export const SYNC_TO_REMOTE = 'sftp.sync.remote';
export const SYNC_TO_LOCAL = 'sftp.sync.local';

export const UPLOAD = 'sftp.trans.remote';
export const DOWNLOAD = 'sftp.trans.local';
