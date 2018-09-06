import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD_FOLDER } from '../constants';
import { download } from '../fileHandlers';
import { refreshLocalExplorer } from './shared';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class DownloadFolder extends FileCommand {
  static id = COMMAND_DOWNLOAD_FOLDER;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await download(uResource, fileService);
    refreshLocalExplorer(uResource.localUri);
  }
}
