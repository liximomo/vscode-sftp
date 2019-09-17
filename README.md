# sftp sync extension for VS Code

[![Paypal Donations](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=BY89QD47D7MPS&source=url) [![PayPal Me](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/liximomo)

Very powerful, with smart features. Very simple, requires just three lines of config! Very fast, finished in a blink.

- Features
  - [Browser remote with Remote Explorer](#remote-explorer)
  - Diff local and remote
  - Sync directory
  - Upload/Download
  - Upload on save
  - File Watcher
  - Multiple configs
  - Switchable profiles
- [Commands](https://github.com/liximomo/vscode-sftp/wiki/Command)
- [Debug](#debug)
- [Support SFTP Project](#Donation)

## Usage

1. `Ctrl+Shift+P` on Windows/Linux or `Cmd+Shift+P` on Mac open command palette, run `SFTP: config` command.
2. Enjoy.

For detailed usage. Please go to [wiki](https://github.com/liximomo/vscode-sftp/wiki).

## Example Configs

You can see the full config [here](https://github.com/liximomo/vscode-sftp/wiki/config).

- [Simple](#simple)
- [Profiles](#profiles)
- [Multiple Context](#multiple-context)
- [Connection Hopping](#connection-hopping)
  - [Single Hop](#single-hop)
  - [Multiple Hop](#multiple-hop)
- [Config in User Setting](#config-in-user-setting)

### Simple

```json
{
  "host": "host",
  "username": "username",
  "remotePath": "/remote/workspace"
}
```

### Profiles

```json
{
  "username": "username",
  "password": "password",
  "remotePath": "/remote/workspace/a",
  "watcher": {
    "files": "dist/*.{js,css}",
    "autoUpload": false,
    "autoDelete": false
  },
  "profiles": {
    "dev": {
      "host": "dev-host",
      "remotePath": "/dev",
      "uploadOnSave": true
    },
    "prod": {
      "host": "prod-host",
      "remotePath": "/prod"
    }
  },
  "defaultProfile": "dev"
}
```

_Note：_ `context` and `watcher` are only available at root level.

Use `SFTP: Set Profile` to switch profile.

### Multiple Context

The context must **not be same**.

```json
[
  {
    "name": "server1",
    "context": "project/build",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/project/build"
  },
  {
    "name": "server2",
    "context": "project/src",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/project/src"
  }
]
```

_Note：_ `name` is required in this mode.

### Connection Hopping

You can connect to a target server through a proxy with ssh protocol.

_Note：_ **Variable substitution is not working in a hop config.**

#### Single Hop

local -> hop -> target

```json
{
  "name": "target",
  "remotePath": "/path/in/target",
  
  // hop
  "host": "hopHost",
  "username": "hopUsername",
  "privateKeyPath": "/Users/localUser/.ssh/id_rsa", // The key file is assumed on the local.

  "hop": {
    // target
    "host": "targetHost",
    "username": "targetUsername",
    "privateKeyPath": "/Users/hopUser/.ssh/id_rsa", // The key file is assumed on the hop.
  }
}
```

#### Multiple Hop

local -> hopa -> hopb -> target

```json
{
  "name": "target",
  "remotePath": "/path/in/target",

  // hopa
  "host": "hopAHost",
  "username": "hopAUsername",
  "privateKeyPath": "/Users/hopAUsername/.ssh/id_rsa" // The key file is assumed on the local.

  "hop": [
    // hopb
    {
      "host": "hopBHost",
      "username": "hopBUsername",
      "privateKeyPath": "/Users/hopaUser/.ssh/id_rsa" // The key file is assumed on the hopa.
    },

    // target
    {
      "host": "targetHost",
      "username": "targetUsername",
      "privateKeyPath": "/Users/hopbUser/.ssh/id_rsa", // The key file is assumed on the hopb.
    }
  ]
}
```

### Config in User Setting

You can use `remote` to tell sftp to get the config from [remote-fs](https://github.com/liximomo/vscode-remote-fs).

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
  "ignore": [".vscode", ".git", ".DS_Store"]
}
```

## Remote Explorer

![remote-explorer-preview](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/showcase/remote-explorer.png)

Remote Explorer lets you explore files in remote. You can open Remote Explorer by:

1. Run Command `View: Show SFTP`.
2. Click SFTP view in Activity Bar.

You can only view a files content with Remote Explorer. Run command `SFTP: Edit in Local` to edit it in local.

_Note：_ You need to manually refresh the parent folder after you **delete** a file to make the explorer updated.

## Debug

1.  Open User Settings.

    - On Windows/Linux - `File > Preferences > Settings`
    - On macOS - `Code > Preferences > Settings`

2.  Set `sftp.debug` to `true` and reload vscode.
3.  View the logs in `View > Output > sftp`.

---

## Donation

If this project helped you reduce development time, you can give me a cup of coffee :)

### Wechat

<img width="140" alt="Wechat" src="https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/wechat.png"/>

### Alipay

<img width="140" alt="Alipay" src="https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/alipay.png"/>

### PayPal
[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=BY89QD47D7MPS&source=url) [![PayPal Me](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/liximomo) 
