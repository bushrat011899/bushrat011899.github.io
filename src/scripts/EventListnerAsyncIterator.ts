/**
 * Unwraps an event listener into an async iterator, allowing the user to use `break` to end event listening.
 */
export class EventListnerAsyncIterator<EventType extends string> {
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
    #push: Promise<IteratorResult<Event>> = null;

    /**
     * Resolves `this.#pull`, indicating a new item has been requested.
     */
    #resolvePull: (more: boolean) => void;

    /**
     * Resolves `this.#push`, indicating a new item is available.
     */
    #resolvePush: (result: IteratorResult<Event>) => void;

    constructor(target: EventTarget, type: EventType) {
        this.#pull = new Promise((resolve) => {
            this.#resolvePull = resolve;
        });

        this.#push = new Promise((resolve) => {
            this.#resolvePush = resolve;
        });

        const reactor = async (event: Event) => {
            const more = await this.#pull;

            if (!more) {
                target.removeEventListener(type, reactor);

                this.#resolvePush({
                    done: true,
                    value: undefined
                });

                return;
            }

            this.#pull = new Promise((resolve) => {
                this.#resolvePull = resolve;
            });

            this.#resolvePush({
                done: false,
                value: event
            });
        };

        target.addEventListener(type, reactor);
    }

    async next(): Promise<IteratorResult<Event>> {
        if (this.#done) return {
            done: true,
            value: undefined
        };

        this.#resolvePull(true);

        const result = await this.#push;

        if (result.done) this.#done = true;

        this.#push = new Promise((resolve) => {
            this.#resolvePush = resolve;
        });

        return result;
    }

    async return(): Promise<IteratorResult<Event>> {
        this.#resolvePull(false);

        return await this.#push;
    }
}