# sftp sync extension for VS Code
Very simple, requires just three lines of config! Very fast, finished in a blink.

## Features

* Remote explorer
* Multiple configs
* Switchable profiles
* Browser remote files
* Compare a local file with remote file
* Sync directory to remote
* Sync directory to local
* Download file/directory to local
* Upload file/directory to remote
* Upload to remote on save
* Dual authentication
* Watch project directory for external changes and automatically update remote

## Usage
1. `Ctrl+Shift+P` on Windows/Linux open command palette, run `SFTP: config` command.
2. Enjoy.

*Note* ：Sync commands will only be available to a directory. Try not to bind shortcuts to those commands because there is no way to figure out the target directory.

### Main Commands
| Command              | Description                                  |Detailed description|
| -------------------- |----------------------------------------------|---------------|
| `SFTP: Config`         | create a new config file at workspace root  | see below for an explained config file |
| `SFTP: Upload`         | upload file/directory                       | copies selected files from the local to the remote directory, overwriting the remote ones. Files that are only present on the remote side won't be affected. Files that are only present on the local side will be created remotely|
| `SFTP: Download`       | download file/directory                     | same as above, but in the opposite direction |
| `SFTP: Sync To Remote` | sync local directory to remote               | only available for directories. Copies common files (that exist on both sides) from local dir to remote, overwriting destination. If syncMode is set to full, files that exist only on the local side will be created remotely, and files that exist only on the remote side will be deleted|
| `SFTP: Sync To Local`  | sync remote directory to local               | same as above, but in the opposite direction|
  
## Config
You can see the full config [here](https://github.com/liximomo/vscode-sftp/wiki/config).

### Config Example
* [Simple](#password-free)
* [Profiles](#profiles)
* [Multiple Context](#multiple-context)
* [Connection Hopping](#connection-hopping)
* [Config in User Setting](#config-in-user-setting)

#### Password Free
```json
{
  "host": "host",
  "username": "username",
  "remotePath": "/remote/workspace", 
}
```

#### Profiles
```json
{ 
  "context": "/workspace/a",
  "username": "username",
  "password": "password",
  "remotePath": "/remote/workspace/a", 
  "watcher": {
    "files": "dist/*.{js,css}",
    "autoUpload": false,
    "autoDelete": false,
  },
  "profiles" : {
    "dev" : {
      "host": "dev-host",
      "remotePath" : "/dev",
      "uploadOnSave": true
    },
    "prod" : {
      "host": "prod-host",
      "remotePath" : "/prod"
    }
  }
}
```
*Note：* `context` and `watcher` are only avaliable at root level.

Use `SFTP: Set Profile` to swtich profile.

#### Multiple Context
```json
[
  {
    "name": "server1",
    "context": "/workspace/a",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/workspace/a", 
  },
  {
    "name": "server2",
    "context": "/workspace/b",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/workspace/b", 
  }
]
```
*Note：* `name` is required in this mode.

#### Connection Hopping.

You can connection to a target server through a proxy with ssh protocol.

*Note：* **Variable substitution is not working in a hop config.**

##### Single Hop

local -> hop -> target

```json
{
  "name": "target",
  "context": "/workspace/a",
  "host": "targetHost",
  "username": "targetUsername",
  "privateKeyPath": "~/.ssh/id_rsa",
  "remotePath": "/path/in/target", 
  "hop": {
    "host": "hopHost",
    "username": "hopUsername",
    "privateKeyPath": "/Users/hopUsername/.ssh/id_rsa", // The key file is assumed on the hop.
  }
}
```
##### Multiple Hop
local -> hopA -> hopB -> target

```json
{
  "name": "target",
  "context": "/workspace/a",
  "host": "targetHost",
  "username": "targetUsername",
  "privateKeyPath": "~/.ssh/id_rsa",
  "remotePath": "/path/in/target", 
  "hop": [
    {
      "host": "hopAHost",
      "username": "hopAUsername",
      "privateKeyPath": "/Users/hopAUsername/.ssh/id_rsa",
    },
    {
      "host": "hopBHost",
      "username": "hopBUsername",
      "privateKeyPath": "/Users/hopBUsername/.ssh/id_rsa",
    },
  ]
}
```

#### Config in User Setting
You can use `remote` to tell sftp to get the config from (remote-fs)https://github.com/liximomo/vscode-remote-fs.

In User Setting:

```json
"remotefs.remote": {
  "dev": {
    "scheme": "sftp",
    "host": "host",
    "username": "username",
    "rootPath": "/path/to/somewhere"
  },
  "projectX": {
    "scheme": "sftp",
    "host": "host",
    "username": "username",
    "privateKeyPath": "/Users/xx/.ssh/id_rsa",
    "rootPath": "/home/foo/some/projectx"
  }
}
```

In sftp.json:

```json
{
  "remote": "dev",
  "remotePath": "/home/xx/",
  "uploadOnSave": true,
  "ignore": [
    ".vscode",
    ".git",
    ".DS_Store",
  ]
}
```

## Remote Explorer
![remote-explorer-preview](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/showcase/remote-explorer.png)

Remote Explorer let you explore files in remote. You can open Remote Explorer by:

1. View: Show SFTP.
2. Click SFTP view in Activity Bar.

You can only view files content with Remote Explorer. Run command `SFTP: Edit in Local` to edit it in local.

*Note：* You need manually refresh the parent folder after **delete** a file to make the explorer updated.

-----------------------------------------------------------------------------------------------------------

## Donation
If this project help you reduce time to develop, you can give me a cup of coffee :) 

### Alipay
![Alipay](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/alipay.png)

### Wechat
![Wechat](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/wechat.png)

### PayPal
[![PayPal](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/liximomo)
