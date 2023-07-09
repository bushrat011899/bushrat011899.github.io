export class FileObserver extends EventTarget {
    #handle;
    #lastModified = 0;

    constructor() {
        super();
    }

    async openPicker(pickerOptions) {
        try {
            const [fileHandle] = await window.showOpenFilePicker(pickerOptions);
        
            this.#handle = fileHandle;
        } catch(e) {
            console.error(e);
            alert(
`You cannot open this file. If your file is in a system folder (e.g., 'Program Files (x86)'), then you need to create a directory junction to allow your browser to open that file.

Alternatively, you can copy & paste your file into a different folder (e.g., 'Documents') to read the data once.`)
        }
    }

    async getFile(pickerOptions) {
        if (!this.#handle) await this.openPicker(pickerOptions);

        /** @type {File} */
        const file = await this.#handle.getFile();

        if (this.#lastModified >= file.lastModified) return;

        console.trace("Detected Change");

        this.#lastModified = file.lastModified;
    }
}