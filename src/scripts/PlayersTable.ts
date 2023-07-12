import { DB, DBDump, EventEntry, PlayerMMREntry, PlayerNameEntry, ProfileEntry } from "./DB";

export class PlayersHTMLTableElement extends HTMLTableElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-table-players", this, { extends: "table" });
    }

    connectedCallback() {
        PlayersHTMLTableElement.#db.addEventListener("change", async (event: CustomEvent) => {
            const stores: [keyof DBDump] = event.detail.stores;

            const changed = stores.includes("profile")
                || stores.includes("playerName")
                || stores.includes("playerMMR")
                || stores.includes("teamMember")
                || stores.includes("event");

            if (changed) await this.update();
        });

        if (PlayersHTMLTableElement.#db.ready) this.update(); // Fire-and-Forget
        else {
            PlayersHTMLTableElement.#db.addEventListener("ready", async () => {
                await this.update();
            })
        }
    }

    async update() {
        const { stores, completed } = PlayersHTMLTableElement.#db.transaction([
            "profile", "playerName", "playerMMR", "teamMember", "event"
        ], "readonly");

        const profiles: ProfileEntry[] = await DB.do(() => stores.profile.getAll());

        const tableBody = this.querySelector("tbody");

        const newRows: HTMLTableRowElement[] = [];

        for (const profile of profiles) {
            const playerNames: PlayerNameEntry[] = await DB.do(() => stores.playerName.index("profile").getAll(profile.id));
            const playerMMRs: PlayerMMREntry[] = await DB.do(() => stores.playerMMR.index("profile").getAll(profile.id));
            const events: EventEntry[] = await DB.do(() => stores.event.index("profile").getAll(profile.id));
            const playedGames = await DB.do(() => stores.teamMember.index("profile").count(profile.id));
            const rivalry = await playerRivalry(events);

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

            playerNames.sort((a, b) => b.date - a.date);
            playerMMRs.sort((a, b) => b.date - a.date);
            
            nameEntry.textContent = playerNames[0].name;
            (nameEntry as any).sortProperty = playerNames[0].name.toLowerCase();
            
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
        
        await completed;

        tableBody.append(...newRows);

        tableBody.toggleAttribute("hidden", false);
    }
}

async function playerRivalry(events: EventEntry[]) {
    const stats = {
        kills: 0,
        deaths: 0,
        assists: 0,
        collateral: 0
    };

    for (const event of events) {
        if (event.category == "downedbyme" || event.category == "killedbyme") {
            stats.kills += 1;
        } else if (event.category == "downedme" || event.category == "killedme") {
            stats.deaths += 1;
        } else if (event.category == "downedbyteammate" || event.category == "killedbyteammate") {
            stats.assists += 1;
        } else if (event.category == "downedteammate" || event.category == "killedteammate") {
            stats.collateral += 1;
        }
    }

    return stats;
}
