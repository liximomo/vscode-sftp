import * as PQueue from 'p-queue';

const queue = new PQueue();
const taskStartListeners = [];
const taskEndListeners = [];

function removeListenerFrom(listenerArr, listener) {
  const index = listenerArr.indexOf(listener);
  if (index > -1) listenerArr.splice(index, 1);
}

export function setConcurrency(c: number) {
  queue._concurrency = c;
}

export function addTask(task, priority) {
  return queue
    .add(
      () => {
        taskStartListeners.forEach(listener => listener(task));
        return task.run();
      },
      { priority }
    )
    .then(
      val => taskEndListeners.forEach(listener => listener(null, task, val)),
      err => taskEndListeners.forEach(listener => listener(err, task))
    );
}

export function onTaskStart(listener) {
  taskStartListeners.push(listener);
  return () => removeListenerFrom(taskStartListeners, listener);
}

export function onTaskEnd(listener) {
  taskEndListeners.push(listener);
  return () => removeListenerFrom(taskEndListeners, listener);
}

export function pause() {
  queue.pause();
}

export function start() {
  queue.start();
}
