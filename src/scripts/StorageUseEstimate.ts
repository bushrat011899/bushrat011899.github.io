export class StorageUseEstimateHTMLSpanElement extends HTMLSpanElement {
    static define() {
        customElements.define("hss-span-storage-use", this, { extends: "span" });
    }

    #intervalPointer: NodeJS.Timer;
    connectedCallback() {
        if (this.#intervalPointer) clearInterval(this.#intervalPointer);

        this.#intervalPointer = setInterval(async () => {
            await this.update();
        }, 60 * 1000);

        this.update();
    }

    disconnectedCallback() {
        if (this.#intervalPointer) clearInterval(this.#intervalPointer);
    }

    #usage = 0;
    #quota = 0;
    async update() {
        const quota = await navigator.storage.estimate();

        if ((quota.usage ?? 0 !== this.#usage) || (quota.quota ?? 0 !== this.#quota)) {
            this.#usage = quota.usage ?? 0;
            this.#quota = quota.quota ?? 0;

            const used = `${bytesToMegaBytes(this.#usage).toFixed(2)} MB`;
            const total = `${bytesToMegaBytes(this.#quota).toFixed(2)} MB`;

            this.textContent = `${used} / ${total}`;
        }
    }
}

const bytesToMegaBytes = (xB: number) => xB / 1024 / 1024;
