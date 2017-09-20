import * as vscode from 'vscode';
// import * as memoize from 'fast-memoize';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as Joi from 'joi';
import rpath, { normalize } from './remotePath';
import * as output from './output';
import Trie from '../model/Trie';

const TRIE_DELIMITER = '/';

const configTrie = new Trie({}, {
  delimiter: TRIE_DELIMITER,
});

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

export function getDefaultConfigPath(basePath) {
  return rpath.join(basePath, configFileName);
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
    configTrie.add(configRoot, fullConfig);
    output.info(`config at ${configRoot}`, fullConfig);
    return fullConfig;
  });
}

export function initConfigs(basePath): Promise<Trie> {
  return new Promise((resolve, reject) => {
    glob(
      configGlobPattern,
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

        return Promise.all(files.map(addConfig)).then(() => resolve(configTrie), reject);
      }
    );
  });
}

export function getConfig(activityPath: string) {
  const config = configTrie.findPrefix(activityPath);
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
  const defaultConfigPath = getDefaultConfigPath(basePath);

  const showConfigFile = () =>
    vscode.workspace.openTextDocument(defaultConfigPath).then(vscode.window.showTextDocument);

  fse
    .pathExists(defaultConfigPath)
    .then(exist => {
      if (exist) {
        return showConfigFile();
      }

      return fse
        .ensureDir(basePath)
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
