import { Queue } from "./Queue";

/**
 * Unwraps an event listener into an async iterator, allowing the user to use `break` to end event listening.
 */
export class EventQueue<
    EventType extends Event = Event
> {
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
    #push: Promise<void> = null;

    /**
     * Resolves `this.#pull`, indicating a new item has been requested.
     */
    #resolvePull: (more: boolean) => void;

    /**
     * Resolves `this.#push`, indicating a new item is available.
     */
    #resolvePush: () => void;

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

    /**
     * Queue of iteration results. This is to handle the case where the caller
     * takes longer to process the event than the event producer does to dispatch them.
     * 
     * Newest events are placed at the 0 index (`unshift`), and oldest are popped off the end (`pop`)
     */
    #queue: Queue<IteratorResult<EventType>> = new Queue();

    constructor(target: EventTarget, type: string) {
        this.#replacePull();
        this.#replacePush();

        const reactor = async (event: EventType) => {
            const more = await this.#pull;

            if (!more) {
                target.removeEventListener(type, reactor);

                this.#queue.pushBack({
                    done: true,
                    value: undefined
                });

                this.#resolvePush();

                return;
            }

            this.#replacePull();

            this.#queue.pushBack({
                done: false,
                value: event
            });

            this.#resolvePush();
        };

        target.addEventListener(type, reactor);
    }

    async next(): Promise<IteratorResult<EventType>> {
        if (this.#done) return {
            done: true,
            value: undefined
        };

        this.#resolvePull(true);

        // Don't need to wait for a push if there are already events in the queue
        if (!this.#queue.length) await this.#push;

        const result = this.#queue.popFront();

        if (result.done) this.#done = true;

        this.#replacePush();

        return result;
    }

    async return(): Promise<IteratorResult<EventType>> {
        this.#resolvePull(false);

        await this.#push;

        const result = this.#queue.popBack();

        return result;
    }
}