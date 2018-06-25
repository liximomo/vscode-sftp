# sftp sync extension for VS Code
Very simple, requires just three lines of config! Very fast, finished in a blink.

## Features

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
2. Run command on editor context menu or explorer context menu.

*Note1* ：A command must run with a target(file or directory). When Running command within command palette it will ask you to select a folder.

*Note2* ：Sync commands will only be available to a directory. Try not to bind shortcuts to those commands because there is no way to figure out the target directory.

### Commands
| Command              | Description                                  |Detailed description|
| -------------------- |----------------------------------------------|---------------|
| `SFTP: Config`         | create a new config file at workspace root  | see below for an explained config file |
| `SFTP: Upload`         | upload file/directory                       | copies selected files from the local to the remote directory, overwriting the remote ones. Files that are only present on the remote side won't be affected. Files that are only present on the local side will be created remotely|
| `SFTP: Download`       | download file/directory                     | same as above, but in the opposite direction |
| `SFTP: Sync To Remote` | sync local directory to remote               | only available for directories. Copies common files (that exist on both sides) from local dir to remote, overwriting destination. If syncMode is set to full, files that exist only on the local side will be created remotely, and files that exist only on the remote side will be deleted|
| `SFTP: Sync To Local`  | sync remote directory to local               | same as above, but in the opposite direction|
  
## Config

### Example
#### Password Free!
```json
{
  "host": "host",
  "username": "username",
  "remotePath": "/remote/workspace", 
}
```

#### Switchable Profiles
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

#### multiple context.
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

You can see the full config [here](https://github.com/liximomo/vscode-sftp/wiki/config).

-----------------------------------------------------------------------------------------------------------

## Donation
If this project help you reduce time to develop, you can give me a cup of coffee :) 

### Alipay
![Alipay](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/alipay.png)

### Wechat
![Wechat](https://raw.githubusercontent.com/liximomo/vscode-sftp/master/assets/wechat.png)

### PayPal
[![PayPal](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/liximomo)
