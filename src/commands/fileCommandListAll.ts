import { UResource, FileService } from '../core';
import { COMMAND_LIST_ALL } from '../constants';
import { showTextDocument } from '../host';
import { fs } from '../core';
import { download } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { selectFileFromAll, refreshLocalExplorer } from './shared';

export default class ListAll extends FileCommand {
  static id = COMMAND_LIST_ALL;
  static getFileTarget = selectFileFromAll;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await download(uResource, fileService, config, { ignore: null });
    const localFs = fileService.getLocalFileSystem();
    const fileEntry = await localFs.lstat(uResource.localFsPath);
    if (fileEntry.type !== fs.FileType.Directory) {
      await showTextDocument(uResource.localUri);
    } else {
      refreshLocalExplorer(uResource.localUri);
    }
  }
}
