import { COMMAND_SLIENT_DELETE_REMOTE } from '../constants';
import { UResource, FileService } from '../core';
import { removeRemote } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { selectActivedFile } from './shared';

export default class DeleteRemote extends FileCommand {
  static id = COMMAND_SLIENT_DELETE_REMOTE;
  static option = {
    requireTarget: false,
  };
  static getFileTarget = selectActivedFile;

  async handleFile(uResource: UResource, fileService: FileService) {
    return removeRemote(uResource, fileService);
  }
}
