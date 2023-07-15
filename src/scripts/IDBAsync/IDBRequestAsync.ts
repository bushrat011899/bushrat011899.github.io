/**
 * Wraps an `IDBRequest<T>` in a `Promise` to allow async interop.
 */
export function IDBRequestAsync<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const result = (event.target as any).result;
            resolve(result);
        };

        request.onerror = (event) => {
            console.error("DB Operation Failed", event);
            reject(event);
        };
    });
}
