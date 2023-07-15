import { IDBDatabaseAsync, createSchema } from "./IDBAsync/IDBDatabaseAsync";
import { IDBObjectStoreAsyncOptions } from "./IDBAsync/IDBObjectStoreAsync";

const TABLES = {
    game: {
        key: "id" as const,
        indexes: {
            date: "date" as const,
        },
    },

    team: {
        key: ["game", "number"] as const,
        indexes: {
            game: "game" as const,
            number: "number" as const,
            date: "date" as const,
        },
    },

    teamMember: {
        key: ["game", "number", "profile"] as const,
        indexes: {
            game: "game" as const,
            game_number: ["game", "number"] as const,
            profile: "profile" as const,
            date: "date" as const,
        },
    },

    profile: {
        key: "id" as const,
        indexes: {
            date: "date" as const,
        },
    },

    playerName: {
        key: ["profile", "name"] as const,
        indexes: {
            profile: "profile" as const,
            date: "date" as const,
        },
    },

    playerMMR: {
        key: ["game", "profile"] as const,
        indexes: {
            game: "game" as const,
            profile: "profile" as const,
            date: "date" as const,
        },
    },

    event: {
        key: ["game", "profile", "category", "label", "clock"] as const,
        indexes: {
            game: "game" as const,
            profile: "profile" as const,
            category: "category" as const,
            label: "label" as const,
            clock: "clock" as const,
            date: "date" as const,
        },
    },
};

const MIGRATIONS = {
    0: (db: IDBDatabase) => {
        //createSchema(db, TABLES);
        console.trace("Applying Migration 0: DB Initialisation");

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

        return 1;
    },

    1: () => 1
};

export type Schema = {
    game: {
        id: string;
        date: number;
    };

    team: {
        game: Schema["game"]["id"];
        number: string;
        mmr: string;
        own: boolean;
        date: number;
    };

    teamMember: {
        game: Schema["game"]["id"];
        number: Schema["team"]["number"];
        profile: Schema["profile"]["id"];
        date: number;
    };

    profile: {
        id: string;
        date: number;
    };

    playerName: {
        profile: Schema["profile"]["id"];
        name: string;
        date: number;
    };

    playerMMR: {
        game: Schema["game"]["id"];
        profile: Schema["profile"]["id"];
        mmr: string;
        date: number;
    };

    event: {
        game: Schema["game"]["id"];
        profile: Schema["profile"]["id"];
        category: string;
        label: string;
        clock: number;
        date: number;
    };
};

/**
 * Encapsulated IndexedDB Database which maps common operations to a `Promise`.
 */
export class DB extends IDBDatabaseAsync<"HuntShowStats", typeof MIGRATIONS, Schema, typeof TABLES> {
    constructor() {
        super("HuntShowStats", 1, MIGRATIONS);
    }

    async currentPlayerName(id: Schema["profile"]["id"]): Promise<string> {
        let playerName = null;
        let newestDate = 0;

        for await (const entry of this.playerNames({ index: "profile", query: id }).reverse()) {
            if (entry.date > newestDate) {
                playerName = entry.name;
                newestDate = entry.date;
            }
        }

        return playerName;
    }

    async currentPlayerMMR(id: Schema["profile"]["id"]): Promise<number> {
        let playerMMR = null;
        let newestDate = 0;

        for await (const entry of this.playerMMRs({ index: "profile", query: id }).reverse()) {
            if (entry.date > newestDate) {
                playerMMR = entry.mmr;
                newestDate = entry.date;
            }
        }
        
        return Number.parseInt(playerMMR);
    }

    async playerRivalry(id: Schema["profile"]["id"]) {
        const stats = {
            kills: 0,
            deaths: 0,
            assists: 0,
            collateral: 0
        };
    
        for await (const event of this.events({ index: "profile", query: id })) {
            // Fall-Through Explicitly Used
            switch (event.category) {
                case "downedbyme":
                case "killedbyme": stats.kills += 1; break;
                
                case "downedme":
                case "killedme": stats.deaths += 1; break;
                
                case "downedbyteammate":
                case "killedbyteammate": stats.assists += 1; break;
                
                case "downedteammate":
                case "killedteammate": stats.collateral += 1; break;
            }
        }
    
        return stats;
    }

    async playerMMRStatistics(id: Schema["profile"]["id"]) {
        let count = 0, sum1 = 0, sum2 = 0;
        for await (const entry of this.playerMMRs({ index: "profile", query: id })) {
            const mmr = Number.parseInt(entry.mmr);

            count += 1;
            sum1 += mmr;
            sum2 += mmr * mmr;
        }
    
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

    get games() { return (options?: IDBObjectStoreAsyncOptions<keyof typeof TABLES["game"]["indexes"]>) => this.store("game", options); }

    get teams() { return (options?: IDBObjectStoreAsyncOptions<keyof typeof TABLES["team"]["indexes"]>) => this.store("team", options); }

    get teamMembers() { return (options?: IDBObjectStoreAsyncOptions<keyof typeof TABLES["teamMember"]["indexes"]>) => this.store("teamMember", options); }

    get profiles() { return (options?: IDBObjectStoreAsyncOptions<keyof typeof TABLES["profile"]["indexes"]>) => this.store("profile", options); }

    get playerNames() { return (options?: IDBObjectStoreAsyncOptions<keyof typeof TABLES["playerName"]["indexes"]>) => this.store("playerName", options); }

    get playerMMRs() { return (options?: IDBObjectStoreAsyncOptions<keyof typeof TABLES["playerMMR"]["indexes"]>) => this.store("playerMMR", options); }

    get events() { return (options?: IDBObjectStoreAsyncOptions<keyof typeof TABLES["event"]["indexes"]>) => this.store("event", options); }
}
