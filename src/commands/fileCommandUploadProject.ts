import { UResource, FileService } from '../core';
import { COMMAND_UPLOAD_PROJECT } from '../constants';
import { upload } from '../fileHandlers';
import { selectContext, refreshRemoteExplorer } from './shared';
import FileCommand from './abstract/fileCommand';

export default class UploadProject extends FileCommand {
  static id = COMMAND_UPLOAD_PROJECT;
  static option = {
    requireTarget: false,
  };
  static getFileTarget = selectContext;

  async handleFile(uResource: UResource, fileService: FileService) {
    await upload(uResource, fileService);
    refreshRemoteExplorer(uResource, true);
  }
}
