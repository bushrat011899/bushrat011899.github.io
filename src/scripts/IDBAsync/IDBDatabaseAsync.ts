import { IDBDatabaseMigrations, IDBDatabaseSchema, IDBDatabaseTableSchema } from "./IDBDatabaseSchema";
import { IDBObjectStoreAsync, IDBObjectStoreAsyncOptions } from "./IDBObjectStoreAsync";
import { IDBRequestAsync } from "./IDBRequestAsync";

/**
 * Encapsulated IndexedDB Database which maps common operations to a `Promise`.
 */
export class IDBDatabaseAsync<
    Name extends string,
    Migrations extends IDBDatabaseMigrations,
    Schema extends IDBDatabaseSchema,
    Indexes extends IDBDatabaseTableSchema<Schema>
> extends EventTarget {
    constructor(name: Name, version: keyof Migrations, migrations: Migrations) {
        super();

        this.#name = name;
        this.#version = version;
        this.#migrations = migrations;
    }

    #name;
    #version;
    #migrations;

    #ready = false;
    get ready() { return this.#ready; }
    
    db: IDBDatabase = null;

    /**
     * Attempts to open a connection to the database, and stores it within this object.
     * @returns {Promise<void>}
     */
    async open(): Promise<void> {
        if (this.db != null) return;

        const persist = await navigator.storage.persist();

        if (persist) {
            console.log("Storage will not be cleared except by explicit user action");
        } else {
            console.log("Storage may be cleared by the UA under storage pressure.");
        }

        this.db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(this.#name, this.#version as number);
            
            request.onerror = (event: IDBRequestEvent<IDBDatabase>) => {
                console.error("Could not open an IndexDB", event);

                reject(event);
            };
            
            request.onsuccess = (event: IDBRequestEvent<IDBDatabase>) => {
                console.trace("DB Opened", event);

                const db = event.target.result;

                resolve(db);
            };

            request.onupgradeneeded = (event: IDBVersionChangeEvent & IDBRequestEvent<IDBDatabase>) => {
                console.trace("DB Upgrade Requested", event);

                const db = event.target.result;

                let currentVersion = event.oldVersion;
                while (currentVersion != event.newVersion) {
                    const migrations = this.#migrations;
                    const key = currentVersion as keyof typeof migrations;
                    currentVersion = migrations[key](db);
                }

                console.trace("DB Migrated");
            };
        });

        this.#ready = true;

        this.dispatchEvent(new CustomEvent("ready"));
    }

    /**
     * Cache the of the last transaction created if it's still active. Allows overlapping "transactions" in readonly mode.
     */
    #activeTransaction: any = null;

    /**
     * Start a new transaction with this database.
     * @param {string | Iterable<string>} storeNames Stores you are requesting access to.
     * @param {IDBTransactionMode | undefined} mode The mode you want for these stores.
     * @param {IDBTransactionOptions | undefined} options Additional options.
     * @returns A collection including the transaction, all object stores requested, and a `Promise` which will resolve when the transaction is completed.
     */
    transaction<K extends keyof Schema>(
        storeNames: Iterable<K> | K[],
        mode?: IDBTransactionMode,
        options?: IDBTransactionOptions
    ): {
        transaction: IDBTransaction;
        stores: { [key in K]: IDBObjectStore; };
    } {
        const readonly = mode == "readonly";

        if (readonly && this.#activeTransaction != null) {
            return this.#activeTransaction;
        }

        const allStores: string[] = [...(readonly ? this.db.objectStoreNames : storeNames)] as any;

        const transaction = this.db.transaction(allStores, mode, options);

        transaction.oncomplete = (event) => {
            this.#activeTransaction = null;
        };

        transaction.onabort = (event) => {
            console.error("DB Transaction Aborted", event);
            this.#activeTransaction = null;
        };

        transaction.onerror = (event) => {
            console.error("DB Transaction Failed", event);
            this.#activeTransaction = null;
        };

        if (!readonly) {
            transaction.addEventListener("complete", (event) => {
                this.dispatchEvent(new CustomEvent("change", {
                    detail: {
                        stores: storeNames
                    }
                }));
            });
        }

        const partialStores: Partial<{
            [key in K]: IDBObjectStore;
        }> = {};

        for (const storeName of allStores) {
            partialStores[storeName as keyof typeof partialStores] = transaction.objectStore(storeName);
        }

        const stores = partialStores as { [key in K]: IDBObjectStore; }

        const result = {
            transaction,
            stores
        };

        if (readonly) {
            this.#activeTransaction = result;
        }

        return result;
    }

    /**
     * Export the entire database.
     * @returns {Table<Schema>} JS Object representing items to be imported.
     */
    async export(): Promise<Table<Schema>> {
        const { stores } = this.transaction(this.db.objectStoreNames as any, "readonly");

        const dump: Partial<Table<Schema>> = {};
    
        for (const storeName in stores) {
            const name: keyof Table<Schema> = storeName as any;
            dump[name] = await IDBRequestAsync(stores[name].getAll());
        }
    
        return dump as Table<Schema>;
    }

    /**
     * Import new data into the database.
     * @param {Partial<Table<Schema>>} dump JS Object representing items to be imported.
     */
    async import(dump: Partial<Table<Schema>>) {
        const { stores } = this.transaction(this.db.objectStoreNames as any, "readwrite");

        for (const storeName in dump) {
            const name: keyof Table<Schema> = storeName as any;
            for (const entry of dump[name]) {
                await IDBRequestAsync(stores[name].put(entry));
            }
        }
    }

    /**
     * Executes a callback whenever there is a change to any of the provided stores.
     * @param storeNames Stores to watch for changes to.
     * @param callback Callback to execute once a change is detected.
     */
    onChange(storeNames: (keyof Schema)[], callback: () => unknown) {
        this.addEventListener("change", (event: DBChangeEvent<Schema>) => {
            const stores = [...event.detail.stores];

            for (const name of storeNames) {
                if (stores.includes(name)) {
                    callback();
                    break;
                }
            }
        });

        if (this.ready) callback();
        else this.addEventListener("ready", () => callback());
    }

    store<key extends keyof Schema>(store: key, options?: IDBObjectStoreAsyncOptions<keyof Indexes[key]["indexes"]>) {
        const { stores } = this.transaction([store], "readonly");

        return new IDBObjectStoreAsync<Schema[key], keyof Indexes[key]["indexes"]>(stores[store], options);
    }
}

type Table<Schema> = {
    [key in keyof Schema]: Schema[key][];
}

type DBChangeEvent<Schema> = CustomEvent<{
    stores: [keyof Schema]
}>;

type IDBRequestEvent<T> = Event & {
    target: IDBRequest<T>
};

