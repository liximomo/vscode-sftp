import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import rpath from './remotePath';
import * as output from './output';

export const defaultConfig = {
  remotePath: "./",
  host: "host",
  port: 22,
  username: "username",
  password: "password",
  protocol: "sftp",
  uploadOnSave: false,
  debug: false,
  privateKeyPath: null,
  passphrase: null,
  ignore: ["\\.vscode", "\\.git", "\\.DS_Store"],
  generatedFiles: {
    uploadOnSave: false,
    extensionsToInclude: [],
    path: ''
  }
};

export const configFileName = '.sftpConfig.json';

function lookUpConfigRoot(activityPath: string) {
  const configFilePath = path.join(activityPath, configFileName);
  return fse.pathExists(configFilePath)
    .then(exist => {
			if (exist) {
				return activityPath;
			}

			return lookUpConfigRoot(path.resolve(activityPath, '..'));
		});
}

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

export function getConfig(activityPath?: string) {
  let rootDir;
  return lookUpConfigRoot(activityPath)
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
		output.errorMsg('config', 'Cannot run this command without opened folder');
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
			output.errorMsg('config', error);
		});
}
