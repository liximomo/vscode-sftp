import * as vscode from 'vscode';
import { COMMAND_OPEN_CONNECTION_IN_TERMINAL } from '../constants';
import { getAllFileService } from '../modules/serviceManager';
import { ExplorerRoot } from '../modules/remoteExplorer';
import { checkCommand } from './abstract/createCommand';

function shouldUseAgent(config) {
  return typeof config.agent === 'string' && config.agent.length > 0;
}

function shouldUseKey(config) {
  return typeof config.privateKeyPath === 'string' && config.privateKeyPath.length > 0;
}

// function shouldUsePass(config) {
//   return typeof config.password === 'string' && config.password.length > 0;
// }

function getSshCommand(
  config: { host: string; port: number; username: string },
  extraOpiton?: string
) {
  let sshStr = `ssh ${config.username}@${config.host} -p ${config.port}`;
  if (extraOpiton) {
    sshStr += ` ${extraOpiton}`;
  }
  return sshStr;
}

export default checkCommand({
  id: COMMAND_OPEN_CONNECTION_IN_TERMINAL,

  async handleCommand(exploreItem?: ExplorerRoot) {
    let remoteConfig;
    if (exploreItem && exploreItem.explorerContext) {
      remoteConfig = exploreItem.explorerContext.fileService.getConfig();
      if (remoteConfig.protocol !== 'sftp') {
        return;
      }
    } else {
      const remoteItems = getAllFileService().reduce((result, fileService) => {
        const config = fileService.getConfig();
        if (config.protocol === 'sftp') {
          result.push({
            label: config.name || config.remotePath,
            description: config.host,
            config,
          });
        }
        return result;
      }, []);
      if (remoteItems.length <= 0) {
        return;
      }

      const item = await vscode.window.showQuickPick(remoteItems, {
        placeHolder: 'Select a folder...',
      });
      if (item === undefined) {
        return;
      }

      remoteConfig = item.config;
    }

    const sshConfig = {
      host: remoteConfig.host,
      port: remoteConfig.port,
      username: remoteConfig.username,
    };
    const terminal = vscode.window.createTerminal(remoteConfig.name);
    if (shouldUseAgent(remoteConfig)) {
      terminal.sendText(getSshCommand(sshConfig));
    } else if (shouldUseKey(remoteConfig)) {
      terminal.sendText(
        getSshCommand(sshConfig, `-i "${remoteConfig.privateKeyPath.replace(/\\/g, '/')}"`)
      );
    } else {
      terminal.sendText(getSshCommand(sshConfig));
    }
    terminal.show();
  },
});
