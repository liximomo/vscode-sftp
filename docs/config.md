## Full Config

### name
*string*: A string to identify your config.

### context
*string*: A path relative to the workspace root folder. Using this when you want to map a subfolder to the remotePath.

**default**: workspace root

### protocol
*string*: sftp or ftp.

**default**: sftp

### host
*string*: Hostname or IP address of the server.

### port
integer: Port number of the server.

**default**: 22

### username
*string*: Username for authentication.

### password
*string*: Password for password-based user authentication.

### remotePath
*string*: The absolute path on remote

**default**: /

### uploadOnSave
boolean: Upload on every save operation of VS code

**default**: false

### useTempFile
boolean: Upload temp file on every save operation of VSCode to avoid breaking a webpage when a user acceses it 
while the file is still being uploaded (is incomplete).

**Default**: false

### downloadOnOpen
boolean: Download the file from the remote server whenever it is opened

**default**: false

### syncOption
object: Config the behavior of `Sync` command.

**default**: `{}`

### syncOption.delete
boolean: Delete extraneous files from dest dirs.

### syncOption.skipCreate
boolean: Skip creating new files on dest.

### syncOption.ignoreExisting
boolean: Skip updating files that exist on dest.

### syncOption.update
boolean: Update the dest only if a newer version is on the src filesystem.

### ignore
*string*[]: Same behavior as gitignore, all path reltative to context of the current config

**default**: []

### ignoreFile
*string*: Absolute path to the ignore file or Relative path relative to the workspace root folder.

### watcher
object.

### watcher.files
*string*: glob patterns that are watched and when edited outside of the VS cdoe editor are processed. Set `uploadOnSave` to false when you watch everything.

### watcher.autoUpload
boolean: upload when file changed

### watcher.autoDelete
boolean: delete when file removed

### remoteTimeOffsetInHours
number: The number of hours difference between the local machine and remote/server. (remote minus local)

**default**: 0

### remoteExplorer
object.

### remoteExplorer.filesExclude
*string*[]: Configure patterns for excluding files and folders. The Remote Explorer decides which files and folders to show or hide based on this setting.

### concurrency
number: Lower concurrency could get more stability because some client/server have some sort of configured/hard coded limit.

**default**: 4

### connectTimeout
number: the maximum connection time

**default**: 10000

### limitOpenFilesOnRemote
mixed: Limit open file descriptors to the specific number in a remote server. Set to true for using default limit(222). Do not set this unless you have to.
 
**default**: false


## SFTP only Config

### agent
*string*: Path to ssh-agent's UNIX socket for ssh-agent-based user authentication. Windows users: set to 'pageant' for authenticating with Pageant or (actual) path to a cygwin "UNIX socket".ld get more stability because some client/server have some sort of configured/hard coded limit.

### privateKeyPath
*string*: Absolute path to user private key.

### passphrase
mixed: For an encrypted private key, this is the passphrase string used to decrypt it. Set to true for enable passphrase dialog. This will prevent from using cleartext passphrase in this config.

### interactiveAuth
boolean: Set to true for enable verifyCode dialog. Keyboard interaction authentication mechanism. For example using Google Authentication (Multi factor)

Note: _(requires the server to have keyboard-interactive authentication enabled)_

**default**: false

### algorithms
Explicit overrides for the default transport layer algorithms used for the connection.

**default**:
```js
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
},
```

### sshConfigPath
Absolute path to your SSH config file.

**default**: ~/.ssh/config

## FTP only Config

### secure
mixed: Set to true for both control and data connection encryption, 'control' for control connection encryption only, or 'implicit' for implicitly encrypted control connection (this mode is deprecated in modern times, but usually uses port 990)

**default**: false

### secureOptions
Additional options to be passed to tls.connect(). see https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
