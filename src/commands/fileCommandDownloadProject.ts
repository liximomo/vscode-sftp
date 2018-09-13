import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD_PROJECT } from '../constants';
import { download } from '../fileHandlers';
import { selectContext, refreshLocalExplorer } from './shared';
import FileCommand from './abstract/fileCommand';

export default class DownloadProject extends FileCommand {
  static id = COMMAND_DOWNLOAD_PROJECT;
  static getFileTarget = selectContext;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await download(uResource, fileService, config);
    refreshLocalExplorer(uResource.localUri);
  }
}
