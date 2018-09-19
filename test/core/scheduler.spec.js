const Scheduler = require('../../src/core/fileTransfer/scheduler').default;

const randomInt = function(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }

  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new TypeError('Expected all arguments to be numbers');
  }

  return Math.floor(Math.random() * (max - min + 1) + min);
};
const delay = millisecends =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, millisecends);
  });
const fixture = Symbol('fixture');

describe('scheduler', () => {
  test('.add()', () => {
    let result;
    const queue = new Scheduler();
    queue.add({
      run: () => {
        result = 1;
      },
    });
    queue.add(async () => fixture);
    expect(queue.size).toEqual(0);
    expect(queue.pendingCount).toEqual(2);
    expect(result).toEqual(1);
  });

  test('.add() - limited concurrency', () => {
    const queue = new Scheduler({ concurrency: 2 });
    queue.add(async () => fixture);
    queue.add(async () => delay(100).then(() => fixture));
    queue.add(async () => fixture);
    expect(queue.size).toEqual(1);
    expect(queue.pendingCount).toEqual(2);
  });

  test('.add() - concurrency: 1', done => {
    const input = [[10, 30], [20, 20], [30, 10]];

    const startTime = new Date().getTime();
    const queue = new Scheduler({ concurrency: 1 });
    input.forEach(([val, ms]) => queue.add(() => delay(ms).then(() => val)));
    queue.onPendingChange(() => {
      if (queue.size === 0 && queue.pendingCount === 0) {
        const time = new Date().getTime() - startTime;
        expect(50 <= time && time <= 100).toBeTruthy();
        done();
      }
    });
  });

  test('.add() - concurrency: 5', done => {
    const concurrency = 5;
    const queue = new Scheduler({ concurrency });
    let running = 0;

    new Array(50).fill(0).forEach(() =>
      queue.add(async () => {
        running++;
        expect(running <= concurrency).toBeTruthy();
        expect(queue.pendingCount <= concurrency).toBeTruthy();
        await delay(randomInt(0, 30));
        running--;
      })
    );

    queue.onPendingChange(() => {
      if (queue.size === 0 && queue.pendingCount === 0) {
        done();
      }
    });
  });

  test('.add() - priority', done => {
    const result = [];
    const queue = new Scheduler({ concurrency: 1 });
    queue.add(async () => result.push(0), { priority: 0 });
    queue.add(async () => result.push(1), { priority: 1 });
    queue.add(async () => result.push(2), { priority: 1 });
    queue.add(async () => result.push(3), { priority: 2 });
    queue.onPendingChange(() => {
      if (queue.size === 0 && queue.pendingCount === 0) {
        expect(result).toEqual([0, 3, 1, 2]);
        done();
      }
    });
  });

  test('.addAll()', () => {
    const queue = new Scheduler();
    const fn = async () => fixture;
    const fns = [fn, fn];
    queue.addAll(fns);
    expect(queue.size).toEqual(0);
    expect(queue.pendingCount).toEqual(2);
  });

  test('onTaskDone', done => {
    const queue = new Scheduler({ concurrency: 1 });
    const result = [];
    const tasks = [{ run: () => delay(10) }, { run: () => 'sync 1' }, { run: () => 'sync 2' }];
    queue.addAll(tasks);
    queue.onTaskDone((err, t) => {
      expect(err).toBeNull();

      result.push(t);
      if (queue.size === 0 && queue.pendingCount === 0) {
        expect(result).toEqual(tasks);
        done();
      }
    });
  });

  test('onTaskDone(error)', done => {
    const queue = new Scheduler({ concurrency: 2 });
    const task = { run: () => Promise.reject(new Error('error')) };
    queue.add(task);
    queue.onTaskDone((err, t) => {
      expect(err).toBeDefined();
      expect(err.message).toEqual('error');
      expect(t).toBe(task);
      done();
    });
  });

  test('onPendingChange', done => {
    const queue = new Scheduler({ concurrency: 1 });
    const task = { run: () => Promise.reject(new Error('error')) };
    let count = 0;
    queue.add(() => delay(10));
    queue.add(() => delay(20));
    queue.add(() => delay(30));
    queue.onPendingChange(() => {
      count++;

      if (queue.size === 0 && queue.pendingCount === 0) {
        expect(count).toEqual(3);
        done();
      }
    });
  });

  test('enforce number in options.concurrency', () => {
    expect(() => {
      new Scheduler({ concurrency: 0 });
    }).toThrow(TypeError);
    expect(() => {
      new Scheduler({ concurrency: undefined });
    }).toThrow(TypeError);
    expect(() => {
      new Scheduler({ concurrency: 1 });
    }).not.toThrow();
    expect(() => {
      new Scheduler({ concurrency: 10 });
    }).not.toThrow();
    expect(() => {
      new Scheduler({ concurrency: Infinity });
    }).not.toThrow();
  });

  test('autoStart: false', () => {
    const queue = new Scheduler({ concurrency: 2, autoStart: false });

    queue.add(() => delay(20000));
    queue.add(() => delay(20000));
    queue.add(() => delay(20000));
    queue.add(() => delay(20000));
    expect(queue.size).toEqual(4);
    expect(queue.pendingCount).toEqual(0);
    expect(queue._isPaused).toEqual(true);

    queue.start();
    expect(queue.size).toEqual(2);
    expect(queue.pendingCount).toEqual(2);
    expect(queue._isPaused).toEqual(false);
  });

  test('.pause()', () => {
    const queue = new Scheduler({ concurrency: 2 });

    queue.pause();
    queue.add(() => delay(20000));
    queue.add(() => delay(20000));
    queue.add(() => delay(20000));
    queue.add(() => delay(20000));
    queue.add(() => delay(20000));
    expect(queue.size).toEqual(5);
    expect(queue.pendingCount).toEqual(0);
    expect(queue._isPaused).toEqual(true);

    queue.start();
    expect(queue.size).toEqual(3);
    expect(queue.pendingCount).toEqual(2);
    expect(queue._isPaused).toEqual(false);

    queue.add(() => delay(20000));
    queue.pause();
    expect(queue.size).toEqual(4);
    expect(queue.pendingCount).toEqual(2);
    expect(queue._isPaused).toEqual(true);

    queue.start();
    expect(queue.size).toEqual(4);
    expect(queue.pendingCount).toEqual(2);
    expect(queue._isPaused).toEqual(false);
  });

  test('.add() sync/async mixed tasks', () => {
    const queue = new Scheduler({ concurrency: 1 });
    queue.add(() => 'sync 1');
    queue.add(() => delay(1000));
    queue.add(() => 'sync 2');
    queue.add(() => fixture);
    expect(queue.size).toEqual(3);
    expect(queue.pendingCount).toEqual(1);
  });

  test('.addAll() sync/async mixed tasks', () => {
    const queue = new Scheduler();
    const fns = [() => 'sync 1', () => delay(2000), () => 'sync 2', async () => fixture];
    queue.addAll(fns);
    expect(queue.size).toEqual(0);
    expect(queue.pendingCount).toEqual(4);
  });
});
