import { DB } from "./DB";
import { parseData } from "./attributesFile";
import { FileObserver } from "./FileObserver";
import { downloadFile } from "./downloadFile";
import { sortTable } from "./sortTable";
import Chart from 'chart.js/auto';
import './style.css';

const db = new DB();

const fileObserver = new FileObserver();

async function playerRivalry(id: string) {
    const { stores, completed } = db.transaction(["event"], "readonly");
    
    const events = await DB.do(() => stores.event.index("profile").getAll(id));

    await completed;

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

async function playerMMRStats(id: string) {
    const { stores, completed } = db.transaction(["playerMMR"], "readonly");

    const mmrs = await DB.do(() => stores.playerMMR.index("profile").getAll(id));

    await completed;

    /** @type {number} */
    const count = mmrs.length;

    const sum1 = mmrs.reduce((s, entry) => s + Number.parseInt(entry.mmr), 0);
    const sum2 = mmrs.reduce((s, entry) => s + Number.parseInt(entry.mmr) ** 2, 0);

    const countS1 = count > 0 ? count : 1;
    const countS2 = count > 1 ? count - 1 : 1;
    const mean = sum1 / countS1;
    const variance = Math.sqrt((sum2 / countS1 - mean ** 2) * count / countS2);

    const stats = {
        mean,
        std: Math.sqrt(variance),
        count
    };

    return stats;
}

async function updateTableOfGames() {
    const { stores, completed } = db.transaction(["game", "teamMember"], "readonly");

    const games = await DB.do(() => stores.game.index("date").getAll());

    const tableBody = document.querySelector("table#games > tbody");

    for (const game of games) {
        let possibleRow = tableBody.querySelector(`tr[game="${game.id}"]`);

        if (possibleRow) continue;

        const row = document.createElement("tr");
        row.setAttribute("game", game.id);
        tableBody.append(row);

        const dateEntry = document.createElement("td");
        (dateEntry as any).sortProperty = game.date;
        const dateTimeEntry = document.createElement("time");
        dateTimeEntry.textContent = new Date(game.date).toLocaleString();
        dateTimeEntry.setAttribute("datetime", game.date)
        dateEntry.append(dateTimeEntry);
        row.append(dateEntry);

        const playerCount = await DB.do(() => stores.teamMember.index("game").count(game.id));

        const playerCountEntry = document.createElement("td");
        playerCountEntry.textContent = playerCount.toString();
        (playerCountEntry as any).sortProperty = playerCount;
        row.append(playerCountEntry);

        row.toggleAttribute("clickable", true);

        row.addEventListener("click", () => {
            showGameDetails(game.id);
        });
    }

    await completed;
}

async function showGameDetails(gameId: string) {
    const gameDetails: HTMLDialogElement = document.querySelector("dialog#gameDetails");
    const tableBody = gameDetails.querySelector("table#gamePlayers > tbody");

    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.lastChild);
    }

    const { stores, completed } = db.transaction(["game", "teamMember", "playerName", "playerMMR", "event", "team"], "readonly");

    const game = await DB.do(() => stores.game.get(gameId));

    const gameDate = new Date(game.date);

    const teamMembers = await DB.do(() => stores.teamMember.index("game").getAll(gameId));

    gameDetails.querySelector("em").textContent = gameDate.toLocaleString();

    const playerNameMapping: any = {};
    let spannedRows: any = {};

    for (const teamMember of teamMembers) {
        const teamSize = await DB.do(() => stores.teamMember.index("game_number").count([gameId, teamMember.number]));
        const team = await DB.do(() => stores.team.get([gameId, teamMember.number]));

        const row = document.createElement("tr");
        row.setAttribute("player", teamMember.profile);
        row.toggleAttribute("own", team?.own ?? false);
        tableBody.append(row);

        if (!spannedRows[teamMember.number]) {
            const teamEntry = document.createElement("td");
            teamEntry.setAttribute("rowspan", teamSize.toString());
            teamEntry.textContent = teamMember.number;
            row.append(teamEntry);
            spannedRows[teamMember.number] = true;
        }

        const playerNames = await DB.do(() => stores.playerName.index("profile").getAll(teamMember.profile));

        playerNames.sort((a, b) => b.date - a.date);

        playerNameMapping[teamMember.profile] = playerNames[0].name;

        const nameEntry = document.createElement("td");
        nameEntry.textContent = playerNameMapping[teamMember.profile];
        row.append(nameEntry);

        const playerMMR = await DB.do(() => stores.playerMMR.get([gameId, teamMember.profile]));

        const MMREntry = document.createElement("td");
        MMREntry.textContent = playerMMR.mmr;
        row.append(MMREntry);

        row.toggleAttribute("clickable", true);

        row.addEventListener("click", () => {
            showPlayerDetails(teamMember.profile);
        });
    }

    const events = await DB.do(() => stores.event.index("game").getAll(gameId));

    await completed;

    events.sort((a, b) => a.clock - b.clock);

    const eventsList = gameDetails.querySelector("ol[events]");

    while (eventsList.firstChild) {
        eventsList.removeChild(eventsList.lastChild);
    }

    for (const event of events) {
        const entry = document.createElement("li");
        eventsList.append(entry);

        const seconds = event.clock % 60;
        const minutes = (event.clock - seconds) / 60;
        const clock = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        const name = playerNameMapping[event.profile];

        const categoryMap = {
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

        const category = categoryMap[event.category as keyof typeof categoryMap] ?? event.category;

        const labelMap = {
            "@ui_mmr_killed_hunter ~~@ui_team_details_killed": "Was Killed By Me",
            "@ui_mmr_died_to_hunter ~~@ui_team_details_killed": "Killed Me",
            "@ui_team_details_carried_bounty": "Picked Up Bounty",
            "@ui_team_details_hunter_downed_teammate ~~@ui_team_details_downed": "Downed Teammate",
            "@ui_team_details_downed": "Downed Teammate",
            "@ui_team_details_hunter_downed_you ~~@ui_team_details_downed": "Downed Me",
            "@ui_team_details_killed_by_team_mate ~~@ui_team_details_killed": "Was Killed By Teammate",
            "@ui_team_details_killed_team_mate ~~@ui_team_details_downed": "Downed Teammate",
            "@ui_team_details_killed_team_mate ~~@ui_team_details_killed": "Killed Teammate",
            "@ui_team_details_killed": "Killed Teammate",
            "@ui_team_details_teammate_downed_hunter ~~@ui_team_details_downed": "Was Downed By Teammate",
            "@ui_team_details_you_downed_hunter ~~@ui_team_details_downed": "Was Downed By Me",
            "@ui_team_details_extracted_bounty": "Extracted With Bounty",
        };

        const label = labelMap[event.label as keyof typeof labelMap] ?? event.label;

        const clockEntry = document.createElement("b");
        entry.append(clockEntry);
        clockEntry.textContent = clock;

        const spacer1 = document.createElement("span");
        entry.append(spacer1);
        spacer1.textContent = " ";

        const playerNameEntry = document.createElement("em");
        entry.append(playerNameEntry);
        playerNameEntry.textContent = name;

        const spacer2 = document.createElement("span");
        entry.append(spacer2);
        spacer2.textContent = " ";

        const detailsEntry = document.createElement("span");
        entry.append(detailsEntry);
        detailsEntry.textContent = label;
    }

    gameDetails.showModal();
}

async function updateTableOfPlayers() {
    const { stores, completed } = db.transaction(["profile", "playerName", "playerMMR", "teamMember"], "readonly");

    const profiles = await DB.do(() => stores.profile.getAll());

    const tableBody = document.querySelector("table#players > tbody");

    for (const profile of profiles) {
        const row = tableBody.querySelector(`tr[profile="${profile.id}"]`) ?? (() => {
            const row = document.createElement("tr");
            row.setAttribute("profile", profile.id);
            tableBody.append(row);
            return row;
        })();

        const playerNames = await DB.do(() => stores.playerName.index("profile").getAll(profile.id));

        playerNames.sort((a, b) => b.date - a.date);

        const nameEntry = row.querySelector(`td[name]`) ?? (() => {
            const nameEntry = document.createElement("td");
            nameEntry.toggleAttribute("name", true);
            row.append(nameEntry);
            return nameEntry;
        })();
        
        nameEntry.textContent = playerNames[0].name;
        (nameEntry as any).sortProperty = playerNames[0].name.toLowerCase();

        const playerMMRs = await DB.do(() => stores.playerMMR.index("profile").getAll(profile.id));

        playerMMRs.sort((a, b) => b.date - a.date);

        const MMREntry = row.querySelector(`td[mmr]`) ?? (() => {
            const MMREntry = document.createElement("td");
            MMREntry.toggleAttribute("mmr", true);
            row.append(MMREntry);
            return MMREntry;
        })();
        
        MMREntry.textContent = playerMMRs[0].mmr;
        (MMREntry as any).sortProperty = Number.parseInt(playerMMRs[0].mmr);

        const playedGames = await DB.do(() => stores.teamMember.index("profile").count(profile.id));

        const killsEntry = row.querySelector(`td[kills]`) ?? (() => {
            const killsEntry = document.createElement("td");
            killsEntry.toggleAttribute("kills", true);
            row.append(killsEntry);
            return killsEntry;
        })();

        const deathsEntry = row.querySelector(`td[deaths]`) ?? (() => {
            const deathsEntry = document.createElement("td");
            deathsEntry.toggleAttribute("deaths", true);
            row.append(deathsEntry);
            return deathsEntry;
        })();

        const assistsEntry = row.querySelector(`td[assists]`) ?? (() => {
            const assistsEntry = document.createElement("td");
            assistsEntry.toggleAttribute("assists", true);
            row.append(assistsEntry);
            return assistsEntry;
        })();

        const playedGamesEntry = row.querySelector(`td[games]`) ?? (() => {
            const playedGamesEntry = document.createElement("td");
            playedGamesEntry.toggleAttribute("games", true);
            row.append(playedGamesEntry);
            return playedGamesEntry;
        })();
        
        playedGamesEntry.textContent = playedGames.toString();
        (playedGamesEntry as any).sortProperty = playedGames;

        row.toggleAttribute("clickable", true);

        row.addEventListener("click", () => {
            showPlayerDetails(profile.id);
        });
    }

    await completed;

    for (const profile of profiles) {
        const rivalry = await playerRivalry(profile.id);

        const row = tableBody.querySelector(`tr[profile="${profile.id}"]`);
    
        const killsEntry = row.querySelector("td[kills]");
        killsEntry.textContent = rivalry.kills.toString();
        (killsEntry as any).sortProperty = rivalry.kills;

        const deathsEntry = row.querySelector("td[deaths]");
        deathsEntry.textContent = rivalry.deaths.toString();
        (deathsEntry as any).sortProperty = rivalry.deaths;

        const assistsEntry = row.querySelector("td[assists]");
        assistsEntry.textContent = rivalry.assists.toString();
        (assistsEntry as any).sortProperty = rivalry.assists;
    }
}

async function showPlayerDetails(playerId: string) {
    const { stores, completed } = db.transaction(["playerMMR", "playerName"], "readonly");

    const playerNames = await DB.do(() => stores.playerName.index("profile").getAll(playerId));

    const playerMMRs = await DB.do(() => stores.playerMMR.index("profile").getAll(playerId));

    await completed;
    
    const gameDetails = document.querySelector<HTMLDialogElement>("dialog#playerDetails");
    const mmrChartArea = gameDetails.querySelector("div#chartArea");

    playerNames.sort((a, b) => b.date - a.date);

    const playerNameElement = gameDetails.querySelector<HTMLAnchorElement>("a[name]");
    playerNameElement.textContent = playerNames[0].name;
    playerNameElement.href = `https://www.steamidfinder.com/lookup/${playerNames[0].name}/`;
    playerNameElement.target = "_blank";

    gameDetails.querySelector("span[profile]").textContent = playerId;


    playerMMRs.sort((a, b) => a.date - b.date);

    const mmrChart = document.createElement("canvas");
    mmrChart.id = "mmrChart";

    while (mmrChartArea.firstChild) {
        mmrChartArea.removeChild(mmrChartArea.lastChild);
    }

    mmrChartArea.append(mmrChart);

    new Chart(mmrChart, {
        type: 'line',
        data: {
            datasets: [{
                label: playerNames[0].name,
                data: [...playerMMRs.map(entry => ({
                    x: entry.date,
                    y: entry.mmr
                }))],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    suggestedMin: 2500,
                    suggestedMax: 3000
                },
                x: {
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        callback: (value) => new Date(value).toLocaleString()
                    }
                }
            }
        }
    });
    
    const mmrStats = await playerMMRStats(playerId);

    gameDetails.querySelector("span[mmrAverage]").textContent = Math.floor(mmrStats.mean).toString();
    gameDetails.querySelector("span[mmrStd]").textContent = Math.floor(mmrStats.std).toString();

    const rivalry = await playerRivalry(playerId);

    gameDetails.querySelector("span[kills]").textContent = rivalry.kills.toString();
    gameDetails.querySelector("span[deaths]").textContent = rivalry.deaths.toString();
    gameDetails.querySelector("span[assists]").textContent = rivalry.assists.toString();
    gameDetails.querySelector("span[collateral]").textContent = rivalry.collateral.toString();

    gameDetails.showModal();
}

async function updateStorageEstimate() {
    function bytesToMegaBytes(xB: number) {
        return xB / 1024 / 1024;
    }

    const quota = await navigator.storage.estimate();

    const footer = document.querySelector("footer");
    const usedElement = footer.querySelector("span[storage-used]");
    const totalElement = footer.querySelector("span[storage-quota]");

    usedElement.textContent = bytesToMegaBytes(quota.usage ?? 0).toFixed(2);
    totalElement.textContent = bytesToMegaBytes(quota.quota ?? 0).toFixed(2);
}

async function updateUI() {
    await Promise.all([
        updateStorageEstimate(),
        updateTableOfGames(),
        updateTableOfPlayers()
    ]);
}

async function main() {
    (window as any).getFile = async () => {
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

        document.querySelector("button#fileButton").toggleAttribute("hidden", true);
    };
    
    (window as any).importDB = async () => {
        const fileInput = document.querySelector<HTMLInputElement>("footer input#import");
    
        fileInput.click();
    
        let interval;
        await new Promise<void>((resolve) => {
            interval = setInterval(() => {
                if (fileInput.files[0]) resolve()
            }, 100);
        });
        clearInterval(interval);
    
        const textDump = await fileInput.files[0].text();
    
        const dump = JSON.parse(textDump);
    
        await db.import(dump);
    
        await updateUI();
    };
    
    (window as any).exportDB = async () => {
        const dump = await db.export();
    
        const textDump = JSON.stringify(dump, null, 2);
    
        const file = new File([textDump], "export.json", {
            type: "application/json",
        });
    
        downloadFile(file);
    };
    
    fileObserver.addEventListener("change", async (event) => {
        const file: File = (event as any).detail;
    
        const text = await file.text();
    
        const parser = new DOMParser();
        
        const doc = parser.parseFromString(text, "application/xml");
    
        const dump = await parseData(doc);
    
        await db.import(dump);
    
        await updateUI();
    });
    
    for (const cell of document.querySelectorAll<HTMLTableCellElement>("table thead tr th[sortable]")) {
        cell.addEventListener("click", () => {
            sortTable(cell);
        });
    }
    
    await db.open();
    
    await updateUI();
}

main();