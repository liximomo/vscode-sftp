import * as PQueue from './p-queue';

class Scheduler {
  private queue = new PQueue({ concurrency: 4 });

  constructor(option) {
    this.queue = new PQueue({ concurrency: option.concurrency });
  }

  getConcurrency() {
    return this.queue._concurrency;
  }

  setConcurrency(concurrency: number) {
    this.queue._concurrency = concurrency;
  }

  add(...args) {
    return this.queue.add.apply(this.queue, args);
  }

  clear(...args) {
    return this.queue.clear.apply(this.queue, args);
  }

  onIdle(cb) {
    return this.queue.onDone(cb);
  }
}

export default Scheduler;
