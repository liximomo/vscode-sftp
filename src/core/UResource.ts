/* tslint:disable max-classes-per-file */
import * as querystring from 'querystring';
import { Uri } from 'vscode';
import { toLocalPath, toRemotePath } from '../helper';
import { REMOTE_SCHEME } from '../constants';

function createUriString(authority: string, path: string, query: any) {
  const normalizedPath = encodeURIComponent(path.replace(/^\/+/, ''));
  return `${REMOTE_SCHEME}://${authority}/${normalizedPath}?${querystring.stringify(query)}`;
}

// tslint:disable-next-line class-name
export class _Resource {
  private readonly _uri: Uri;
  private readonly _isRemote: boolean;
  private readonly _fsPath: string;
  private readonly _remoteId: number;

  constructor(uri: Uri) {
    this._uri = uri;
    this._isRemote = this._uri.scheme === REMOTE_SCHEME;
    if (this._isRemote) {
      const query = querystring.parse(this._uri.query);
      this._remoteId = parseInt(query.remoteId, 10);

      if (query.fsPath === undefined) {
        throw new Error(`fsPath is missing in remote uri ${this._uri}.`);
      }

      this._fsPath = query.fsPath;
    } else {
      this._fsPath = this._uri.fsPath;
    }
  }

  get remoteId(): number {
    return this._remoteId;
  }

  get isRemote(): boolean {
    return this._isRemote;
  }

  get uri(): Uri {
    return this._uri;
  }

  get fsPath() {
    return this._fsPath;
  }
}

interface RemoteResourceConfig {
  remote: {
    host: string;
    port: number;
  };
  remoteId: number;
}

type ResourceConfig = RemoteResourceConfig & {
  localBasePath: string;
  remoteBasePath: string;
};

export interface Resource {
  remoteId: number;
  fsPath: string;
  uri: Uri;
  isRemote: boolean;
}

// Universal resource
export default class UResource {
  private readonly _localResouce: Resource;
  private readonly _remoteResouce: Resource;

  static makeResource(config: RemoteResourceConfig & { fsPath: string } | Uri): Resource {
    if (config instanceof Uri) {
      return new _Resource(config);
    }

    if (!config.remote) {
      return new _Resource(Uri.file(config.fsPath));
    }

    const {
      remote: { host, port },
      remoteId,
      fsPath,
    } = config;
    const remote = `${host}${port ? `:${port}` : ''}`;
    const query = {
      remoteId,
      fsPath,
    };

    // uri.fsPath will always be current platform specific.
    // We need to store valid fsPath for remote platform.
    return new _Resource(Uri.parse(createUriString(remote, fsPath, query)));
  }

  static updateResource(resource: Resource, delta: { remotePath: string }): Resource {
    const uri = resource.uri;
    const { remotePath } = delta;
    const query = querystring.parse(resource.uri.query);
    query.fsPath = delta.remotePath;

    return new _Resource(Uri.parse(createUriString(uri.authority, remotePath, query)));
  }

  static from(uri: Uri, root: object): UResource;
  static from(uri: Uri, root: Resource | ResourceConfig): UResource {
    if ((root as Resource).fsPath) {
      return new UResource(new _Resource(uri), root as Resource);
    }

    const { localBasePath, remoteBasePath, remote, remoteId } = root as ResourceConfig;

    let localResouce: Resource;
    let remoteResouce: Resource;
    if (uri.scheme === REMOTE_SCHEME) {
      const localFsPath = toLocalPath(UResource.makeResource(uri).fsPath, remoteBasePath, localBasePath);
      localResouce = new _Resource(Uri.file(localFsPath));
      remoteResouce = new _Resource(uri);
    } else {
      const remoteFsPath = toRemotePath(uri.fsPath, localBasePath, remoteBasePath);
      remoteResouce = UResource.makeResource({
        remote,
        fsPath: remoteFsPath,
        remoteId,
      });
      localResouce = new _Resource(uri);
    }

    return new UResource(localResouce, remoteResouce);
  }

  private constructor(localResouce: Resource, remoteResouce: Resource) {
    this._localResouce = localResouce;
    this._remoteResouce = remoteResouce;
  }

  get localFsPath(): string {
    return this._localResouce.fsPath;
  }

  get remoteFsPath(): string {
    return this._remoteResouce.fsPath;
  }

  get localUri(): Uri {
    return this._localResouce.uri;
  }

  get remoteUri(): Uri {
    return this._remoteResouce.uri;
  }
}
