import { UResource, FileService } from '../core';
import { COMMAND_LIST } from '../constants';
import { showTextDocument } from '../host';
import { fs } from '../core';
import { download } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { selectFile, refreshLocalExplorer } from './shared';

export default class List extends FileCommand {
  static id = COMMAND_LIST;
  static getFileTarget = selectFile;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await download(uResource, fileService, config);
    const localFs = fileService.getLocalFileSystem();
    const fileEntry = await localFs.lstat(uResource.localFsPath);
    if (fileEntry.type !== fs.FileType.Directory) {
      await showTextDocument(uResource.localUri);
    } else {
      refreshLocalExplorer(uResource.localUri);
    }
  }
}
