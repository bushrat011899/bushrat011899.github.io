/**
 * Runs all provided async functions in parallel by first invoking the async
 * function to collect a promise, and then passing said promises into `Promise.all`
 * @param tasks List of async functions to run in parallel.
 * @returns A list of all results in order.
 */
export async function runAll(...tasks: (() => Promise<any>)[]): Promise<any[]> {
    return Promise.all(tasks.map(task => task()));
}