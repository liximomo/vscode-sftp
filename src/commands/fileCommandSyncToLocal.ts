import { UResource, FileService } from '../core';
import { COMMAND_SYNC_TO_LOCAL } from '../constants';
import { sync2Local } from '../fileHandlers';
import FileCommand from './abstract/fileCommand';
import { selectFolderFallbackToConfigContext, refreshRemoteExplorer } from './shared';

export default class SyncToLocal extends FileCommand {
  static id = COMMAND_SYNC_TO_LOCAL;
  static option = {
    requireTarget: true,
  };
  static getFileTarget = selectFolderFallbackToConfigContext;

  async handleFile(uResource: UResource, fileService: FileService) {
    await sync2Local(uResource, fileService);
    refreshRemoteExplorer(uResource, true);
  }
}
