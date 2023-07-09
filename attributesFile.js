/**
 * Parses a Hunt: Showdown `attributes.xml` file into something importable into a DB.
 * @param {Document} doc XML document to parse.
 * @return A DB dump object ready for import.
 */
export async function parseData(doc) {
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

    const gameId = await gameHash(teams);

    /** @type {{ id: string; date: number }[]} */
    const gameStore = [];

    /** @type {{ game: string; number: string; mmr: string; own: boolean; date: number }[]} */
    const teamStore = [];

    /** @type {{ game: string; number: string; profile: string; date: number }[]} */
    const teamMemberStore = [];

    /** @type {{ profile: string; name: string; date: number }[]} */
    const profileStore = [];

    /** @type {{ id: string; date: number }[]} */
    const playerNameStore = [];

    /** @type {{ game: string; profile: string; mmr: string; date: number }[]} */
    const playerMMRStore = [];

    /** @type {{ game: string; profile: string; category: string; label: string; clock: number; date: number }[]} */
    const eventStore = [];

    const db = {
        game: gameStore,
        team: teamStore,
        teamMember: teamMemberStore,
        profile: profileStore,
        playerName: playerNameStore,
        playerMMR: playerMMRStore,
        event: eventStore
    }

    const stamp = Date.now();

    db.game.push({
        id: gameId,
        date: stamp
    });

    for (const teamId in teams) {
        const team = teams[teamId];

        db.team.push({
            game: gameId,
            number: teamId,
            mmr: team.mmr,
            own: team.ownteam == "true",
            date: stamp
        });

        for (const playerId in team.members) {
            const player = team.members[playerId];

            db.teamMember.push({
                game: gameId,
                number: teamId,
                profile: player.profileid,
                date: stamp
            });

            db.profile.push({
                id: player.profileid,
                date: stamp
            });

            db.playerName.push({
                profile: player.profileid,
                name: player.blood_line_name,
                date: stamp
            });

            db.playerMMR.push({
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
                    
                    db.event.push({
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

            data += `(ID${player.profileid} AS ${player.blood_line_name} AT ${player.mmr})\n`;
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
