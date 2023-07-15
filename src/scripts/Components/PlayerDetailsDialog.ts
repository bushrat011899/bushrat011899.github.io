import { DB, Schema } from "../DB";
import { mmrChart } from "../mmrChart";

export class PlayerDetailsHTMLDialogElement extends HTMLDialogElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-dialog-player-details", this, { extends: "dialog" });
    }

    static get observedAttributes() { return [
        "profile"
    ]; }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return; // No Real Change

        switch (name) {
            case "profile": return this.profile = newValue;
        }
    }

    #profile: Schema["profile"]["id"] = null;
    get profile() { return this.#profile; }
    set profile(value: string | null) {
        const changed = this.#profile != value;
        this.#profile = value;

        if (changed) {
            this.setAttribute("profile", value);
            this.update();
        }
    }

    connectedCallback() {
        PlayerDetailsHTMLDialogElement.#db.onChange(["playerName", "playerMMR", "event"], () => this.update());
    }

    async update() {
        if (this.profile == null) {
            this.close();
            return;
        }

        const playerName = await PlayerDetailsHTMLDialogElement.#db.currentPlayerName(this.profile);

        const playerMMRs = await PlayerDetailsHTMLDialogElement.#db.playerMMRs().index("profile").getAll(this.profile);
        
        const mmrChartArea = this.querySelector("div#chartArea");

        const playerNameElement = this.querySelector<HTMLAnchorElement>("a[name]");
        playerNameElement.textContent = playerName;
        playerNameElement.href = `https://www.steamidfinder.com/lookup/${playerName}/`;
        playerNameElement.target = "_blank";

        this.querySelector("span[profile]").textContent = this.profile;

        playerMMRs.sort((a, b) => a.date - b.date);

        const players = [{
            name: playerName,
            data: [...playerMMRs.map(entry => ({
                x: entry.date,
                y: Number.parseInt(entry.mmr)
            }))],
        }];

        const chart = await mmrChart(players);

        mmrChartArea.replaceChildren(chart);
        
        const mmrStats = await PlayerDetailsHTMLDialogElement.#db.playerMMRStatistics(this.profile);

        this.querySelector("span[mmrAverage]").textContent = Math.floor(mmrStats.mean).toString();
        this.querySelector("span[mmrStd]").textContent = Math.floor(mmrStats.std).toString();

        const rivalry = await PlayerDetailsHTMLDialogElement.#db.playerRivalry(this.profile);

        this.querySelector("span[kills]").textContent = rivalry.kills.toString();
        this.querySelector("span[deaths]").textContent = rivalry.deaths.toString();
        this.querySelector("span[assists]").textContent = rivalry.assists.toString();
        this.querySelector("span[collateral]").textContent = rivalry.collateral.toString();
    }

    showModal(): void {
        if (this.open) return;

        super.showModal();
    }
}
