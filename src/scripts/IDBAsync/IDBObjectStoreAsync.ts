import { IDBCursorAsyncIterator } from "./IDBCursorAsyncIterator";
import { IDBRequestAsync } from "./IDBRequestAsync";

export class IDBObjectStoreAsync<Entry, Indexes extends string | number | symbol> {
    #options: IDBObjectStoreAsyncOptions<Indexes>;

    constructor(
        store: IDBObjectStore,
        options?: IDBObjectStoreAsyncOptions<Indexes>
    ) {
        this.#options = options ?? {};
        this.#_store = store;
    }

    #_store: IDBObjectStore;
    get #store() {
        return this.#options.index ? this.#_store.index(this.#options.index as string) : this.#_store
    }

    reverse(): this {
        switch (this.#options.direction) {
            case "next": this.#options.direction = "prev"; break;
            case "prev": this.#options.direction = "next"; break;
            case "nextunique": this.#options.direction = "prevunique"; break;
            case "prevunique": this.#options.direction = "nextunique"; break;
            default: this.#options.direction = "prev"; break;
        }
        
        return this;
    }

    forwards(): this { return this.direction("next"); }

    backwards(): this { return this.direction("prev"); }

    direction(direction: IDBObjectStoreAsyncOptions<Indexes>["direction"]): this {
        this.#options.direction = direction;

        return this;
    }

    index(index?: IDBObjectStoreAsyncOptions<Indexes>["index"]): this {
        this.#options.index = index;

        return this;
    }

    where(query?: IDBObjectStoreAsyncOptions<Indexes>["query"]): this {
        this.#options.query = query;

        return this;
    }

    [Symbol.asyncIterator](): IDBCursorAsyncIterator<Entry> {
        const request = this.#store.openCursor(this.#options?.query, this.#options?.direction);

        return new IDBCursorAsyncIterator<Entry>(request);
    }

    async count(key?: IDBValidKey | IDBKeyRange): Promise<number> {
        return await IDBRequestAsync(this.#store.count(key ?? this.#options?.query));
    }

    async getAll(key?: IDBValidKey | IDBKeyRange): Promise<Entry[]> {
        return await IDBRequestAsync(this.#store.getAll(key ?? this.#options?.query));
    }

    async get(key?: IDBValidKey | IDBKeyRange): Promise<Entry> {
        return await IDBRequestAsync(this.#store.get(key ?? this.#options?.query));
    }
}

export type IDBObjectStoreAsyncOptions<Indexes extends string | number | symbol> = {
    index?: Indexes;
    query?: IDBValidKey | IDBKeyRange;
    direction?: IDBCursorDirection;
};