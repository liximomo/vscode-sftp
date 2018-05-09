import Scheduler from './Scheduler';
import { sftpBarItem } from '../global';

const schedulerMap: Map<string, Scheduler> = new Map();

function getScheduler(config) {
  const identity = config.context;
  let scheduler: Scheduler;
  if (schedulerMap.has(identity)) {
    scheduler = schedulerMap.get(identity);

    if (scheduler.getConcurrency() !== config.concurrency) {
      scheduler.setConcurrency(config.concurrency);
    }

    return scheduler;
  }

  scheduler = new Scheduler({ concurrency: config.concurrency });
  schedulerMap.set(identity, scheduler);
  scheduler.onIdle(() => {
    sftpBarItem.showMsg('done');
    setTimeout(() => {
      sftpBarItem.clear();
    }, 5 * 1000);
  });
  return scheduler;
}

export default {
  getScheduler,
};
