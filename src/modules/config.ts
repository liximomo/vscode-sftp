import * as vscode from 'vscode';
// import * as memoize from 'fast-memoize';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as Joi from 'joi';
import rpath, { normalize } from './remotePath';
import * as output from './output';
import Trie from '../model/Trie';
import { WORKSPACE_TRIE_TOKEN } from '../constants';

const configTrie = new Trie({});

const vscodeFolder = '.vscode';

const nullable = schema => schema.optional().allow(null);

const configScheme = {
  host: Joi.string().required(),
  port: Joi.number().integer(),
  username: Joi.string().required(),
  password: nullable(Joi.string()),
  protocol: Joi.any().valid('sftp', 'ftp'),
  agent: nullable(Joi.string()),
  privateKeyPath: nullable(Joi.string()),
  passphrase: nullable(Joi.string()),
  passive: Joi.boolean().optional(),
  interactiveAuth: Joi.boolean().optional(),

  remotePath: Joi.string().required(),
  uploadOnSave: Joi.boolean().optional(),

  syncMode: Joi.any().valid('update', 'full'),

  watcher: {
    files: Joi.string().allow(false, null).optional(),
    autoUpload: Joi.boolean().optional(),
    autoDelete: Joi.boolean().optional(),
  },

  ignore: Joi.array().min(0).items(Joi.string()),
};

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
    autoUpload: false,
    autoDelete: false,
  },

  ignore: ['**/.vscode/**', '**/.git/**', '**/.DS_Store'],
};

const configGlobPattern = `/**/${vscodeFolder}/${configFileName}`;
// const fallbackConfigGlobPattern = `/**/${configFileName}`;

export function getPathRelativeWorkspace(filePath) {
  const normalizedWorkspacePath = normalize(vscode.workspace.rootPath);
  const normalizePath = normalize(filePath);
  if (normalizePath === normalizedWorkspacePath) {
    return WORKSPACE_TRIE_TOKEN;
  }
  const relativePath = rpath.relative(normalizedWorkspacePath, normalizePath);
  return `${WORKSPACE_TRIE_TOKEN}/${relativePath}`;
}

export function getDefaultConfigFolder() {
  return `${vscode.workspace.rootPath}/${vscodeFolder}`;
}

export function getDefaultConfigPath() {
  return `${getDefaultConfigFolder()}/${configFileName}`;
}

export function fillGlobPattern(pattern, rootPath) {
  return rpath.join(rootPath, pattern);
}

export function addConfig(configPath) {
  return fse.readJson(configPath).then(config => {
    const { error: validationError } = Joi.validate(config, configScheme, {
      convert: false,
      language: {
        object: {
          child: '!!prop "{{!child}}" fails because {{reason}}',
        },
      },
    });
    if (validationError) {
      throw new Error(`config validation fail: ${validationError.message}`);
    }

    const normalizeConfigPath = normalize(configPath);
    let configRoot = rpath.dirname(normalizeConfigPath);
    configRoot = rpath.dirname(configRoot);

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
    output.info(`config at ${triePath}`, fullConfig);
    return fullConfig;
  });
}

export function initConfigs(): Promise<Trie> {
  return new Promise((resolve, reject) => {
    glob(
      configGlobPattern,
      {
        cwd: vscode.workspace.rootPath,
        root: vscode.workspace.rootPath,
        nodir: true,
      },
      (error, files) => {
        if (error) {
          reject(error);
          return;
        }

        return Promise.all(files.map(addConfig)).then(() => resolve(configTrie), reject);
      }
    );
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
    remotePath: rpath.join(
      config.remotePath,
      normalize(path.relative(config.configRoot, activityPath))
    ),
  };
}

export function getAllConfigs() {
  if (configTrie === undefined) {
    return [];
  }

  return configTrie.getAllValues();
}

export function getShortestDistinctConfigs() {
  if (configTrie === undefined) {
    return [];
  }

  return configTrie.findValueWithShortestBranch();
}

export function newConfig() {
  if (!vscode.workspace.rootPath) {
    output.onError('Cannot run this command without opened folder', 'config');
  }

  const defaultConfigPath = getDefaultConfigPath();

  const showConfigFile = () =>
    vscode.workspace.openTextDocument(defaultConfigPath).then(vscode.window.showTextDocument);

  fse
    .pathExists(defaultConfigPath)
    .then(exist => {
      if (exist) {
        return showConfigFile();
      }

      return fse
        .ensureDir(getDefaultConfigFolder())
        .then(_ => fse.writeJson(defaultConfigPath, defaultConfig, { spaces: 4 }))
        .then(showConfigFile);
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
