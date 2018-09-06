import { UResource, FileService } from '../core';
import { COMMAND_LIST_ALL } from '../constants';
import { showTextDocument } from '../host';
import { fs } from '../core';
import { download } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { selectFileFromAll, refreshLocalExplorer } from './shared';

export default class ListAll extends FileCommand {
  static id = COMMAND_LIST_ALL;
  static option = {
    requireTarget: false,
  };
  static getFileTarget = selectFileFromAll;

  async handleFile(uResource: UResource, fileService: FileService) {
    await download(uResource, fileService, { ignore: null });
    const localFs = fileService.getLocalFileSystem();
    const fileEntry = await localFs.lstat(uResource.localFsPath);
    if (fileEntry.type !== fs.FileType.Directory) {
      await showTextDocument(uResource.localUri);
    } else {
      refreshLocalExplorer(uResource.localUri);
    }
  }
}
