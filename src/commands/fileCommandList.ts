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
    const remotefs = await ctx.fileService.getRemoteFileSystem();
    const fileEntry = await remotefs.lstat(ctx.target.remoteFsPath);
    if (fileEntry.type !== fs.FileType.Directory) {
      await downloadFile(ctx);
      await showTextDocument(ctx.target.localUri);
    } else {
      await downloadFolder(ctx);
    }
  },
});
