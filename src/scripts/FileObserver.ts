export class FileObserver extends EventTarget {
    #handle: FileSystemHandle;
    #lastModified = 0;
    #watchInterval = 5000;
    #intervalPointer: NodeJS.Timer = null;

    get ready() { return this.#handle != null; }

    async openPicker(pickerOptions?: any): Promise<void> {
        try {
            const [fileHandle] = await (window as any).showOpenFilePicker(pickerOptions);
        
            this.#handle = fileHandle;
        } catch(e) {
            console.error(e);
            alert(
`You cannot open this file. If your file is in a system folder (e.g., 'Program Files (x86)'), then you need to create a directory junction to allow your browser to open that file.

Alternatively, you can copy & paste your file into a different folder (e.g., 'Documents') to read the data once.`)
        }
    }

    async getFile(pickerOptions?: any): Promise<void> {
        if (!this.ready) await this.openPicker(pickerOptions);

        const file: File = await this.#handle.getFile();

        if (this.#lastModified >= file.lastModified) return;

        this.#lastModified = file.lastModified;

        this.dispatchEvent(new CustomEvent("change", {
            detail: file
        }));
    }

    start(): void {
        if (this.#intervalPointer != null) return;

        this.#intervalPointer = setInterval(() => {
            if (!this.ready) return;
            this.getFile();
        }, this.#watchInterval);
    }

    stop(): void {
        if (this.#intervalPointer == null) return;

        clearInterval(this.#intervalPointer);

        this.#intervalPointer = null;
    }

    constructor(options?: Partial<Options>) {
        super();

        this.#watchInterval = options?.watchInterval ?? this.#watchInterval;

        this.start();
    }
}

type Options = {
    watchInterval: number;
}

type FileSystemHandle = any;