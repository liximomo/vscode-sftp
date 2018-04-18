import * as PQueue from 'p-queue';

const nullFunction = () => null;

let interalOnEmpty = nullFunction;

function onEmpty() {
  interalOnEmpty();
}

const queueWrapper = {
  _queue: new PQueue(),
  setConcurrency(concurrency) {
    if (this._queue && this._queue.pending > 0) {
      if (interalOnEmpty === nullFunction) {
        this._queue.onIdle().then(onEmpty);
      }
      interalOnEmpty = () => {
        this._queue = new PQueue({ concurrency });
        interalOnEmpty = nullFunction;
      };
    }

    this._queue = new PQueue({ concurrency });
  },
};

['add', 'pause', 'start', 'clear'].forEach(method => {
  queueWrapper[method] = (...args) => {
    return queueWrapper._queue[method].apply(queueWrapper._queue, args);
  };
});

export default queueWrapper;
