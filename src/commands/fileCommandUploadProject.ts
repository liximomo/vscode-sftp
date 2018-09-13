import { UResource, FileService } from '../core';
import { COMMAND_UPLOAD_PROJECT } from '../constants';
import { upload } from '../fileHandlers';
import { selectContext, refreshRemoteExplorer } from './shared';
import FileCommand from './abstract/fileCommand';

export default class UploadProject extends FileCommand {
  static id = COMMAND_UPLOAD_PROJECT;
  static getFileTarget = selectContext;

  async handleFile(uResource: UResource, fileService: FileService, config: any) {
    await upload(uResource, fileService, config);
    refreshRemoteExplorer(uResource, true);
  }
}
