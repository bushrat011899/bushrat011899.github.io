/**
 * Creates a promise which resolves once the provided `condition` evaluates to true.
 * @param condition Synchronous condition which returns true once this promise can resolve.
 * @param period The time between checks in milliseconds.
 */
export async function until(condition: () => boolean, period = 100) {
    if (condition()) return;

    let interval;
    await new Promise<void>((resolve) => {
        interval = setInterval(() => {
            if (condition()) resolve();
        }, period);
    });
    clearInterval(interval);
}