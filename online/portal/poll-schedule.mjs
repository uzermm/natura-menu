// Keep a start-to-start cadence without overlapping work or catch-up bursts.
export function nextPollDelay(started, finished, interval=15000) {
 return Math.max(1000, interval-Math.max(0,finished-started));
}
