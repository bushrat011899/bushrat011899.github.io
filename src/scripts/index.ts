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
import { until } from "./Utils/until";
import { EventListnerAsyncIterator } from "./EventListnerAsyncIterator";
import { PlayerDetailsHTMLDialogElement } from "./Components/PlayerDetailsDialog";

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

    (async () => { for await (const change of fileObserver) {
        const file: File = (change as any).detail;

        const text = await file.text();
    
        const parser = new DOMParser();
        
        const doc = parser.parseFromString(text, "application/xml");
    
        const dump = await parseData(doc);
    
        await db.import(dump);
    }})();

    const fileButton = document.getElementById("fileButton");

    (async () => { for await (const _ of new EventListnerAsyncIterator(fileButton, "click")) {
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
    }})();

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

        const dialog = document.querySelector<PlayerDetailsHTMLDialogElement>("dialog#playerDetails");

        dialog.profile = profile.id;
        dialog.showModal();
    });

    document.getElementById("gamePlayers").addEventListener("profileChosen", (event: CustomEvent) => {
        const profile: Schema["profile"] = event.detail;

        const dialog = document.querySelector<PlayerDetailsHTMLDialogElement>("dialog#playerDetails");

        dialog.profile = profile.id;
        dialog.showModal();
    });
    
    await db.open();
}
