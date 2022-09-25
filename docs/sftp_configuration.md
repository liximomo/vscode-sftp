# SFTP configuration

## agent
*string*: Path to ssh-agent's UNXI socket for ssh-agent-based user authentication.
Windows users must set to 'pageant' for authenticating with Pagenat or (actual) path to a Cygwin "UNIX socket".
Id get more stability because some client/server have some sort of configured/hard coded limit.

## privateKeyPath
*string*: Absolute path to user's private key.

## passphrase
*mixed*: For an encrypted private key, this is the passphrase string used to decrypt it.
Set to true for enabling passphrase dialog. This will prevent from using cleartext passphrase in this config.

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
      "diffie-hellman-group-exchange-sha256"
    ],
    "cipher": [
      "aes128-gcm",
			"aes128-gcm@openssh.com",
			"aes256-gcm",
			"aes256-gcm@openssh.com",
			"aes128-cbc",
			"aes192-cbc",
			"aes256-cbc",
			"aes128-ctr",
			"aes192-ctr",
			"aes256-ctr"
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
      "hmac-sha2-512"
    ]
  }
}
```

## sshConfigPath
Absolute path to your SSH configuration file.

**default**: `~/.ssh/config`

## sshCustomParams
Extra parameters appended to the SSH command used by "Open SSH in Terminal".
