import { CONFIG_PATH } from '../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as paths from '../helper/paths';
import upath from './upath';
import * as Joi from 'joi';
import * as output from './output';
import Trie from './Trie';
import Ignore from './Ignore';
import { showTextDocument } from '../host';

const configTrie = new Trie(
  {},
  {
    delimiter: path.sep,
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

  ignore: ['.vscode', '.git', '.DS_Store'],
};

function normalizeTriePath(pathname) {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    const device = pathname.substr(0, 2);
    if (device.charAt(1) === ':') {
      // lowercase drive letter
      return pathname[0].toLowerCase() + pathname.substr(1);
    }
  }

  return path.normalize(pathname);
}

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
  context = normalizeTriePath(path.resolve(defaultContext, context));

  const withDefault = {
    ...defaultConfig,
    ...config,
    context,
  };

  configTrie.add(context, withDefault);
  output.info(`config at ${context}`, withDefault);
  return withDefault;
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
  const config = configTrie.findPrefix(normalizeTriePath(activityPath));
  if (!config) {
    throw new Error(`(${activityPath}) config file not found`);
  }

  const ignore = Ignore.from(config.ignore);
  const localContext = config.context;
  const remoteContext = config.remotePath;

  return {
    ...config,
    remotePath: paths.toRemote(path.relative(localContext, activityPath), remoteContext),
    ignore(fsPath) {
      // vscode will always return path with / as separator
      const normalizedPath = path.normalize(fsPath);
      let relativePath;
      if (normalizedPath.indexOf(localContext) === 0) {
        // local path
        relativePath = path.relative(localContext, fsPath);
      } else {
        // remote path
        relativePath = upath.relative(remoteContext, fsPath);
      }

      // skip root
      return relativePath !== '' && ignore.ignores(relativePath);
    },
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

  return configTrie.findValuesWithShortestBranch();
}

export function newConfig(basePath) {
  const configPath = getConfigPath(basePath);

  return fse
    .pathExists(configPath)
    .then(exist => {
      if (exist) {
        return showTextDocument(configPath);
      }

      return fse.outputJson(configPath, defaultConfig, { spaces: 4 }).then(showTextDocument);
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
