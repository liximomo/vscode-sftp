import { UResource, FileService } from '../core';
import { COMMAND_DOWNLOAD_FOLDER } from '../constants';
import { download } from '../fileHandlers';
import { refreshLocalExplorer } from './shared';
import FileCommand from './abstract/fileCommand';
import { uriFromExplorerContextOrEditorContext } from './shared';

export default class DownloadFolder extends FileCommand {
  static id = COMMAND_DOWNLOAD_FOLDER;
  static getFileTarget = uriFromExplorerContextOrEditorContext;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await download(uResource, fileService, config);
    refreshLocalExplorer(uResource.localUri);
  }
}
