import { UResource, FileService } from '../core';
import { COMMAND_FORCE_DOWNLOAD } from '../constants';
import { download } from '../fileHandlers';
import { selectActivedFile } from './shared';
import FileCommand from './abstract/fileCommand';

export default class ForceDownload extends FileCommand {
  static id = COMMAND_FORCE_DOWNLOAD;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await download(uResource, fileService, { ignore: null });
  }
}
