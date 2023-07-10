/**
 * Encapsulated IndexedDB Database which maps common operations to a `Promise`.
 */
export class DB {
    static #DB_NAME = "HuntShowStats";
    static #CURRENT_VERSION = 1;
    static #MIGRATIONS = {
        0: (/** @type {IDBDatabase} */ db) => {
            console.trace("Applying Migration 0: DB Initialisation");
    
            const game = db.createObjectStore("game", { keyPath: "id" });
            game.createIndex("date", "date", { unique: false });
    
            const profile = db.createObjectStore("profile", { keyPath: "id" });
            profile.createIndex("date", "date", { unique: false });
            
            const playerMMR = db.createObjectStore("playerMMR", { keyPath: ["game", "profile"] });
            playerMMR.createIndex("game", "game", { unique: false });
            playerMMR.createIndex("profile", "profile", { unique: false });
            playerMMR.createIndex("date", "date", { unique: false });
            
            const playerName = db.createObjectStore("playerName", { keyPath: ["profile", "name"] });
            playerName.createIndex("profile", "profile", { unique: false });
            playerName.createIndex("date", "date", { unique: false });
            
            const team = db.createObjectStore("team", { keyPath: ["game", "number"] });
            team.createIndex("game", "game", { unique: false });
            team.createIndex("number", "number", { unique: false });
            team.createIndex("date", "date", { unique: false });
            
            const teamMember = db.createObjectStore("teamMember", { keyPath: ["game", "number", "profile"] });
            teamMember.createIndex("game", "game", { unique: false });
            teamMember.createIndex("game_number", ["game", "number"], { unique: false });
            teamMember.createIndex("profile", "profile", { unique: false });
            teamMember.createIndex("date", "date", { unique: false });
            
            const eventStore = db.createObjectStore("event", { keyPath: ["game", "profile", "category", "label", "clock"] });
            eventStore.createIndex("game", "game", { unique: false });
            eventStore.createIndex("profile", "profile", { unique: false });
            eventStore.createIndex("category", "category", { unique: false });
            eventStore.createIndex("label", "label", { unique: false });
            eventStore.createIndex("clock", "clock", { unique: false });
            eventStore.createIndex("date", "date", { unique: false });
    
            return 1;
        }
    }

    /** @type {IDBDatabase} */
    #db = null;

    /**
     * Attempts to open a connection to the database, and stores it within this object.
     * @returns {Promise<void>}
     */
    async open() {
        if (this.#db != null) return;

        const persist = await navigator.storage.persist();

        if (persist) {
            console.log("Storage will not be cleared except by explicit user action");
        } else {
            console.log("Storage may be cleared by the UA under storage pressure.");
        }

        this.#db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(DB.#DB_NAME, DB.#CURRENT_VERSION);
            
            request.onerror = (event) => {
                console.error("Could not open an IndexDB", event);

                reject(event);
            };
            
            request.onsuccess = (event) => {
                console.trace("DB Opened", event);

                /** @type {IDBDatabase} */
                const db = event.target.result;

                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                console.trace("DB Upgrade Requested", event);

                /** @type {IDBDatabase} */
                const db = event.target.result;

                let currentVersion = event.oldVersion;
                while (currentVersion != event.newVersion) {
                    currentVersion = DB.#MIGRATIONS[currentVersion](db);
                }

                console.trace("DB Migrated");
            };
        });
    }

    /**
     * Wraps an `IDBRequest<T>` in a `Promise` to allow async interop.
     * @param {() => IDBRequest<T>} dbOperation A database operation to perform.
     * @returns {T} The result of the request.
     */
    static async do(dbOperation) {
        return await new Promise((resolve, reject) => {
            const operationResult = dbOperation();
    
            operationResult.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
    
            operationResult.onerror = (event) => {
                console.error("DB Operation Failed", event);
                reject(event);
            };
        });
    }

    /**
     * Start a new transaction with this database.
     * @param {string | Iterable<string>} storeNames Stores you are requesting access to.
     * @param {IDBTransactionMode | undefined} mode The mode you want for these stores.
     * @param {IDBTransactionOptions | undefined} options Additional options.
     * @returns A collection including the transaction, all object stores requested, and a `Promise` which will resolve when the transaction is completed.
     */
    transaction(storeNames, mode, options) {
        const transaction = this.#db.transaction(storeNames, mode, options);

        /** @type {Object.<string, IDBObjectStore>} */
        const stores = {};

        for (const storeName of storeNames) {
            stores[storeName] = transaction.objectStore(storeName);
        }

        const completed = new Promise((resolve, reject) => {
            transaction.oncomplete = (event) => {
                resolve();
            };

            transaction.onerror = (event) => {
                console.error("DB Transaction Failed", event);
                reject(event);
            }
        });

        return {
            transaction,
            stores,
            completed
        }
    }

    /**
     * Export the entire database.
     * @returns {any} JS Object representing items to be imported.
     */
    async export() {
        const { stores, completed } = this.transaction(this.#db.objectStoreNames, "readonly");

        const dump = {};
    
        for (const storeName in stores) {
            dump[storeName] = await DB.do(() => stores[storeName].getAll());
        }
    
        await completed;
    
        return dump;
    }

    /**
     * Import new data into the database.
     * @param {any} dump JS Object representing items to be imported.
     */
    async import(dump) {
        const { stores, completed } = this.transaction(this.#db.objectStoreNames, "readwrite");

        for (const storeName in dump) {
            for (const entry of dump[storeName]) {
                await DB.do(() => stores[storeName].put(entry));
            }
        }

        await completed;
    }
}