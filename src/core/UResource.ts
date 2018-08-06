import * as querystring from 'querystring';
import { Uri } from 'vscode';
import { toLocalPath, toRemotePath } from '../helper';

export interface Resource {
  fsPath: string;
  uri: Uri;
}

// Universal resource
export default class UResource {
  private readonly _localResouce: Resource;
  private readonly _remoteResouce: Resource;

  static toRemoteUri(rootUri: Uri, remoteFsPath: string): Uri {
    return rootUri.with({ path: remoteFsPath });
  }

  static toLocalUri(localFsPath: string): Uri {
    return Uri.file(localFsPath);
  }

  static makeRemoteUri({ host, port, remotePath, rootId }) {
    const remote = `${host}${port ? `:${port}` : ''}`;

    const query = {
      remote,
      rootId,
    };

    return Uri.parse(
      `remote:///${remotePath.replace(/^\/+/, '')}?${querystring.stringify(query)}`
    );
  }

  static from(localUri: Uri, remoteUri: Uri): UResource;
  static from(uri: Uri, remote: boolean, root: UResource): UResource;
  static from(uri: Uri, remote: boolean | Uri, root?: UResource): UResource {
    if (typeof remote !== 'boolean') {
      return new UResource({ fsPath: uri.fsPath, uri }, { fsPath: remote.fsPath, uri: remote });
    }

    let localResouce: Resource;
    let remoteResouce: Resource;
    if (remote) {
      const localFsPath = toLocalPath(uri.fsPath, root.remoteFsPath, root.localFsPath);
      const localUri = UResource.toLocalUri(localFsPath);
      localResouce = {
        fsPath: localFsPath,
        uri: localUri,
      };
      remoteResouce = {
        fsPath: uri.fsPath,
        uri,
      };
    } else {
      const remoteFsPath = toRemotePath(uri.fsPath, root.localFsPath, root.remoteFsPath);
      const remoteUri = UResource.toRemoteUri(root.remoteUri, remoteFsPath);
      localResouce = {
        fsPath: uri.fsPath,
        uri,
      };
      remoteResouce = {
        fsPath: remoteFsPath,
        uri: remoteUri,
      };
    }

    return new UResource(localResouce, remoteResouce);
  }

  constructor(localResouce: Resource, remoteResouce: Resource) {
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
