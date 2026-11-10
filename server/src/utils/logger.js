/* eslint-disable no-console */
// The only place that writes to the console, so it is easy to swap for a real logger later.
module.exports = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
};
