// tslint:disable-next-line
// modified from https://raw.githubusercontent.com/sindresorhus/p-queue/a202b25d3e2f8d0472f85d501f7f558a7fa89b56/index.js

import { EventEmitter } from 'events';

// Port of lower_bound from http://en.cppreference.com/w/cpp/algorithm/lower_bound
// Used to compute insertion index to keep queue sorted after insertion
function lowerBound<T>(array: T[], value: T, comp: (a: T, b: T) => number) {
  let first = 0;
  let count = array.length;

  while (count > 0) {
    // tslint:disable-next-line no-bitwise
    const step = (count / 2) | 0;
    let it = first + step;

    if (comp(array[it], value) <= 0) {
      first = ++it;
      count -= step + 1;
    } else {
      count = step;
    }
  }

  return first;
}

export interface Task {
  run(): unknown | Promise<unknown>;
}

type taskFunc = Task['run'];

interface Queue<T> {
  enqueue(r: T): void;
  dequeue(): T;
  size: number;
}

class PriorityQueue<T> implements Queue<T> {
  constructor(private _queue: { priority: number; item: T }[] = []) {}

  enqueue(item: T, opts?) {
    opts = Object.assign(
      {
        priority: 0,
      },
      opts
    );

    const element = { priority: opts.priority, item };
    if (this.size && this._queue[this.size - 1].priority >= opts.priority) {
      this._queue.push(element);
      return;
    }

    const index = lowerBound(this._queue, element, (a, b) => b.priority - a.priority);
    this._queue.splice(index, 0, element);
  }

  dequeue(): T {
    return this._queue.shift().item;
  }

  get size(): number {
    return this._queue.length;
  }
}

const EVENT_TASK_START = 'task.start';
const EVENT_TASK_DONE = 'task.done';
const EVENT_IDLE = 'idle';

class Scheduler {
  private _queue: PriorityQueue<Task> = new PriorityQueue<Task>();
  private _pendingCount: number = 0;
  private _eventEmitter: EventEmitter = new EventEmitter();
  private _concurrency: number;
  private _isPaused: boolean;

  constructor(opts: { concurrency?: number; autoStart?: boolean } = {}) {
    opts = Object.assign(
      {
        concurrency: Infinity,
        autoStart: true,
      },
      opts
    );

    if (!(typeof opts.concurrency === 'number' && opts.concurrency >= 1)) {
      throw new TypeError(
        `Expected \`concurrency\` to be a number from 1 and up, got \`${
          opts.concurrency
        }\` (${typeof opts.concurrency})`
      );
    }

    this._concurrency = opts.concurrency;
    this._isPaused = opts.autoStart === false;
  }

  setConcurrency(concurrency: number) {
    this._concurrency = concurrency;
  }

  add(task: Task | taskFunc, opt?: { priority: number }) {
    if (typeof task === 'function') {
      task = {
        run: task,
      };
    }

    if (!this._isPaused && this._pendingCount < this._concurrency) {
      this._runTask(task);
    } else {
      this._queue.enqueue(task, opt);
    }
  }

  addAll(tasks: (Task | taskFunc)[]) {
    tasks.forEach(t => this.add(t));
  }

  start() {
    if (!this._isPaused) {
      return;
    }

    this._isPaused = false;
    while (this.size > 0 && this._pendingCount < this._concurrency) {
      this._runTask(this._queue.dequeue());
    }
  }

  pause() {
    this._isPaused = true;
  }

  onTaskStart(listener: (task: Task) => void) {
    this._eventEmitter.on(EVENT_TASK_START, listener);
  }

  onTaskDone(listener: (err: Error | null, task: Task) => void) {
    this._eventEmitter.on(EVENT_TASK_DONE, listener);
  }

  onIdle(listener: () => void) {
    this._eventEmitter.on(EVENT_IDLE, listener);
  }

  get isRunning() {
    return !this._isPaused;
  }

  get size() {
    return this._queue.size;
  }

  get pendingCount() {
    return this._pendingCount;
  }

  private _next() {
    if (this.size > 0) {
      if (!this._isPaused) {
        this._runTask(this._queue.dequeue());
      }
    } else if (this._pendingCount <= 0) {
      this._eventEmitter.emit(EVENT_IDLE);
    }
  }

  private async _runTask(task: Task) {
    this._pendingCount += 1;
    this._eventEmitter.emit(EVENT_TASK_START, task);

    let error = null;
    try {
      await task.run();
    } catch (err) {
      error = err;
    } finally {
      this._pendingCount -= 1;
      this._eventEmitter.emit(EVENT_TASK_DONE, error, task);
      this._next();
    }
  }
}

export default Scheduler;
