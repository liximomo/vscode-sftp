* ftp concurrency error when autoSave and watcher.
* fastGet fastPut imporve single-file transfer speed
* https://github.com/sindresorhus/p-queue

benchmark p-queue with async-limit
downloadOnOpen: 'confirm'
use process.env.SSH_AUTH_SOCK for agent;
make command a abstract class
fastPut / fastGet in sftp


每个配置一个并发设置，两个不同并发的配置同时运行，队列并发会错误。解决方案 每个配置持久化一个并发队列

onIdle 不可靠， 需要一个时间发射器 每次队列空的时候都(延迟？)触发回调
