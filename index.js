let DB = null;
async function setupDB() {
    const persist = await navigator.storage.persist();

    if (persist) {
        console.log("Storage will not be cleared except by explicit user action");
    } else {
        console.log("Storage may be cleared by the UA under storage pressure.");
    }

    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("HuntShowStats");
        
        request.onerror = (event) => {
            console.error("Could not open an IndexDB", event);
            reject(event);
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
          
            const game = db.createObjectStore("game", { keyPath: "id" });

            game.createIndex("date", "date", { unique: false });

            const profile = db.createObjectStore("profile", { keyPath: "id" });

            profile.createIndex("date", "date", { unique: false });

            const playerMMR = db.createObjectStore("playerMMR", { keyPath: ["game", "profile"] });

            playerMMR.createIndex("game", "game", { unique: false });
            playerMMR.createIndex("profile", "profile", { unique: false });
            playerMMR.createIndex("date", "date", { unique: false });

            const playerName = db.createObjectStore("playerName", { keyPath: ["profile", "name"] });

            playerName.createIndex("profile", "profile", { unique: false });
            playerName.createIndex("date", "date", { unique: false });
          
            const team = db.createObjectStore("team", { keyPath: ["game", "number"] });

            team.createIndex("game", "game", { unique: false });
            team.createIndex("number", "number", { unique: false });
            team.createIndex("date", "date", { unique: false });
          
            const teamMember = db.createObjectStore("teamMember", { keyPath: ["game", "number", "profile"] });

            teamMember.createIndex("game", "game", { unique: false });
            teamMember.createIndex("game_number", ["game", "number"], { unique: false });
            teamMember.createIndex("profile", "profile", { unique: false });
            teamMember.createIndex("date", "date", { unique: false });

            const eventStore = db.createObjectStore("event", { keyPath: ["game", "profile", "category", "label", "clock"] });

            eventStore.createIndex("game", "game", { unique: false });
            eventStore.createIndex("profile", "profile", { unique: false });
            eventStore.createIndex("category", "category", { unique: false });
            eventStore.createIndex("label", "label", { unique: false });
            eventStore.createIndex("clock", "clock", { unique: false });
            eventStore.createIndex("date", "date", { unique: false });
        };
    });

    DB = db;

    return db;
}

async function gameHash(teams) {
    // Consider a game unique by its player composition and MMRs.
    let data = "";

    for (const teamId in teams) {
        const team = teams[teamId];
        data += `MMR${team.mmr} #${team.numplayers}\n`;

        for (const playerId in team.members) {
            const player = team.members[playerId];

            data += `(ID${player.profileid} AS ${player.blood} AT ${player.mmr})\n`;
        }
    }

    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    
    return hashHex;
}

async function storeGame(game) {
    const gameId = await gameHash(game);

    const transaction = DB.transaction(["game", "team", "teamMember", "profile", "playerName", "playerMMR", "event"], "readwrite");
    const gamesStore = transaction.objectStore("game");
    const teamsStore = transaction.objectStore("team");
    const teamMembersStore = transaction.objectStore("teamMember");
    const profilesStore = transaction.objectStore("profile");
    const playerNamesStore = transaction.objectStore("playerName");
    const playerMMRsStore = transaction.objectStore("playerMMR");
    const eventsStore = transaction.objectStore("event");

    const stamp = Date.now();

    const alreadyAdded = await new Promise((resolve) => {
        const request = gamesStore.get(gameId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
    });

    if (alreadyAdded) return;

    gamesStore.put({
        id: gameId,
        date: stamp
    });

    for (const teamId in game) {
        const team = game[teamId];

        teamsStore.put({
            game: gameId,
            number: teamId,
            mmr: team.mmr,
            own: team.ownteam == "true",
            date: stamp
        });

        for (const playerId in team.members) {
            const player = team.members[playerId];

            teamMembersStore.put({
                game: gameId,
                number: teamId,
                profile: player.profileid,
                date: stamp
            });

            profilesStore.put({
                id: player.profileid,
                date: stamp
            });

            playerNamesStore.put({
                profile: player.profileid,
                name: player.blood_line_name,
                date: stamp
            });

            playerMMRsStore.put({
                game: gameId,
                profile: player.profileid,
                mmr: player.mmr,
                date: stamp
            });

            for (const propertyId in player) {
                const regex = /(@.*?)~([0-9]{1,2}):([0-9]{2})/g;

                if (!propertyId.startsWith("tooltip")) continue;

                const category = propertyId.split("tooltip")[1].replace("_", "");

                const matches = player[propertyId].matchAll(regex);

                for (const [match, label, minutes, seconds] of matches) {
                    const clock = Number.parseInt(minutes) * 60 + Number.parseInt(seconds);
                    
                    eventsStore.put({
                        game: gameId,
                        profile: player.profileid,
                        category: category.trim(),
                        label: label.trim(),
                        clock,
                        date: stamp
                    })
                }
            }
        }
    }

    await new Promise((resolve, reject) => {
        transaction.oncomplete = (event) => { resolve(); };
        transaction.onerror = (event) => { reject(event); }
    });
}

async function updateTableOfGames() {
    const transaction = DB.transaction(["game", "teamMember"], "readonly");

    const gamesStore = transaction.objectStore("game");
    const teamMembersStore = transaction.objectStore("teamMember");

    const games = await new Promise((resolve, reject) => {
        gamesStore.index("date").getAll().onsuccess = (event) => {
            const result = event.target.result;
            resolve(result);
        };
    });

    const tableBody = document.querySelector("table#games > tbody");

    for (const game of games) {
        let possibleRow = tableBody.querySelector(`tr[game="${game.id}"]`);

        if (possibleRow) continue;

        const row = document.createElement("tr");
        row.setAttribute("game", game.id);
        tableBody.append(row);

        const dateEntry = document.createElement("td");
        dateEntry.textContent = new Date(game.date).toLocaleString();
        row.append(dateEntry);

        const playerCount = await new Promise((resolve, reject) => {
            teamMembersStore.index("game").count(game.id).onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
        });

        const playerCountEntry = document.createElement("td");
        playerCountEntry.textContent = playerCount;
        row.append(playerCountEntry);

        row.addEventListener("click", () => {
            showGameDetails(game.id);
        });
    }

    await new Promise((resolve, reject) => {
        transaction.oncomplete = (event) => { resolve(); };
        transaction.onerror = (event) => { reject(event); }
    });
}

async function showGameDetails(gameId) {
    const gameDetails = document.querySelector("dialog#gameDetails");
    const tableBody = gameDetails.querySelector("table#gamePlayers > tbody");

    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.lastChild);
    }

    const transaction = DB.transaction(["game", "teamMember", "playerName", "playerMMR", "event"], "readonly");

    const gamesStore = transaction.objectStore("game");
    const teamMembersStore = transaction.objectStore("teamMember");
    const playerNamesStore = transaction.objectStore("playerName");
    const playerMMRsStore = transaction.objectStore("playerMMR");
    const eventsStore = transaction.objectStore("event");

    const game = await new Promise((resolve, reject) => {
        gamesStore.get(gameId).onsuccess = (event) => {
            const result = event.target.result;
            resolve(result);
        };
    });

    const gameDate = new Date(game.date);

    const teamMembers = await new Promise((resolve, reject) => {
        teamMembersStore.index("game").getAll(gameId).onsuccess = (event) => {
            const result = event.target.result;
            resolve(result);
        };
    });

    gameDetails.querySelector("em").textContent = gameDate.toLocaleString();

    const playerNameMapping = {};
    let spannedRows = {};

    for (const teamMember of teamMembers) {
        const teamSize = await new Promise((resolve, reject) => {
            teamMembersStore.index("game_number").count([gameId, teamMember.number]).onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
        });

        const row = document.createElement("tr");
        row.setAttribute("player", teamMember.profile);
        tableBody.append(row);

        if (!spannedRows[teamMember.number]) {
            const teamEntry = document.createElement("td");
            teamEntry.setAttribute("rowspan", teamSize);
            teamEntry.textContent = teamMember.number;
            row.append(teamEntry);
            spannedRows[teamMember.number] = true;
        }

        const playerNames = await new Promise((resolve, reject) => {
            playerNamesStore.index("profile").getAll(teamMember.profile).onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
        });

        playerNames.sort((a, b) => b.date - a.date);

        playerNameMapping[teamMember.profile] = playerNames[0].name;

        const nameEntry = document.createElement("td");
        nameEntry.textContent = playerNameMapping[teamMember.profile];
        row.append(nameEntry);

        const playerMMR = await new Promise((resolve, reject) => {
            playerMMRsStore.get([gameId, teamMember.profile]).onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
        });

        const MMREntry = document.createElement("td");
        MMREntry.textContent = playerMMR.mmr;
        row.append(MMREntry);
    }

    const events = await new Promise((resolve, reject) => {
        eventsStore.index("game").getAll(gameId).onsuccess = (event) => {
            const result = event.target.result;
            resolve(result);
        };
    });

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

        const category = categoryMap[event.category] ?? event.category;

        const labelMap = {
            "@ui_mmr_killed_hunter ~~@ui_team_details_killed": "Was Killed By Me",
            "@ui_mmr_died_to_hunter ~~@ui_team_details_killed": "Killed Me",
            "@ui_team_details_carried_bounty": "Picked Up Bounty",
            "@ui_team_details_hunter_downed_teammate ~~@ui_team_details_downed": "Downed Teammate",
            "@ui_team_details_downed": "Downed Teammate",
            "@ui_team_details_hunter_downed_you ~~@ui_team_details_downed": "Downed Me",
            "@ui_team_details_killed_by_team_mate ~~@ui_team_details_killed": "Was Killed By Teammate",
            "@ui_team_details_killed_team_mate ~~@ui_team_details_downed": "Killed Teammate",
            "@ui_team_details_killed": "Killed Teammate",
            "@ui_team_details_teammate_downed_hunter ~~@ui_team_details_downed": "Was Downed By Teammate",
            "@ui_team_details_you_downed_hunter ~~@ui_team_details_downed": "Was Downed By Me",
            "@ui_team_details_extracted_bounty": "Extracted With Bounty"
        };

        const label = labelMap[event.label] ?? event.label;

        const clockEntry = document.createElement("b");
        entry.append(clockEntry);
        clockEntry.textContent = clock;

        const playerNameEntry = document.createElement("em");
        entry.append(playerNameEntry);
        playerNameEntry.textContent = name;

        const detailsEntry = document.createElement("span");
        entry.append(detailsEntry);
        detailsEntry.textContent = label;
    }

    await new Promise((resolve, reject) => {
        transaction.oncomplete = (event) => { resolve(); };
        transaction.onerror = (event) => { reject(event); }
    });

    gameDetails.showModal();
}

async function updateTableOfPlayers() {
    const transaction = DB.transaction(["profile", "playerName", "playerMMR", "teamMember"], "readonly");

    const profilesStore = transaction.objectStore("profile");
    const playerNamesStore = transaction.objectStore("playerName");
    const playerMMRsStore = transaction.objectStore("playerMMR");
    const teamMembersStore = transaction.objectStore("teamMember");

    const profiles = await new Promise((resolve, reject) => {
        profilesStore.getAll().onsuccess = (event) => {
            const result = event.target.result;
            resolve(result);
        };
    });

    const tableBody = document.querySelector("table#players > tbody");

    for (const profile of profiles) {
        const row = tableBody.querySelector(`tr[profile="${profile.id}"]`) ?? (() => {
            const row = document.createElement("tr");
            row.setAttribute("profile", profile.id);
            tableBody.append(row);
            return row;
        })();

        const playerNames = await new Promise((resolve, reject) => {
            playerNamesStore.index("profile").getAll(profile.id).onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
        });

        playerNames.sort((a, b) => b.date - a.date);

        const nameEntry = row.querySelector(`td[name]`) ?? (() => {
            const nameEntry = document.createElement("td");
            nameEntry.toggleAttribute("name", true);
            row.append(nameEntry);
            return nameEntry;
        })();
        
        nameEntry.textContent = playerNames[0].name;

        const playerMMRs = await new Promise((resolve, reject) => {
            playerMMRsStore.index("profile").getAll(profile.id).onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
        });

        playerMMRs.sort((a, b) => b.date - a.date);

        const MMREntry = row.querySelector(`td[mmr]`) ?? (() => {
            const MMREntry = document.createElement("td");
            MMREntry.toggleAttribute("mmr", true);
            row.append(MMREntry);
            return MMREntry;
        })();
        
        MMREntry.textContent = playerMMRs[0].mmr;

        const playedGames = await new Promise((resolve, reject) => {
            teamMembersStore.index("profile").count(profile.id).onsuccess = (event) => {
                const result = event.target.result;
                resolve(result);
            };
        });

        const playedGamesEntry = row.querySelector(`td[games]`) ?? (() => {
            const playedGamesEntry = document.createElement("td");
            playedGamesEntry.toggleAttribute("games", true);
            row.append(playedGamesEntry);
            return playedGamesEntry;
        })();
        
        playedGamesEntry.textContent = playedGames;

        row.addEventListener("click", () => {
            showPlayerDetails(profile.id);
        });
    }

    await new Promise((resolve, reject) => {
        transaction.oncomplete = (event) => { resolve(); };
        transaction.onerror = (event) => { reject(event); }
    });
}

async function showPlayerDetails(playerId) {
    const gameDetails = document.querySelector("dialog#playerDetails");
    const mmrChartArea = gameDetails.querySelector("div#chartArea");

    const transaction = DB.transaction(["playerMMR", "playerName"], "readonly");

    const playerMMRsStore = transaction.objectStore("playerMMR");
    const playerNamesStore = transaction.objectStore("playerName");

    const playerNames = await new Promise((resolve, reject) => {
        playerNamesStore.index("profile").getAll(playerId).onsuccess = (event) => {
            const result = event.target.result;
            resolve(result);
        };
    });

    playerNames.sort((a, b) => b.date - a.date);

    gameDetails.querySelector("h2[name]").textContent = playerNames[0].name;
    gameDetails.querySelector("p[profile]").textContent = playerId;

    const playerMMRs = await new Promise((resolve, reject) => {
        playerMMRsStore.index("profile").getAll(playerId).onsuccess = (event) => {
            const result = event.target.result;
            resolve(result);
        };
    });

    playerMMRs.sort((a, b) => b.date - a.date);

    const mmrChart = document.createElement("canvas");
    mmrChart.id = "mmrChart";

    while (mmrChartArea.firstChild) {
        mmrChartArea.removeChild(mmrChartArea.lastChild);
    }

    mmrChartArea.append(mmrChart);

    new Chart(mmrChart, {
        type: 'line',
        data: {
            labels: playerMMRs.map(entry => new Date(entry.date).toLocaleString()),
            datasets: [{
                label: 'MMR',
                data: playerMMRs.map(entry => entry.mmr),
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 5000
                }
            }
        }
    });

    await new Promise((resolve, reject) => {
        transaction.oncomplete = (event) => { resolve(); };
        transaction.onerror = (event) => { reject(event); }
    });

    gameDetails.showModal();
}




const watchInterval = 1000 * 5;

const attributes = {
    text: null,
    handle: null,
    watcher: null,
    document: null,
    lastModified: 0
};

async function getHandle() {
    const pickerOpts = {
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
    };
    
    const [fileHandle] = await window.showOpenFilePicker(pickerOpts);

    attributes.handle = fileHandle;

    document.querySelector("button#fileButton").toggleAttribute("hidden", true);
}

async function getFile() {
    if (!attributes.handle) await getHandle();

    const file = await attributes.handle.getFile();

    if (attributes.lastModified >= file.lastModified) return;

    console.trace("Detected Change");

    attributes.lastModified = file.lastModified;

    attributes.text = await file.text();

    const parser = new DOMParser();

    attributes.document = parser.parseFromString(attributes.text, "application/xml");

    await parseData(attributes.document);

    await updateTableOfGames();
    await updateTableOfPlayers();
}

async function parseData(doc) {
    const numTeamsEntry = doc.querySelector(`Attr[name="MissionBagNumTeams"]`);
    const numTeams = Number.parseInt(numTeamsEntry.attributes.value.value);

    const teams = {};

    const teamEntries = doc.querySelectorAll(`Attr[name^="MissionBagTeam_"]`);
    for (const teamEntry of teamEntries) {
        const [_, team, entry] = teamEntry.attributes.name.value.split("_");
        const value = teamEntry.attributes.value.value;

        if (entry == null) continue;
        if (team >= numTeams) continue;

        teams[team] ??= {
            members: {}
        };

        teams[team][entry] = value;
    }

    const playerEntries = doc.querySelectorAll(`Attr[name^="MissionBagPlayer_"]`);
    for (const playerEntry of playerEntries) {
        const [_, team, player, ...rest] = playerEntry.attributes.name.value.split("_");
        const entry = rest.join("_");
        const value = playerEntry.attributes.value.value;

        if (entry == null) continue;
        if (team >= numTeams) continue;
        if (player >= teams[team]["numplayers"]) continue;

        teams[team].members[player] ??= {};
        teams[team].members[player][entry] = value;
    }

    console.log(teams);

    await storeGame(teams);
}

async function watchFile() {
    if (!attributes.handle) return;
    await getFile();
}

setupDB().then(async () => {
    await updateTableOfGames();
    await updateTableOfPlayers();
});

attributes.watcher = setInterval(() => {
    watchFile();
}, watchInterval);

addEventListener("focus", (event) => {
    watchFile();
});
