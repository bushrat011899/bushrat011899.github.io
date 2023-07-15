import { DB } from "./DB";

export class GamesHTMLTableElement extends HTMLTableElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-table-games", this, { extends: "table" });
    }

    connectedCallback() {
        GamesHTMLTableElement.#db.onChange(["game", "teamMember"], () => this.update());
    }

    async update() {
        const tableBody = this.querySelector("tbody");

        const newRows = [];

        for await (const game of GamesHTMLTableElement.#db.games({ index: "date" })) {
            const possibleRow = tableBody.querySelector(`tr[game="${game.id}"]`);
    
            if (possibleRow) continue;

            const playerCount = await GamesHTMLTableElement.#db.teamMembers({ index: "game" }).count(game.id);
    
            const row = document.createElement("tr");
            const dateEntry = document.createElement("td");
            const dateTimeEntry = document.createElement("time");
            const playerCountEntry = document.createElement("td");

            dateEntry.append(dateTimeEntry);
            row.append(dateEntry, playerCountEntry);
            newRows.push(row);

            row.setAttribute("game", game.id);
            row.toggleAttribute("clickable", true);
            row.addEventListener("click", () => {
                this.dispatchEvent(new CustomEvent("gameChosen", {
                    detail: game
                }));
            });

            dateTimeEntry.textContent = new Date(game.date).toLocaleString();
            dateTimeEntry.setAttribute("datetime", game.date.toString());
            (dateEntry as any).sortProperty = game.date;
    
            playerCountEntry.textContent = playerCount.toString();
            (playerCountEntry as any).sortProperty = playerCount;
        }

        tableBody.append(...newRows);

        tableBody.toggleAttribute("hidden", false);
    }
}
