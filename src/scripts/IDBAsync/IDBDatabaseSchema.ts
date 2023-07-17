/**
 * Represents the type that is stored in each DB store, where the key is a store name.
 */
export type IDBDatabaseSchema = {
    [key: string]: any;
};

/**
 * Represents a collection of database migrations, where the key is the current database version.
 */
export type IDBDatabaseMigrations = {
    [key: number]: (db: IDBDatabase) => keyof IDBDatabaseMigrations;
};

export type IDBDatabaseTableSchema<Schema extends IDBDatabaseSchema> = {
    [key in keyof Schema]: {
        key: keyof Schema[key] | Iterable<keyof Schema[key]>;
        indexes: {
            [index: string]: keyof Schema[key] | Iterable<keyof Schema[key]>;
        }
    }
};

export function createSchema<
    Schema extends IDBDatabaseSchema,
    Tables extends IDBDatabaseTableSchema<Schema>
>(
    db: IDBDatabase,
    tables: Tables
) {
    for (const tableName in tables) {
        const table = tables[tableName];

        const store = db.createObjectStore(tableName, { keyPath: table.key as string | string[] });

        for (const indexName in table.indexes) {
            const index = table.indexes[indexName];
            store.createIndex(indexName, index as string | string[], { unique: false });
        }
    }
}