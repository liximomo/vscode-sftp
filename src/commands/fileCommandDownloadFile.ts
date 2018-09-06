import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD_FILE } from '../constants';
import { download } from '../fileHandlers';
import { selectActivedFile } from './shared';
import FileCommand from './abstract/fileCommand';

export default class DownloadFile extends FileCommand {
  static id = COMMAND_DOWNLOAD_FILE;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await download(uResource, fileService, { ignore: null });
  }
}
