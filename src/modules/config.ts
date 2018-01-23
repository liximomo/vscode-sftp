import * as vscode from 'vscode';
import { CONFIG_PATH } from '../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as Joi from 'joi';
import * as paths from '../helper/paths';
import rpath from './remotePath';
import * as output from './output';
import Trie from './Trie';
import Ignore from './Ignore';

const configTrie = new Trie(
  {},
  {
    delimiter: paths.sep,
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
  let context = config.context != undefined ? config.context : defaultContext;
  context = paths.normalize(path.resolve(defaultContext, context));

  const isWindows = process.platform === 'win32';
  if (isWindows || true) {
    const device = context.substr(0, 2);
    if (device.charAt(1) === ':') {
      // lowercase drive letter
      // becasue vscode will always give us path with lowercase drive letter
      context = context[0].toLowerCase() + context.substr(1);
    }
  }

  const withDefault = {
    ...defaultConfig,
    ...config,
    context,
  };

  configTrie.add(context, withDefault);
  output.info(`config at ${context}`, withDefault);
  return withDefault;
}

function getRemotePath(config, localPath) {
  return rpath.join(config.remotePath, paths.normalize(path.relative(config.context, localPath)));
}

export function getConfigPath(basePath) {
  return path.join(basePath, CONFIG_PATH);
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
  const config = configTrie.findPrefix(paths.normalize(activityPath));
  if (!config) {
    throw new Error(`(${activityPath}) config file not found`);
  }

  const ignore = Ignore.from(config.ignore);
  const localContext = config.context;
  const remoteContext = config.remotePath;
  return {
    ...config,
    remotePath: getRemotePath(config, activityPath),
    ignore(fsPath) {
      let relativePath;
      if (fsPath.indexOf(config.context) === 0) {
        // local path
        relativePath = paths.relativeWithLocal(localContext, fsPath);
      } else {
        // remote path
        relativePath = paths.relativeWithRemote(remoteContext, fsPath);
      }

      // skip root
      return relativePath !== '' && ignore.ignores(relativePath);
    },
  };
}

export function removeConfig(activityPath: string) {
  configTrie.clearPrefix(paths.normalize(activityPath));
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
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    privateKeyPath: config.privateKeyPath,
    passphrase: config.passphrase,
    passive: config.passive,
    interactiveAuth: config.interactiveAuth,
    agent: config.agent,
  };
}
