import { UResource, FileService } from '../core';
import { COMMAND_UPLOAD_FOLDER } from '../constants';
import { upload } from '../fileHandlers';
import { refreshRemoteExplorer } from './shared';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class UploadFolder extends FileCommand {
  static id = COMMAND_UPLOAD_FOLDER;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    await upload(uResource, fileService);
    refreshRemoteExplorer(uResource, true);
  }
}
