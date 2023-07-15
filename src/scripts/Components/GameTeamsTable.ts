import { DB } from "../DB";

export class GameTeamsHTMLTableElement extends HTMLTableElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-table-game-teams", this, { extends: "table" });
    }

    static get observedAttributes() { return [
        "game"
    ]; }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return; // No Real Change

        switch (name) {
            case "game": return this.game = newValue;
        }
    }

    #game: string = null;
    get game() { return this.#game; }
    set game(value: string | null) {
        const changed = this.#game != value;
        this.#game = value;

        if (changed) {
            this.setAttribute("game", value);
            this.update();
        }
    }

    connectedCallback() {
        GameTeamsHTMLTableElement.#db.onChange(["teamMember", "team", "playerName", "playerMMR", "profile"], () => this.update());
    }

    async update() {
        const tableBody = this.querySelector("tbody");

        if (this.game == null) {
            tableBody.toggleAttribute("hidden", true);
            return;
        }

        let spannedRows: { [key: string]: boolean } = {};
        const newRows: HTMLTableRowElement[] = [];

        for await (const teamMember of GameTeamsHTMLTableElement.#db.teamMembers().index("game").where(this.game)) {
            const profile = await GameTeamsHTMLTableElement.#db.profiles().get(teamMember.profile);
            const team = await GameTeamsHTMLTableElement.#db.teams().get([this.game, teamMember.number]);
            const playerMMR = await GameTeamsHTMLTableElement.#db.playerMMRs().get([this.game, teamMember.profile]);

            const newColumns = [];

            const row = document.createElement("tr");
            row.setAttribute("player", teamMember.profile);
            row.toggleAttribute("own", team?.own ?? false);
            row.toggleAttribute("clickable", true);
            row.addEventListener("click", () => {
                this.dispatchEvent(new CustomEvent("profileChosen", {
                    detail: profile
                }));
            });

            if (!spannedRows[teamMember.number]) {
                const teamSize = await GameTeamsHTMLTableElement.#db.teamMembers().index("game_number").count([this.game, teamMember.number]);

                const teamEntry = document.createElement("td");
                teamEntry.setAttribute("rowspan", teamSize.toString());
                teamEntry.textContent = teamMember.number;
                spannedRows[teamMember.number] = true;
                newColumns.push(teamEntry);
            }

            const nameEntry = document.createElement("td");
            nameEntry.textContent = await GameTeamsHTMLTableElement.#db.currentPlayerName(teamMember.profile);
            newColumns.push(nameEntry);

            const MMREntry = document.createElement("td");
            MMREntry.textContent = playerMMR.mmr;
            newColumns.push(MMREntry);

            row.append(...newColumns);
            newRows.push(row);
        }

        tableBody.replaceChildren(...newRows);

        tableBody.toggleAttribute("hidden", false);
    }
}
