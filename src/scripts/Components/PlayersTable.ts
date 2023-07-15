import { DB } from "../DB";

export class PlayersHTMLTableElement extends HTMLTableElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-table-players", this, { extends: "table" });
    }

    connectedCallback() {
        PlayersHTMLTableElement.#db.onChange(["profile", "playerName", "playerMMR", "teamMember", "event"], () => this.update());
    }

    async update() {
        const tableBody = this.querySelector("tbody");

        const newRows: HTMLTableRowElement[] = [];

        for await (const profile of PlayersHTMLTableElement.#db.profiles()) {
            const rivalry = await PlayersHTMLTableElement.#db.playerRivalry(profile.id);
            const playerName = await PlayersHTMLTableElement.#db.currentPlayerName(profile.id);
            const playerMMRs = await PlayersHTMLTableElement.#db.playerMMRs().index("profile").getAll(profile.id);
            const playedGames = await PlayersHTMLTableElement.#db.teamMembers().index("profile").count(profile.id);

            const row = tableBody.querySelector(`tr[profile="${profile.id}"]`) ?? (() => {
                const row = document.createElement("tr");
                row.setAttribute("profile", profile.id);
                row.toggleAttribute("clickable", true);
                row.addEventListener("click", () => {
                    this.dispatchEvent(new CustomEvent("profileChosen", {
                        detail: profile
                    }));
                });
                
                const nameEntry = document.createElement("td");
                nameEntry.toggleAttribute("name", true);
                
                const MMREntry = document.createElement("td");
                MMREntry.toggleAttribute("mmr", true);
                
                const killsEntry = document.createElement("td");
                killsEntry.toggleAttribute("kills", true);
                
                const deathsEntry = document.createElement("td");
                deathsEntry.toggleAttribute("deaths", true);

                const assistsEntry = document.createElement("td");
                assistsEntry.toggleAttribute("assists", true);
                
                const playedGamesEntry = document.createElement("td");
                playedGamesEntry.toggleAttribute("games", true);

                row.append(nameEntry, MMREntry, killsEntry, deathsEntry, assistsEntry, playedGamesEntry);

                newRows.push(row);
                
                return row;
            })();

            const nameEntry = row.querySelector(`td[name]`);
            const MMREntry = row.querySelector(`td[mmr]`);
            const killsEntry = row.querySelector(`td[kills]`);
            const deathsEntry = row.querySelector(`td[deaths]`);
            const assistsEntry = row.querySelector(`td[assists]`);
            const playedGamesEntry = row.querySelector(`td[games]`);

            playerMMRs.sort((a, b) => b.date - a.date);
            
            nameEntry.textContent = playerName;
            (nameEntry as any).sortProperty = playerName.toLowerCase();
            
            MMREntry.textContent = playerMMRs[0].mmr;
            (MMREntry as any).sortProperty = Number.parseInt(playerMMRs[0].mmr);
            
            playedGamesEntry.textContent = playedGames.toString();
            (playedGamesEntry as any).sortProperty = playedGames;
        
            killsEntry.textContent = rivalry.kills.toString();
            (killsEntry as any).sortProperty = rivalry.kills;

            deathsEntry.textContent = rivalry.deaths.toString();
            (deathsEntry as any).sortProperty = rivalry.deaths;

            assistsEntry.textContent = rivalry.assists.toString();
            (assistsEntry as any).sortProperty = rivalry.assists;
        }

        tableBody.append(...newRows);

        tableBody.toggleAttribute("hidden", false);
    }
}
