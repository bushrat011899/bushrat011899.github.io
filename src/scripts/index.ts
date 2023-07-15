import { DB, Schema } from "./DB";
import { parseData } from "./parseData";
import { FileObserver } from "./FileObserver";
import { downloadFile } from "./downloadFile";
import { SortableHTMLTableCellElement } from "./SortableTable";
import { mmrChart } from "./mmrChart";
import { GamesHTMLTableElement } from "./GamesTable";
import { PlayersHTMLTableElement } from "./PlayersTable";
import { StorageUseEstimateHTMLSpanElement } from "./StorageUseEstimate";
import { GameTeamsHTMLTableElement } from "./GameTeamsTable";
import { GameEventsHTMLOListElement } from "./GameEventsList";
import { GameDetailsHTMLDialogElement } from "./GameDetailsDialog";
import { until } from "./until";

const db = new DB();

const fileObserver = new FileObserver();

export async function main() {
    StorageUseEstimateHTMLSpanElement.define();
    SortableHTMLTableCellElement.define();
    GamesHTMLTableElement.define(db);
    PlayersHTMLTableElement.define(db);
    GameTeamsHTMLTableElement.define(db);
    GameEventsHTMLOListElement.define(db);
    GameDetailsHTMLDialogElement.define(db);
    
    fileObserver.addEventListener("change", async (event) => {
        const file: File = (event as any).detail;
    
        const text = await file.text();
    
        const parser = new DOMParser();
        
        const doc = parser.parseFromString(text, "application/xml");
    
        const dump = await parseData(doc);
    
        await db.import(dump);
    });

    document.getElementById("fileButton").addEventListener("click", async (event) => {
        await fileObserver.getFile({
            types: [
                {
                    description: "Hunt Showdown Attributes",
                    accept: {
                        "text/xml": [".xml"],
                    },
                },
            ],
            excludeAcceptAllOption: true,
            multiple: false,
        });

        document.getElementById("fileButton").toggleAttribute("hidden", true);
    });

    document.getElementById("importButton").addEventListener("click", async () => {
        const fileInput = document.querySelector<HTMLInputElement>("footer input#import");
    
        fileInput.click();

        await until(() => fileInput.files[0] != null);
    
        const textDump = await fileInput.files[0].text();
    
        const dump = JSON.parse(textDump);
    
        await db.import(dump);
    });

    document.getElementById("exportButton").addEventListener("click", async () => {
        const dump = await db.export();
    
        const textDump = JSON.stringify(dump, null, 2);
    
        const file = new File([textDump], "export.json", {
            type: "application/json",
        });
    
        downloadFile(file);
    });

    document.getElementById("games").addEventListener("gameChosen", (event: CustomEvent) => {
        const game: Schema["game"] = event.detail;

        const dialog = document.querySelector<GameDetailsHTMLDialogElement>("dialog#gameDetails");

        dialog.game = game.id;
        dialog.showModal();
    });

    document.getElementById("players").addEventListener("profileChosen", (event: CustomEvent) => {
        const profile: Schema["profile"] = event.detail;

        showPlayerDetails(profile.id);
    });

    document.getElementById("gamePlayers").addEventListener("profileChosen", (event: CustomEvent) => {
        const profile: Schema["profile"] = event.detail;

        showPlayerDetails(profile.id);
    });
    
    await db.open();
}

async function showPlayerDetails(playerId: string) {
    const playerName = await db.currentPlayerName(playerId);

    const playerMMRs = await db.playerMMRs({ index: "profile" }).getAll(playerId);
    
    const gameDetails = document.querySelector<HTMLDialogElement>("dialog#playerDetails");
    const mmrChartArea = gameDetails.querySelector("div#chartArea");

    const playerNameElement = gameDetails.querySelector<HTMLAnchorElement>("a[name]");
    playerNameElement.textContent = playerName;
    playerNameElement.href = `https://www.steamidfinder.com/lookup/${playerName}/`;
    playerNameElement.target = "_blank";

    gameDetails.querySelector("span[profile]").textContent = playerId;

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
    
    const mmrStats = await db.playerMMRStatistics(playerId);

    gameDetails.querySelector("span[mmrAverage]").textContent = Math.floor(mmrStats.mean).toString();
    gameDetails.querySelector("span[mmrStd]").textContent = Math.floor(mmrStats.std).toString();

    const rivalry = await db.playerRivalry(playerId);

    gameDetails.querySelector("span[kills]").textContent = rivalry.kills.toString();
    gameDetails.querySelector("span[deaths]").textContent = rivalry.deaths.toString();
    gameDetails.querySelector("span[assists]").textContent = rivalry.assists.toString();
    gameDetails.querySelector("span[collateral]").textContent = rivalry.collateral.toString();

    gameDetails.showModal();
}
