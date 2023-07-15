import { DB } from "./DB";
import { GameEventsHTMLOListElement } from "./GameEventsList";
import { GameTeamsHTMLTableElement } from "./GameTeamsTable";
import { mmrChart } from "./mmrChart";

export class GameDetailsHTMLDialogElement extends HTMLDialogElement {
    static #db: DB;
    static define(db: DB) {
        this.#db = db;
        customElements.define("hss-dialog-game-details", this, { extends: "dialog" });
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
        GameDetailsHTMLDialogElement.#db.onChange(["game", "teamMember", "playerName", "playerMMR"], () => this.update());
    }

    async update() {
        if (this.game == null) {
            this.close();
            return;
        }

        this.querySelector<GameTeamsHTMLTableElement>("table#gamePlayers").game = this.game;
        this.querySelector<GameEventsHTMLOListElement>("ol#gameEvents").game = this.game;

        const game = await GameDetailsHTMLDialogElement.#db.games().get(this.game);

        const players = [];
        
        for await (const teamMember of GameDetailsHTMLDialogElement.#db.teamMembers({ index: "game", query: this.game })) {
            const data = [];

            for await (const playerMMR of GameDetailsHTMLDialogElement.#db.playerMMRs({ index: "profile", query: teamMember.profile })) {
                data.push({
                    x: playerMMR.date,
                    y: Number.parseInt(playerMMR.mmr)
                });
            }

            data.sort((a, b) => b.x - a.x);

            players.push({
                name: await GameDetailsHTMLDialogElement.#db.currentPlayerName(teamMember.profile),
                data,
            });
        }

        const gameDate = new Date(game.date);

        this.querySelector("em").textContent = gameDate.toLocaleString();

        const mmrChartArea = this.querySelector("div[mmr-chart]")

        const chart = await mmrChart(players, game.date);

        mmrChartArea.replaceChildren(chart);
    }

    showModal(): void {
        if (this.open) return;

        super.showModal();
    }
}
