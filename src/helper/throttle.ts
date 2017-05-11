export default function throttle(func, delay, {
  trailing = true
} = {}) {
  let lastExec = - (delay + 1);
  let timeout;

  function wrapper(...args) {
    const elapsed = Number(new Date()) - lastExec;

    const exec = (trail) => () => {
      lastExec = trail ? - (delay + 1) : Number(new Date());
      func.apply(this, args);
      // timeout = null;
    }

    if (timeout) {
      clearTimeout(timeout);
    }
    
    if (elapsed > delay) {
      exec(false)();
    } else if (trailing) {
      timeout = setTimeout(exec(true),  delay - elapsed);
    }
  };

  return wrapper; 
}
