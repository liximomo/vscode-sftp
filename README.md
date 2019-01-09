# sftp sync extension for VS Code

[![Paypal Donations](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=KEJA775QBTZSC&source=url)

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

- [Simple](#password-free)
- [Profiles](#profiles)
- [Multiple Context](#multiple-context)
- [Connection Hopping](#connection-hopping)
- [Config in User Setting](#config-in-user-setting)

### Password Free

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

_Note：_ `context` and `watcher` are only avaliable at root level.

Use `SFTP: Set Profile` to swtich profile.

### Multiple Context

```json
[
  {
    "name": "server1",
    "context": "/project/build",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/project/build"
  },
  {
    "name": "server2",
    "context": "/project/src",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/project/src"
  }
]
```

_Note：_ `name` is required in this mode.

### Connection Hopping.

You can connection to a target server through a proxy with ssh protocol.

_Note：_ **Variable substitution is not working in a hop config.**

#### Single Hop

local -> hop -> target

```json
{
  "name": "target",
  "host": "targetHost",
  "username": "targetUsername",
  "privateKeyPath": "~/.ssh/id_rsa",
  "remotePath": "/path/in/target",
  "hop": {
    "host": "hopHost",
    "username": "hopUsername",
    "privateKeyPath": "/Users/hopUsername/.ssh/id_rsa" // The key file is assumed on the hop.
  }
}
```

#### Multiple Hop

local -> hopA -> hopB -> target

```json
{
  "name": "target",
  "host": "targetHost",
  "username": "targetUsername",
  "privateKeyPath": "~/.ssh/id_rsa",
  "remotePath": "/path/in/target",
  "hop": [
    {
      "host": "hopAHost",
      "username": "hopAUsername",
      "privateKeyPath": "/Users/hopAUsername/.ssh/id_rsa"
    },
    {
      "host": "hopBHost",
      "username": "hopBUsername",
      "privateKeyPath": "/Users/hopBUsername/.ssh/id_rsa"
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

Remote Explorer let you explore files in remote. You can open Remote Explorer by:

1. Run Command `View: Show SFTP`.
2. Click SFTP view in Activity Bar.

You can only view files content with Remote Explorer. Run command `SFTP: Edit in Local` to edit it in local.

_Note：_ You need manually refresh the parent folder after **delete** a file to make the explorer updated.

## Debug

1.  Open User Settings.

    - On Windows/Linux - `File > Preferences > Settings`
    - On macOS - `Code > Preferences > Settings`

2.  Set `sftp.debug` to `true` and reload vscode.
3.  View the logs in `View > Output > sftp`.

---

## Donation

If this project help you reduce time to develop, you can give me a cup of coffee :)

### Alipay

![Alipay](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/alipay.png)

### Wechat

![Wechat](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/wechat.png)

### PayPal

[![PayPal](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=KEJA775QBTZSC&source=url)
