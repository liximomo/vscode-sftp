import * as vscode from 'vscode';
// import * as memoize from 'fast-memoize';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import rpath, { normalize } from './remotePath';
import * as output from './output';
import Trie from '../model/Trie';
import { WORKSPACE_TRIE_TOKEN } from '../constants';

let configTrie = null;

function getPathRelativeWorkspace(filePath) {
  const normalizedWorkspacePath = normalize(vscode.workspace.rootPath);
  const normalizePath = normalize(filePath);
  if (normalizePath === normalizedWorkspacePath) {
    return WORKSPACE_TRIE_TOKEN;
  }
  const relativePath = rpath.relative(normalizedWorkspacePath, normalizePath);
  return `${WORKSPACE_TRIE_TOKEN}/${relativePath}`;
}

export const configFileName = '.sftpConfig.json';

export const defaultConfig = {
  host: 'host',
  port: 22,
  username: 'username',
  password: null,
  protocol: 'sftp',
  agent: null,
  privateKeyPath: null,
  passphrase: null,
  passive: false,
  interactiveAuth: false,

  remotePath: '/',
  uploadOnSave: false,

  syncMode: 'update',

  watcher: {
    files: false,
    autoUpload: true,
    autoDelete: true,
  },

  ignore: [
    '**/.vscode',
    '**/.git',
    '**/.DS_Store',
    `**/${configFileName}`,
  ],
};

const configGlobPattern = `/**/${configFileName}`;

export function getDefaultConfigPath() {
  return `${vscode.workspace.rootPath}/${configFileName}`;
};

export function fillGlobPattern(pattern, rootPath) {
  return rpath.join(rootPath, pattern);
}

export function addConfig(configPath) {
  return fse.readJson(configPath)
    .then(config => {
      const normalizeConfigPath = normalize(configPath);
      const configRoot = rpath.dirname(normalizeConfigPath);
      const localIgnore = config.ignore.map(pattern => fillGlobPattern(pattern, configRoot));
      const remoteIgnore = config.ignore.map(pattern => fillGlobPattern(pattern, config.remotePath));
      const fullConfig = {
        ...defaultConfig,
        ...config,
        ignore: localIgnore.concat(remoteIgnore),
        configRoot,
      };
      const triePath = getPathRelativeWorkspace(configRoot);
      configTrie.add(triePath, fullConfig);
      output.debug(`config at ${triePath}`, fullConfig);
      return fullConfig;
    });
}

export function initConfigs(): Promise<Trie> {
  return new Promise((resolve, reject) => {
    glob(configGlobPattern, {
      cwd: vscode.workspace.rootPath,
      root: vscode.workspace.rootPath,
      nodir: true,
    }, (error, files) => {
      if (error) {
        reject(error);
        return;
      }

      configTrie = new Trie({});

      return Promise.all(files.map(addConfig))
        .then(() => resolve(configTrie), reject);
    });
  });
}

export function getConfig(activityPath: string) {
  const config = configTrie.findPrefix(getPathRelativeWorkspace(activityPath));
  if (!config) {
    throw new Error('config file not found');
  }
  return {
    ...config,
    //  TO-DO rpath.relative('c:/a/b/c', 'c:\a\b\c\d.txt')
    remotePath: rpath.join(config.remotePath, normalize(path.relative(config.configRoot, activityPath))),
  };
};

export function newConfig() {
  if (!vscode.workspace.rootPath) {
    output.onError('Cannot run this command without opened folder', 'config');
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
      output.onError(error, 'config');
    });
}

export function getHostInfo(config) {
  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    privateKeyPath: config.privateKeyPath,
    passphrase: config.passphrase,
  };
}
