import * as vscode from 'vscode';
import { CONFIG_GLOB_PATTERN, VSCODE_FOLDER, CONGIF_FILENAME } from '../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as Joi from 'joi';
import rpath, { normalize } from './remotePath';
import * as output from './output';
import Trie from '../model/Trie';
import { isDeprecatedConfigFile, isNoneRootConfigFile } from '../helper/deprecated';

let isWarnShowed = false;
let isMultiConfigWarnShowed = false;

const TRIE_DELIMITER = '/';

const configTrie = new Trie({}, {
  delimiter: TRIE_DELIMITER,
});

const nullable = schema => schema.optional().allow(null);

const configScheme = {
  host: Joi.string().required(),
  port: Joi.number().integer(),
  username: Joi.string().required(),
  password: nullable(Joi.string()),
  protocol: Joi.any().valid('sftp', 'ftp', 'test'),
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

const defaultConfig = {
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

function toTriePath(basePath, filePath) {
  // reduce search deepth
  const root = basePath.replace('/', '_');

  const normalizedBasePath = normalize(basePath);
  const normalizePath = normalize(filePath);
  if (normalizePath === normalizedBasePath) {
    return root;
  }
  const relativePath = rpath.relative(normalizedBasePath, normalizePath);
  return `${root}/${relativePath}`;
}

export function getConfigPath(basePath) {
  return rpath.join(basePath, VSCODE_FOLDER, CONGIF_FILENAME);
}

export function fillGlobPattern(pattern, rootPath) {
  return rpath.join(rootPath, pattern);
}

export function addConfig(configPath) {
  if (!isWarnShowed && isDeprecatedConfigFile(configPath)) {
    isWarnShowed = true;
    vscode.window.showWarningMessage(
      '[sftp]: The \'.sftpConfig.json\' config file will be deprecated next update. Please use \'sftp.json\' instead.'
    );
  }

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

    if (!isMultiConfigWarnShowed && isNoneRootConfigFile(configRoot)) {
      isMultiConfigWarnShowed = true;
      vscode.window.showWarningMessage(
        '[sftp]: You have a config file not located in workspace root folder. ' +
        'This multi-config feature will be deprecated next update for better performance. ' +
        'You could use vscode \'multi-root workspace\' to reach the same goal.'
      );
    }

    const localIgnore = config.ignore.map(pattern => fillGlobPattern(pattern, configRoot));
    const remoteIgnore = config.ignore.map(pattern => fillGlobPattern(pattern, config.remotePath));
    const fullConfig = {
      ...defaultConfig,
      ...config,
      ignore: localIgnore.concat(remoteIgnore),
      configRoot,
    };
    configTrie.add(configRoot, fullConfig);
    output.info(`config at ${configRoot}`, fullConfig);
    return fullConfig;
  });
}

export function initConfigs(basePath): Promise<Array<{}>> {
  return new Promise((resolve, reject) => {
    glob(
      `/${CONFIG_GLOB_PATTERN}`,
      {
        cwd: basePath,
        root: basePath,
        nodir: true,
      },
      (error, files) => {
        if (error) {
          reject(error);
          return;
        }

        return Promise.all(files.map(addConfig)).then(configs => resolve(configs), reject);
      }
    );
  });
}

export function getConfig(activityPath: string) {
  const config = configTrie.findPrefix(normalize(activityPath));
  if (!config) {
    throw new Error('config file not found');
  }
  return {
    ...config,
    remotePath: rpath.join(
      config.remotePath,
      normalize(path.relative(config.configRoot, activityPath))
    ),
  };
}

export function removeConfig(activityPath: string) {
  configTrie.clearPrefix(normalize(activityPath));
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

  return configTrie.findValuesWithShortestBranch();
}

export function newConfig(basePath) {
  const configPath = getConfigPath(basePath);

  const showConfigFile = () =>
    vscode.workspace.openTextDocument(configPath).then(vscode.window.showTextDocument);

  return fse
    .pathExists(configPath)
    .then(exist => {
      if (exist) {
        return showConfigFile();
      }

      return fse.outputJson(configPath, defaultConfig, { spaces: 4 }).then(showConfigFile);
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
