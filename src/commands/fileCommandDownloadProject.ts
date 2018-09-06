import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD_PROJECT } from '../constants';
import { download } from '../fileHandlers';
import { selectContext, refreshLocalExplorer } from './shared';
import FileCommand from './abstract/fileCommand';

export default class DownloadProject extends FileCommand {
  static id = COMMAND_DOWNLOAD_PROJECT;
  static option = {
    requireTarget: false,
  };
  static getFileTarget = selectContext;

  async handleFile(uResource: UResource, fileService: FileService) {
    await download(uResource, fileService);
    refreshLocalExplorer(uResource.localUri);
  }
}
