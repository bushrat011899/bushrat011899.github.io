import type { Schema } from "./DB";

/**
 * Parses a Hunt: Showdown `attributes.xml` file into something importable into a DB.
 * @param {Document} doc XML document to parse.
 * @return A DB dump object ready for import.
 */
export async function parseData(doc: Document): Promise<{ [key in keyof Schema]: Schema[key][]; }> {
    const numTeamsEntry = doc.querySelector(`Attr[name="MissionBagNumTeams"]`);
    const numTeams = Number.parseInt(numTeamsEntry.attributes.getNamedItem("value").value);

    const teams: any = {};

    const teamEntries = doc.querySelectorAll(`Attr[name^="MissionBagTeam_"]`);
    for (const teamEntry of teamEntries) {
        const [_, team, entry] = teamEntry.attributes.getNamedItem("name").value.split("_");
        const value = teamEntry.attributes.getNamedItem("value").value;

        if (entry == null) continue;
        if (Number.parseInt(team) >= numTeams) continue;

        teams[team] ??= {
            members: {}
        };

        teams[team][entry] = value;
    }

    const playerEntries = doc.querySelectorAll(`Attr[name^="MissionBagPlayer_"]`);
    for (const playerEntry of playerEntries) {
        const [_, team, player, ...rest] = playerEntry.attributes.getNamedItem("name").value.split("_");
        const entry = rest.join("_");
        const value = playerEntry.attributes.getNamedItem("value").value;

        if (entry == null) continue;
        if (Number.parseInt(team) >= numTeams) continue;
        if (player >= teams[team]["numplayers"]) continue;

        teams[team].members[player] ??= {};
        teams[team].members[player][entry] = value;
    }

    const gameId = await gameHash(teams);

    const db: { [key in keyof Schema]: Schema[key][]; } = {
        game: [],
        team: [],
        teamMember: [],
        profile: [],
        playerName: [],
        playerMMR: [],
        event: []
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
                if (!propertyId.startsWith("tooltip")) continue;

                const category = propertyId.split("tooltip")[1].replace("_", "");

                const matches = player[propertyId].matchAll(EVENT_LABEL_TIME_REGEX);

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

const EVENT_LABEL_TIME_REGEX = /(@.*?)~([0-9]{1,2}):([0-9]{2})/g;

async function gameHash(teams: any) {
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
