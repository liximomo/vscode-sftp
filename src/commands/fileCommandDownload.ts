import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD } from '../constants';
import { download } from '../fileHandlers';
import { selectActivedFile } from './shared';
import FileCommand from './abstract/fileCommand';

export default class Download extends FileCommand {
  static id = COMMAND_DOWNLOAD;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await download(uResource, fileService);
  }
}
