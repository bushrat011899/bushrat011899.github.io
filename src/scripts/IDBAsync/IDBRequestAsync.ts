/**
 * Wraps an `IDBRequest<T>` in a `Promise` to allow async interop.
 */
export class IDBRequestAsync<T> extends Promise<T> {
    constructor(request: IDBRequest<T>) {
        super((resolve, reject) => {
            request.onsuccess = (event) => {
                const result = (event.target as any).result;
                resolve(result);
            };
    
            request.onerror = (event) => {
                console.error("DB Operation Failed", event);
                reject(event);
            };
        })
    }
}
