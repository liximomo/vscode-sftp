# SFTP Configuration

## agent
*string*: Path to ssh-agent's UNXI socket for ssh-agent-based user authentication.  Windows users must
set to 'pageant' for authenticating with Pagenat or (actual) path to a Cygwin "UNIX socket".Id gets
more stability because some clients/servers have some sort of configured/hard coded limit.

## privateKeyPath
*string*: Absolute path to user's private key.

## passphrase
*mixed*: For an encrypted private key, this is the passphrase string used to decrypt it.  Set to true
for enabling passphrase dialog.  This will prevent from using cleartext passphrase in this config.

## interactiveAuth
*boolean*|*string*[]: Enable keyboard interaction authentication mechanism. Set to true to enable `verifyCode` dialog. For example using Google Authentication (multi-factor). Or array of predefined phrases to automatically pass them without user prompting.

Note: *Requires the server to have keyboard-interactive authentication enabled.*

**Default**: false

## algorithms
Explicit overrides for the default transport layer algorithms used for the connection.

**Default**:
```json
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
```

## sshConfigPath
Absolute path to your SSH configuration file.

**Default**: ~/.ssh/config

## sshCustomParams
Extra parameters appended to the SSH command used by "Open SSH in Terminal".
