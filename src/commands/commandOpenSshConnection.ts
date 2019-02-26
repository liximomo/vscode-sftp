import * as vscode from 'vscode';
import { COMMAND_OPEN_CONNECTION_IN_TERMINAL } from '../constants';
import { getAllFileService } from '../modules/serviceManager';
import { ExplorerRoot } from '../modules/remoteExplorer';
import { getUserSetting } from '../host';
import { checkCommand } from './abstract/createCommand';

const isWindows = process.platform === 'win32';

function shouldUseAgent(config) {
  return typeof config.agent === 'string' && config.agent.length > 0;
}

function shouldUseKey(config) {
  return typeof config.privateKeyPath === 'string' && config.privateKeyPath.length > 0;
}

function adaptPath(filepath) {
  // convert to unix style
  const safeUnixPath = filepath.replace(/\\\\/g, '/').replace(/\\/g, '/');
  if (!isWindows) {
    return safeUnixPath;
  }

  const setting = getUserSetting('terminal.integrated.shell');
  const shell = setting.get('windows', '');

  if (!shell.endsWith('wsl.exe')) {
    return safeUnixPath;
  }

  // append with /mnt and convert c: to c
  return '/mnt/' + safeUnixPath.replace(/^([a-zA-Z]):/, '$1');
}

// function shouldUsePass(config) {
//   return typeof config.password === 'string' && config.password.length > 0;
// }

function getSshCommand(
  config: { host: string; port: number; username: string; workingDir: string },
  extraOpiton?: string
) {
  let sshStr = `ssh -t ${config.username}@${config.host} -p ${config.port}`;
  if (extraOpiton) {
    sshStr += ` ${extraOpiton}`;
  }
  sshStr += ` "cd \"${config.workingDir}\"; exec \\$SHELL -l"`
  return sshStr;
}

export default checkCommand({
  id: COMMAND_OPEN_CONNECTION_IN_TERMINAL,

  async handleCommand(exploreItem?: ExplorerRoot) {
    let remoteConfig;
    if (exploreItem && exploreItem.explorerContext) {
      remoteConfig = exploreItem.explorerContext.config;
      if (remoteConfig.protocol !== 'sftp') {
        return;
      }
    } else {
      const remoteItems = getAllFileService().reduce<
        { label: string; description: string; config: any }[]
      >((result, fileService) => {
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
      workingDir: remoteConfig.remotePath,
    };
    const terminal = vscode.window.createTerminal(remoteConfig.name);
    if (shouldUseAgent(remoteConfig)) {
      terminal.sendText(getSshCommand(sshConfig));
    } else if (shouldUseKey(remoteConfig)) {
      terminal.sendText(getSshCommand(sshConfig, `-i "${adaptPath(remoteConfig.privateKeyPath)}"`));
    } else {
      terminal.sendText(getSshCommand(sshConfig));
    }
    terminal.show();
  },
});
