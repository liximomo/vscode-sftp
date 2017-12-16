import * as vscode from 'vscode';
import { CONFIG_PATH } from '../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as Joi from 'joi';
import rpath, { normalize } from './remotePath';
import * as output from './output';
import Trie from '../model/Trie';

const TRIE_DELIMITER = '/';

const configTrie = new Trie(
  {},
  {
    delimiter: TRIE_DELIMITER,
  }
);

const nullable = schema => schema.optional().allow(null);

const configScheme = {
  context: Joi.string(),
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
    files: Joi.string()
      .allow(false, null)
      .optional(),
    autoUpload: Joi.boolean().optional(),
    autoDelete: Joi.boolean().optional(),
  },

  ignore: Joi.array()
    .min(0)
    .items(Joi.string()),
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

function addConfig(config, defaultContext) {
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

  // tslint:disable triple-equals
  let context = normalize(config.context != undefined ? config.context : defaultContext);
  const isWindows = process.platform === 'win32';
  if (isWindows || true) {
    const device = context.substr(0, 2);
    if (device.charAt(1) === ':') {
      // lowercase drive letter
      // becasue vscode will always give us path with lowercase drive letter
      context = context[0].toLowerCase() + context.substr(1);
    }
  }

  const localIgnore = config.ignore.map(pattern => fillGlobPattern(pattern, context));
  const remoteIgnore = config.ignore.map(pattern => fillGlobPattern(pattern, config.remotePath));
  const fullConfig = {
    ...defaultConfig,
    ...config,
    ignore: localIgnore.concat(remoteIgnore),
    context,
  };
  configTrie.add(context, fullConfig);
  output.info(`config at ${context}`, fullConfig);
  return fullConfig;
}

function getRemotePath(config, localPath) {
  return rpath.join(config.remotePath, normalize(path.relative(config.context, localPath)));
}

export function getConfigPath(basePath) {
  return path.join(basePath, CONFIG_PATH);
}

export function fillGlobPattern(pattern, rootPath) {
  return rpath.join(rootPath, pattern);
}

export function loadConfig(configPath) {
  configTrie.empty();

  return fse.readJson(configPath).then(config => {
    const configs = [].concat(config);
    const configContext = path.resolve(configPath, '../../');
    return configs.map(cfg => addConfig(cfg, configContext));
  });
}

export function initConfigs(basePath): Promise<Array<{}>> {
  const configPath = getConfigPath(basePath);
  return fse.pathExists(configPath).then(
    exist => {
      if (exist) {
        return loadConfig(configPath);
      }
      return [];
    },
    _ => []
  );
}

export function getConfig(activityPath: string) {
  const config = configTrie.findPrefix(normalize(activityPath));
  if (!config) {
    throw new Error('config file not found');
  }

  return {
    ...config,
    remotePath: getRemotePath(config, activityPath),
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
