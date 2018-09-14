import { COMMAND_LIST } from '../constants';
import { showTextDocument } from '../host';
import { fs } from '../core';
import { downloadFile, downloadFolder } from '../fileHandlers';
import { checkFileCommand } from './abstract/createCommand';
import { selectFile } from './shared';

export default checkFileCommand({
  id: COMMAND_LIST,
  getFileTarget: selectFile,

  async handleFile(ctx) {
    const localFs = ctx.fileService.getLocalFileSystem();
    const fileEntry = await localFs.lstat(ctx.target.localFsPath);
    if (fileEntry.type !== fs.FileType.Directory) {
      await downloadFile(ctx);
      await showTextDocument(ctx.target.localUri);
    } else {
      await downloadFolder(ctx);
    }
  },
});
