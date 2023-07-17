/**
 * Simple double-ended queue data structure.
 */
export class Queue<T> extends Array<T> {
    /**
     * Appends new elements to the end of this queue, and returns the new length of the queue.
     * @param items New elements to add to the array.
     * @returns The new length.
     */
    pushBack(...items: T[]): number {
        return this.unshift(...items);
    }

    /**
     * Appends new elements to the beginning of this queue, and returns the new length of the queue.
     * @param items New elements to add to the array.
     * @returns The new length.
     */
    pushFront(...items: T[]): number {
        return this.push(...items);
    }

    /**
     * Removes and returns the first item in the queue.
     * @returns The first item in the queue.
     */
    popFront(): T {
        return this.pop();
    }

    /**
     * Removes and returns the first item in the queue.
     * @returns The first item in the queue.
     */
    popBack(): T {
        if (!this.length) return undefined;
        return this.splice(0, 1)[0];
    }
}