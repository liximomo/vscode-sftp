# FTP Configuration

## secure
*mixed*: Set to true for both control and data connection encryption.
Set to `control` for control encryption only, or `implicit` for implicitly encrypted control connection (this mode is deprecated in modern times, but usually uses port 990).

**default**: false

## secureOptions
Additional options to be passed to `tls.connect()`.
See [TLS connect options callback](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback).
