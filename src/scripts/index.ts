import { DB, Schema } from "./DB";
import { parseData } from "./parseData";
import { FileObserver } from "./FileObserver";
import { downloadFile } from "./Utils/downloadFile";
import { SortableHTMLTableCellElement } from "./Components/SortableTable";
import { GamesHTMLTableElement } from "./Components/GamesTable";
import { PlayersHTMLTableElement } from "./Components/PlayersTable";
import { StorageUseEstimateHTMLSpanElement } from "./Components/StorageUseEstimate";
import { GameTeamsHTMLTableElement } from "./Components/GameTeamsTable";
import { GameEventsHTMLOListElement } from "./Components/GameEventsList";
import { GameDetailsHTMLDialogElement } from "./Components/GameDetailsDialog";
import { EventQueue } from "./EventQueue";
import { PlayerDetailsHTMLDialogElement } from "./Components/PlayerDetailsDialog";
import { runAll } from "./Utils/runAll";

export async function main() {
    const db = new DB();
    
    const fileObserver = new FileObserver();

    StorageUseEstimateHTMLSpanElement.define();
    SortableHTMLTableCellElement.define();
    GamesHTMLTableElement.define(db);
    PlayersHTMLTableElement.define(db);
    GameTeamsHTMLTableElement.define(db);
    GameEventsHTMLOListElement.define(db);
    GameDetailsHTMLDialogElement.define(db);
    PlayerDetailsHTMLDialogElement.define(db);
    
    await db.open();

    const fileButton = document.getElementById("fileButton");
    const fileInput = document.querySelector<HTMLInputElement>("footer input#import");
    const importButton = document.getElementById("importButton");
    const exportButton = document.getElementById("exportButton");
    const gamesTable = document.getElementById("games");
    const playersTable = document.getElementById("players");
    const gamePlayersTable = document.getElementById("gamePlayers");
    const gameDetailsDialog = document.querySelector<GameDetailsHTMLDialogElement>("dialog#gameDetails");
    const playerDetailsDialog = document.querySelector<PlayerDetailsHTMLDialogElement>("dialog#playerDetails");

    await runAll(
        async () => {
            for await (const change of fileObserver) {
                const text = await change.detail.text();
                
                const doc = new DOMParser().parseFromString(text, "application/xml");
            
                const dump = await parseData(doc);
            
                await db.import(dump);
            }
        },

        async () => {
            for await (const _ of new EventQueue(fileButton, "click")) {
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
        
                fileButton.toggleAttribute("hidden", true);
        
                break;
            }
        },

        async () => {
            for await (const _ of new EventQueue(importButton, "click")) {
                fileInput.click();
            }
        },

        async () => {
            for await (const _ of new EventQueue(fileInput, "change")) {
                const textDump = await fileInput.files[0].text();
            
                const dump = JSON.parse(textDump);
            
                await db.import(dump);
            }
        },

        async () => {
            for await (const _ of new EventQueue(exportButton, "click")) {
                const dump = await db.export();
            
                const textDump = JSON.stringify(dump, null, 2);
            
                const file = new File([textDump], "export.json", {
                    type: "application/json",
                });
            
                downloadFile(file);
            }
        },

        async () => {
            for await (const event of new EventQueue<CustomEvent<Schema["game"]>>(gamesTable, "gameChosen")) {
                gameDetailsDialog.game = event.detail.id;
                gameDetailsDialog.showModal();
            }
        },

        async () => {
            for await (const event of new EventQueue<CustomEvent<Schema["profile"]>>(playersTable, "profileChosen")) {
                playerDetailsDialog.profile = event.detail.id;
                playerDetailsDialog.showModal();
            }
        },

        async () => {
            for await (const event of new EventQueue<CustomEvent<Schema["profile"]>>(gamePlayersTable, "profileChosen")) {
                playerDetailsDialog.profile = event.detail.id;
                playerDetailsDialog.showModal();
            }
        },
    );
}
