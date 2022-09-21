# Full configuration

## name
*string*: A string to identify your configuration.

## context
*string*: A path relative to the workspace root folder.
Use this when you want to map a subfolder to the `remotePath`.

**default**: The workspace root.

## protocol
*string*: `sftp` or `ftp`.

**default**: `sftp`

## host
*string*: Hostname or IP address of the server.

## port
*integer*: Port number of the server.

**default**: 22

## username
*string*: Username for authentication.

## password
*string*: The password for password-based user authentication (**note: this is stored as plain-text**).

## remotePath
*string*: The absolute path on the remote host.

**default**: `/`

## uploadOnSave
*boolean*: Upload on every save operation of VSCode.

**default**: false

## useTempFile
*boolean*: Upload temp file on every save operation of VSCode to avoid breaking a webpage when a user acceses it while the file is still being uploaded (is incomplete).

**default**: false

## openSsh
*boolean*: Enable atomic file uploads (only supported by openSSH servers).
If set to true, the `useTempFile` option must also be set to true.

**default**: false

## downloadOnOpen
*boolean*: Download the file from the remote server whenever it is opened.

**default**: false

## syncOption
*object*: Configure the behavior of the `Sync` command.

**default**: `{}`

## syncOption.delete
*boolean*: Delete extraneous files from destination directories.

## syncOption.skipCreate
*boolean*: Skip creating new files on the destination.

## syncOption.ignoreExisting
*boolean*: Skip updating files that exist on the destination.

## syncOption.update
*boolean*: Update the destination only if a newer version is on the source filesystem.

## ignore
*string[]*: Same behavior as gitignore, all paths relative to context of the current configuration.

**default**: []

## ignoreFile
*string*: Absolute path to the ignore file or Relative path relative to the workspace root folder.

## watcher
*object*.

## watcher.files
*string*: Glob patterns that are watched and when edited outside of the VSCode editor are processed.
Set `uploadOnSave` to false when you watch everything.

## watcher.autoUpload
*boolean*: Upload when the file changed.

## watcher.autoDelete
*boolean*: Delete when the file is removed.

## remoteTimeOffsetInHours
*number*: The number of hours difference between the local machine and the remote server (remote minus local).

**default**: 0

## remoteExplorer
*object*.

## remoteExplorer.filesExclude
*string[]*: Configure that patterns for excluding files and folders.
The Remote Explorer decides which files and folders to show or hide based on this setting.

## concurrency
*number*: Lowering the concurrency could get more stability because some clients/servers have some sort of configured/hard coded limit.

**default**: 4

## connectTimeout
*number*: The maximum connection time.

**default**: 10000

## limitOpenFilesOnRemote
*mixed*: Limit open file descriptors to the specific number in a remote server.
Set to true for using default `limit(222)`. Do not set this unless you have to.

**default**: false

***

# SFTP only configuration

## agent
*string*: Path to ssh-agent's UNIX socket for ssh-agent-based user authentication.
Windows users must set to 'pageant' for authenticating with Pagenat or (actual) path to a Cygwin "UNIX socket".
Id get more stability because some client/server have some sort of configured/hard coded limit.

## privateKeyPath
*string*: Absolute path to user private key.

## passphrase
*mixed*: For an encrypted private key, this is the passphrase string used to decrypt it.
Set to true for enable passphrase dialog. This will prevent from using cleartext passphrase in this config.

## interactiveAuth
*boolean*|*string[]*: Enable keyboard interaction authentication mechanism. Set to true to enable `verifyCode` dialog.
For example using Google Authentication (multi-factor). Or pass array of predefined phrases to automatically enter them without user prompting.

Note: *Requires the server to have keyboard-interactive authentication enabled.*

**default**: false

## algorithms
Explicit overrides for the default transport layer algorithms used for the connection.

**default**:
```json
{
  "algorithms": {
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
      "ssh-dss",
      "ssh-ed25519",
      "ecdsa-sha2-nistp256",
      "ecdsa-sha2-nistp384",
      "ecdsa-sha2-nistp521",
      "rsa-sha2-512",
      "rsa-sha2-256"
    ],
    "hmac": [
      "hmac-sha2-256",
      "hmac-sha2-512",
      "hmac-sha1"
    ]
  },
}
```

## sshConfigPath
Absolute path to your SSH configuration file.

**default**: `~/.ssh/config`

## sshCustomParams
Extra parameters appended to the SSH command used by "Open SSH in Terminal".

***

# FTP(s) only configuration

## secure
*mixed*: Set to true for both control and data connection encryption.
Set to `control` for control encryption only, or `implicit` for implicitly encrypted control connection (this mode is deprecated in modern times, but usually uses port 990).

**default**: false

## secureOptions
Additional options to be passed to `tls.connect()`.
See [TLS connect options callback](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback).
