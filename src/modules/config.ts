import * as vscode from 'vscode';
import * as memoize from 'fast-memoize';
import * as fse from 'fs-extra';
import * as path from 'path';
import rpath from './remotePath';
import * as output from './output';

export const defaultConfig = {
  host: "host",
  port: 22,
  username: "username",
  password: "password",
  protocol: "sftp",
  privateKeyPath: null,
  passphrase: null,

  remotePath: "/home",
  uploadOnSave: false,

  ignore: [
    "/**/.vscode",
    "/**/.git",
    "/**/.DS_Store",
  ],
};

export const configFileName = '.sftpConfig.json';

function lookUpConfigRootImpl(activityPath: string, root: string) {
  const configFilePath = path.join(activityPath, configFileName);
  return fse.pathExists(configFilePath)
    .then(exist => {
			if (exist) {
				return activityPath;
			}

      if (activityPath === root) {
        throw new Error('config file not found');
      }

			return lookUpConfigRootImpl(path.resolve(activityPath, '..'), root);
		});
}

const lookUpConfigRoot = memoize(lookUpConfigRootImpl);

export function getDefaultConfigPath() {
  return `${vscode.workspace.rootPath}/${configFileName}`;
};

export function fillPattern(pattern, rootPath) {
  let fullPatterh = pattern;
  if (pattern.indexOf('/') !== 0) {
    fullPatterh = path.join(rootPath, pattern);
  }
  return fullPatterh;
}

export function getConfig(activityPath: string, projectRoot: string) {
  let rootDir;
  return lookUpConfigRoot(activityPath, projectRoot)
    .then(configDir => {
      rootDir = configDir;
      const configFilePath = path.join(configDir, configFileName);
      return configFilePath;
    })
    .then(fse.readJson)
    .then(config => ({
      ...config,
      ignore: config.ignore.map(pattern => fillPattern(pattern, rootDir)),
      remotePath: rpath.join(config.remotePath, path.relative(rootDir, activityPath)),
    }));
};

export default function initConfigFile() {
	if (!vscode.workspace.rootPath) {
		output.errorMsg('Cannot run this command without opened folder', 'config');
	}
	
	const defaultConfigPath = getDefaultConfigPath();

	const showConfigFile = () =>
		vscode.workspace.openTextDocument(defaultConfigPath)
			.then(vscode.window.showTextDocument);

	fse.pathExists(defaultConfigPath)
		.then(exist => {
			if (exist) {
				return showConfigFile()
			}

			return fse.writeJson(defaultConfigPath, defaultConfig, { spaces: 4 })
				.then(showConfigFile)
		})
		.catch(error => {
			output.errorMsg(error, 'config');
		});
}
