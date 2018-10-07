import * as vscode from 'vscode';
import { COMMAND_SET_PROFILE } from '../constants';
import { showInformationMessage } from '../host';
import app from '../app';
import { getAllFileService } from '../modules/serviceManager';
import { checkCommand } from './abstract/createCommand';

export default checkCommand({
  id: COMMAND_SET_PROFILE,

  async handleCommand(arg) {
    const profiles: Array<vscode.QuickPickItem & { value: string }> = getAllFileService().reduce(
      (acc, service) => {
        if (service.getAvaliableProfiles().length <= 0) {
          return acc;
        }

        service.getAvaliableProfiles().forEach(profile => {
          acc.push({
            value: profile,
            label: app.state.profile === profile ? `${profile} (active)` : profile,
          });
        });
        return acc;
      },
      [
        {
          value: null,
          label: 'UNSET',
        },
      ]
    );

    if (profiles.length <= 1) {
      showInformationMessage('No Avaliable Profile.');
      return;
    }

    if (arg !== undefined) {
        app.state.profile = arg;
    } else {
        const item = await vscode.window.showQuickPick(profiles, { placeHolder: 'select a profile' });
        if (item === undefined) return;
        app.state.profile = item.value;
    }
  },
});
