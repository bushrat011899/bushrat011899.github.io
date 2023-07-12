import { DB, DBDump, GameEntry } from "./DB";

export class GamesHTMLTableElement extends HTMLTableElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-table-games", this, { extends: "table" });
    }

    connectedCallback() {
        GamesHTMLTableElement.#db.addEventListener("change", async (event: CustomEvent) => {
            const stores: [keyof DBDump] = event.detail.stores;

            if (stores.includes("game") || stores.includes("teamMember")) {
                await this.update();
            }
        });

        if (GamesHTMLTableElement.#db.ready) this.update(); // Fire-and-Forget
        else {
            GamesHTMLTableElement.#db.addEventListener("ready", async () => {
                await this.update();
            })
        }
    }

    async update() {
        const { stores, completed } = GamesHTMLTableElement.#db.transaction([
            "game", "teamMember"
        ], "readonly");

        const games: GameEntry[] = await DB.do(() => stores.game.index("date").getAll());

        const tableBody = this.querySelector("tbody");

        const newRows = [];

        for (const game of games) {
            const possibleRow = tableBody.querySelector(`tr[game="${game.id}"]`);
    
            if (possibleRow) continue;
    
            const playerCount = await DB.do(() => stores.teamMember.index("game").count(game.id));
    
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

        await completed;

        tableBody.append(...newRows);

        tableBody.toggleAttribute("hidden", false);
    }
}
