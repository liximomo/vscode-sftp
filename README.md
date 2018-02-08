# sftp sync extension for VS Code
Very simple reuqire just three lines of config! Very fast finished in a blink.

## Features

* multiple configs
* browser remote files
* sync directory to remote
* sync directory to local
* download file/directory to local
* upload file/directory to remote
* upload to remote on save
* dual authentication
* watch project directory for external changes and automatically update remote

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
You are even not required to config a password!
```json
{
  "host": "host",
  "username": "username",
  "remotePath": "/remote/workspace", 
}
```
You can also use an array of configs in the config file.
```json
[
  {
    "context": "/workspace/a",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/workspace/a", 
  },
  {
    "context": "/workspace/b",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/workspace/b", 
  }
]
```

### Full Config
```js
{
  // string - A path relative to the vsode workspace root folder.
  context: '.',
 
  // string - sftp or ftp
  protocol: "sftp", 
 
  // string - Hostname or IP address of the server.
  host: "host",

  // integer - Port number of the server.
  port: 22,

  // string - Username for authentication.
  username: "username",

   // string - Password for password-based user authentication.
  password: null,

  // string - The absolute path on remote
  remotePath: "/", 

  // boolean - Upload on every save operation of VS code 
  uploadOnSave: false,

 
  // string - Set to 'update' so 'sync command' will only affect thoes files exist in both local and server. Set to 'full', 'sync' will be same as 'download/upload' besides deleting file not exist in origin from target.
  syncMode: 'update',

  // string[] - Same behavior as gitignore, all path reltative to context of the current config
  ignore: [
    ".vscode",
    ".git",
    ".DS_Store"
  ],

  // object - Default: null. 
  watcher: {
    //  string - glob patterns that are watched and when edited outside of the VS cdoe editor are processed.
    files: "", 
  
    // boolean - upload when file changed
    autoUpload: true,

    // boolean - delete when file removed
    autoDelete: true
  }，
 
  // number - Lower concurrency could get more stability because some client/server have some sort of configured/hard coded limit. 
  concurrency: 512
}
```
#### SFTP only Config
```js
{
  // string - Path to ssh-agent's UNIX socket for ssh-agent-based user authentication.  Windows users: set to 'pageant' for authenticating with Pageant or (actual) path to a cygwin "UNIX socket".
  agent: null, 

  // string - Absolute path to user private key.
  privateKeyPath: null, 

  // mixed - For an encrypted private key, this is the passphrase string used to decrypt it. Set to true for enable passphrase dialog. This will prevent from using cleartext passphrase in this config.
  passphrase: null,

  // boolean - Set to true for enable verifyCode dialog. Keyboard interaction authentication mechanism. For example using Google Authentication (Multi factor)
  // (requires the server to have keyboard-interactive authentication enabled)
  interactiveAuth: false, 

  // Explicit overrides for the default transport layer algorithms used for the connection.
  algorithms: {
    "kex": [
      "ecdh-sha2-nistp256",
      "ecdh-sha2-nistp384",
      "ecdh-sha2-nistp521",
      "diffie-hellman-group-exchange-sha256",
      "diffie-hellman-group14-sha1"
    ],
    "cipher": [
      "aes128-ctr",
      "aes192-ctr",
      "aes256-ctr",
      "aes128-gcm",
      "aes128-gcm@openssh.com",
      "aes256-gcm",
      "aes256-gcm@openssh.com"
    ],
    "serverHostKey": [
      "ssh-rsa",
      "ecdsa-sha2-nistp256",
      "ecdsa-sha2-nistp384",
      "ecdsa-sha2-nistp521"
    ],
    "hmac": [
      "hmac-sha2-256",
      "hmac-sha2-512",
      "hmac-sha1"
    ]
  }
}
```

#### FTP only Config
```js
{
  // mixed - Set to true for both control and data connection encryption, 'control' for control connection encryption only, or 'implicit' for implicitly encrypted control connection (this mode is deprecated in modern times, but usually uses port 990)
  secure: false,
  
  // object - Additional options to be passed to tls.connect(). Default: (null) see https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
  secureOptions: null, 

  // boolean - ftp passive mode
  passive: false, 
}
```

-----------------------------------------------------------------------------------------------------------

## Known Issues

### Issue
ENFILE: file table overflow ...
### Solution
MacOS has a harsh limit on the number of open files. Run these commands:
```bash
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
ulimit -n 65536
```
