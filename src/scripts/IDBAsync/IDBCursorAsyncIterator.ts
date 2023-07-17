/**
 * Wraps an `IDBRequest<IDBCursorWithValue>` in an `AsyncIterator`, allowing `for await...of` syntax.
 * Uses a push-pull system to ensure each item is loaded from the database as it is needed.
 * The caller "pulls" an item out of the iterator that the IndexedDB "pushes".
 */
export class IDBCursorAsyncIterator<Entry> {
    /**
     * Get the current object as an `AsyncIterator`
     * @returns Itself
     */
    [Symbol.asyncIterator](): typeof this {
        return this;
    }

    /**
     * Indicates if the iterator is done.
     */
    #done = false;

    /**
     * Promise representing the caller requesting a new item from this iterator.
     */
    #pull: Promise<boolean> = null;

    /**
     * Promise representing the IndexedDB having a new item ready for the caller.
     */
    #push: Promise<IteratorResult<Entry>> = null;

    /**
     * Resolves `this.#pull`, indicating a new item has been requested.
     */
    #resolvePull: (more: boolean) => void;

    /**
     * Resolves `this.#push`, indicating a new item is available.
     */
    #resolvePush: (result: IteratorResult<Entry>) => void;

    /**
     * Replace the `#pull` promise with a new one.
     */
    #replacePull() {
        this.#pull = new Promise((resolve) => {
            this.#resolvePull = resolve;
        });
    }

    /**
     * Replace the `#push` promise with a new one.
     */
    #replacePush() {
        this.#push = new Promise((resolve) => {
            this.#resolvePush = resolve;
        });
    }

    constructor(request: IDBRequest<IDBCursorWithValue>) {
        this.#replacePull();
        this.#replacePush();

        request.onsuccess = async (event: IDBRequestSuccessEvent<IDBCursorWithValue>) => {
            const cursor = event.target.result;

            const more = await this.#pull;

            if (!more || !cursor) return this.#resolvePush({
                done: true,
                value: undefined
            });

            this.#replacePull();

            const entry: Entry = cursor.value;

            this.#resolvePush({
                done: false,
                value: entry
            });

            cursor.continue();
        };
    }

    async next(): Promise<IteratorResult<Entry>> {
        if (this.#done) return {
            done: true,
            value: undefined
        };

        this.#resolvePull(true);

        const result = await this.#push;

        if (result.done) this.#done = true;

        this.#replacePush();

        return result;
    }

    async return(): Promise<IteratorResult<Entry>> {
        this.#resolvePull(false);

        return await this.#push;
    }

    /**
     * Drives this iterator to completion, returning all results as an array.
     * 
     * NOTE: You probably don't want to use this method, and instead might prefer
     * a method to more explicitly request all entries from the DB itself.
     * @returns An array of all `Entry`'s
     */
    async all(): Promise<Entry[]> {
        const results = [];

        for await (const entry of this) {
            results.push(entry);
        }

        return results;
    }
}

type IDBRequestSuccessEvent<T> = Event & {
    target: IDBRequest<T>
};