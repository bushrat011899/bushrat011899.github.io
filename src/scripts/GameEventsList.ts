import { DB } from "./DB";

export class GameEventsHTMLOListElement extends HTMLOListElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-ol-game-events", this, { extends: "ol" });
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
        GameEventsHTMLOListElement.#db.onChange(["event", "playerName"], () => this.update());
    }

    async update() {
        if (this.game == null) {
            this.toggleAttribute("hidden", true);
            return;
        }

        const events = await GameEventsHTMLOListElement.#db.events({ index: "game" }).getAll(this.game);

        events.sort((a, b) => a.clock - b.clock);
        
        const newItems: HTMLLIElement[] = [];

        for (const event of events) {
            const entry = document.createElement("li");
            newItems.push(entry);
    
            const seconds = event.clock % 60;
            const minutes = (event.clock - seconds) / 60;
            const clock = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            const name = await GameEventsHTMLOListElement.#db.currentPlayerName(event.profile);
    
            const category = CATEGORY_MAP[event.category as keyof typeof CATEGORY_MAP] ?? event.category;
    
            const label = LABEL_MAP[event.label as keyof typeof LABEL_MAP] ?? event.label;
    
            const clockEntry = document.createElement("b");
            clockEntry.textContent = clock;
    
            const spacer1 = document.createElement("span");
            spacer1.textContent = " ";
    
            const playerNameEntry = document.createElement("em");
            playerNameEntry.textContent = name;
    
            const spacer2 = document.createElement("span");
            spacer2.textContent = " ";
    
            const detailsEntry = document.createElement("span");
            detailsEntry.textContent = label;

            entry.append(clockEntry, spacer1, playerNameEntry, spacer2, detailsEntry);
        }

        this.replaceChildren(...newItems);

        this.toggleAttribute("hidden", false);
    }
}

const CATEGORY_MAP = {
    "bountyextracted": "Bounty Extracted",
    "bountypickedup": "Bounty Picked Up",
    "downedbyme": "Downed By Me",
    "downedbyteammate": "Downed By Teammate",
    "downedme": "Downed Me",
    "downedteammate": "Downed Teammate",
    "killedbyme": "Killed By Me",
    "killedbyteammate": "Killed By Teammate",
    "killedme": "Killed Me",
    "killedteammate": "Killed Teammate"
};

const LABEL_MAP = {
    "@ui_mmr_killed_hunter ~~@ui_team_details_killed": "Was Killed By Me",
    "@ui_mmr_died_to_hunter ~~@ui_team_details_killed": "Killed Me",
    "@ui_team_details_carried_bounty": "Picked Up Bounty",
    "@ui_team_details_hunter_downed_teammate ~~@ui_team_details_downed": "Downed Teammate",
    "@ui_team_details_downed": "Downed Teammate",
    "@ui_team_details_hunter_downed_you ~~@ui_team_details_downed": "Downed Me",
    "@ui_team_details_killed_by_team_mate ~~@ui_team_details_downed": "Was Killed By Teammate",
    "@ui_team_details_killed_by_team_mate ~~@ui_team_details_killed": "Was Killed By Teammate",
    "@ui_team_details_killed_team_mate ~~@ui_team_details_downed": "Downed Teammate",
    "@ui_team_details_killed_team_mate ~~@ui_team_details_killed": "Killed Teammate",
    "@ui_team_details_killed": "Killed Teammate",
    "@ui_team_details_teammate_downed_hunter ~~@ui_team_details_downed": "Was Downed By Teammate",
    "@ui_team_details_you_downed_hunter ~~@ui_team_details_downed": "Was Downed By Me",
    "@ui_team_details_extracted_bounty": "Extracted With Bounty"
};