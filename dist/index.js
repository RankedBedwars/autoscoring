"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const socket_io_client_1 = require("socket.io-client");
const mineflayer_1 = __importDefault(require("mineflayer"));
const mineflayer_bloodhound_1 = __importDefault(require("mineflayer-bloodhound"));
const MAP_NAME_REGEX = /^You are currently playing on (.+)/m;
const PARTY_INVITE_SELF_REGEX = /^(?:\[.+\] )?(\w{1,16}) has invited you to join their party!/m;
const PARTY_INVITE_REGEX = /^(?:\[.+\] )?(\w{1,16}) invited (?:\[.+\] )?(\w{1,16}) to the party!/m;
const PARTY_INVITE_EXPIRE_REGEX = /^The party invite to (?:\[.+\] )?(\w{1,16}) has expired/m;
const PARTY_JOIN_REGEX = /^(?:\[(.+)\] )?(\w{1,16}) joined the party\./m;
const PARTY_LEAVE_REGEX = /^(?:\[.+\] )?(\w{1,16}) has left the party\./m;
const AFK_REGEX = /^You are AFK\. Move around to return from AFK\./m;
const GAME_START_REGEX = /^\s*Protect your bed and destroy the enemy beds\./m;
const BEDS_DESTROYED_REGEX = /^All beds have been destroyed!/m;
const DEATH_NO_CAUSE_REGEX = /^(\w{1,16}) (?:died\.|disconnected)/m;
const FINAL_KILL_REGEX = /^§r(§\w)(\w{1,16}).+§r(?:(§\w)(\w{1,16})|§7fell into the void|§7disconnected).+FINAL KILL!$/m;
const KILL_REGEX = /^§r(§\w)(\w{1,16}).+§r(?:(§\w)(\w{1,16})|§7fell into the void|§7disconnected)/m;
const PARTY_MESSAGE_REGEX = /Party > (?:\[.+\] )(\w{1,16}): (.+)/m;
const LOBBY_JOIN_REGEX = /^(\w{1,16}) has joined/m;
const BED_DESTROYED_REGEX = /BED DESTRUCTION >.*§r(§\w)(\w{1,16})\s*§r§7/m;
const TEAM_WIN_REGEX = /^\s+(Red|Blue|Green|Yellow|Aqua|White|Pink|Gray)\s+-\s+(?:\[.+\] )?\w{1,16}/m;
const AFK_KICK_REGEX = /^(\w{1,16}) was kicked for being AFK!$/m;
const DIAMOND_GEN_REGEX = /^Diamond Generators have been upgraded to Tier II/m;
const colourMap = new Map([
    ['§a', 'Green'],
    ['Green', '§a'],
    ['§b', 'Aqua'],
    ['Aqua', '§b'],
    ['§c', 'Red'],
    ['Red', '§c'],
    ['§d', 'Pink'],
    ['Pink', '§d'],
    ['§e', 'Yellow'],
    ['Yellow', '§e'],
    ['§f', 'White'],
    ['White', '§f'],
    ['§8', 'Gray'],
    ['Gray', '§8'],
    ['§9', 'Blue'],
    ['Blue', '§9']
]);
dotenv.config({ path: __dirname + '/.env' });
;
const data = {
    players: {},
    _players: [],
    map: null,
    startedAt: null,
    endedAt: null,
    warnings: {},
    partied: false,
    number: 0,
    beds: 0,
    diamond: false
};
const messages = [];
const bot = mineflayer_1.default.createBot({
    host: 'mc.hypixel.net',
    version: '1.8',
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
});
bot.loadPlugin(mineflayer_bloodhound_1.default(mineflayer_1.default));
bot.bloodhound.yaw_correlation_enabled = true;
let socket = null;
function chat(...message) {
    let func;
    const promise = new Promise(resolve => {
        func = resolve;
    });
    const last = {
        message: message.pop(),
        promise: func
    };
    messages.push(...message.map(m => ({ message: m })), last);
    return promise;
}
function isWhitelisted(username) {
    return !!data.players[username];
}
bot.once('login', () => {
    console.log(`${bot.username} ⮕ Online`);
    socket = socket_io_client_1.io(`http://${process.env.LOCAL_SOCKET ? 'localhost' : '159.65.236.234'}:${process.env.SOCKET_PORT}/?key=${process.env.SOCKET_KEY}&bot=${bot.username}`);
    setInterval(async () => {
        if (messages.length > 0) {
            const { message, promise } = messages.shift();
            await bot.chat(message);
            promise?.();
        }
    }, 1250);
    socket.on('actualgamestart', onActualGameStart);
    socket.on('gameStart', onGameStart);
    socket.once('restart', () => {
        console.log(`${bot.username} has restarted as it is offline.`);
        process.exit(1);
    });
    chat('/p leave', '/lang en');
});
bot.once('kicked', (reason) => {
    console.log(reason);
    process.exit(1);
});
bot.on('message', (raw) => {
    const message = raw.toString();
    const motd = raw.toMotd();
    if (AFK_REGEX.test(message)) {
        return chat('/lobby', '/rejoin');
    }
    else if (BEDS_DESTROYED_REGEX.test(message)) {
        data.beds = 2;
    }
    else if (PARTY_MESSAGE_REGEX.test(message)) {
        const [, username, content] = message.match(PARTY_MESSAGE_REGEX);
        if (isWhitelisted(username) === false)
            return;
        switch (content) {
            case 'forcetransfer':
                const leader = Object.values(data.players)
                    .find((p) => p.rank === 'MVP++')?.minecraft?.name
                    ?? username;
                chat(`/p transfer ${leader}`);
        }
    }
    else if (PARTY_INVITE_REGEX.test(message)) {
        const [, inviter, invitee] = message.match(PARTY_INVITE_REGEX);
        if (isWhitelisted(invitee) === false || isWhitelisted(inviter) === false)
            return;
        data.players[invitee].status = 1;
        data.players[invitee].inviter = inviter;
    }
    else if (PARTY_INVITE_EXPIRE_REGEX.test(message)) {
        const [, username] = message.match(PARTY_INVITE_EXPIRE_REGEX);
        if (isWhitelisted(username) === false)
            return;
        chat(`/pc [RBW] ${username} hasn't joined the party yet.`, `/p ${username}`);
    }
    else if (PARTY_INVITE_SELF_REGEX.test(message)) {
        const [, username] = message.match(PARTY_INVITE_SELF_REGEX);
        if (data.partied || data.startedAt || data.endedAt || isWhitelisted(username) === false)
            return;
        data.partied = true;
        chat('/p leave', `/p accept ${username}`);
    }
    else if (PARTY_JOIN_REGEX.test(message)) {
        const [, rank, username] = message.match(PARTY_JOIN_REGEX);
        if (isWhitelisted(username) === false)
            return;
        data.players[username].rank = rank ?? null;
        data.players[username].joined = true;
        const players = Object.values(data.players);
        if (players.every(p => p.joined)) {
            const leader = players
                .find((p) => p.rank === 'MVP++')?.minecraft?.name
                ?? username;
            chat(`/p transfer ${leader}`);
        }
    }
    else if (PARTY_LEAVE_REGEX.test(message)) {
        const [, username] = message.match(PARTY_LEAVE_REGEX);
        if (isWhitelisted(username) === false)
            return;
        data.players[username].joined = false;
    }
    if (data.startedAt && DIAMOND_GEN_REGEX.test(message)) {
        chat('/pc ▒▒ DIA II RESTRICTIONS LIFTED ▒▒');
        data.diamond = true;
    }
    else if (MAP_NAME_REGEX.test(message)) {
        const [, map] = message.match(MAP_NAME_REGEX);
        if (map !== data.map) {
            chat(`/pc Please choose the map ${data.map} when you join the game instead of ${map}.`);
            softReset();
        }
    }
    else if (LOBBY_JOIN_REGEX.test(message)) {
        const [, username] = message.match(LOBBY_JOIN_REGEX);
        if (username !== bot.player.username)
            return;
        chat('/map');
    }
    else if (GAME_START_REGEX.test(message)) {
        const uuids = Object.values(data.players).map(p => p.minecraft.uuid);
        data.startedAt = Date.now();
        socket?.emit('ActualGameStart', uuids);
        chat('/lobby', '/rejoin', '/pc 【BANNED ITEMS】: Punch Bow ∣ Obby ∣ Pop-Up Tower ∣ Water (outside base) ∣ KB Stick', '/pc 〖DIA II RESTRICTIONS〗: BridgeEggs ∣ JumpBoost  ∣ Bow', '/pc 〖BB RESTRICTIONS〗 EnderPearls');
        for (const username in bot.players) {
            if (isWhitelisted(username) === false && bot.players[username].ping === 1) {
                if (username === bot.player.username) {
                    chat('/pc Wrong teams joined. Please re-queue or game will be voided.');
                }
                else {
                    error(username);
                }
                return softReset();
            }
        }
    }
    else if (data.startedAt && DEATH_NO_CAUSE_REGEX.test(message)) {
        const [, username] = message.match(DEATH_NO_CAUSE_REGEX);
        if (isWhitelisted(username) === false)
            return;
        ++data.players[username].deaths;
        data.players[username].streak = 0;
    }
    else if (data.startedAt && FINAL_KILL_REGEX.test(motd)) {
        const [, victimColour, victim, killerColour, killer] = motd.match(FINAL_KILL_REGEX);
        if (isWhitelisted(victim) === false)
            return;
        handleKill(victim, killer, victimColour, killerColour, true);
    }
    else if (KILL_REGEX.test(motd)) {
        const [, victimColour, victim, killerColour, killer] = motd.match(KILL_REGEX);
        if (isWhitelisted(victim) === false)
            return;
        handleKill(victim, killer, victimColour, killerColour);
    }
    else if (data.startedAt && BED_DESTROYED_REGEX.test(motd)) {
        const [, username] = motd.match(BED_DESTROYED_REGEX);
        ++data.beds;
        if (isWhitelisted(username) === false)
            return;
        ++data.players[username].bedsBroken;
    }
    else if (data.startedAt && TEAM_WIN_REGEX.test(message)) {
        const [, team] = message.match(TEAM_WIN_REGEX);
        onGameEnd(colourMap.get(team));
    }
    else if (AFK_KICK_REGEX.test(message)) {
        const [, username] = message.match(AFK_KICK_REGEX);
        if (isWhitelisted(username) === false)
            return;
        chat(`/pc 〘${username}〙 STRIKED for AFK.`);
        socket?.emit('playerStrike', { id: data.players[username].discord, strikes: 1, reason: 'afk' });
    }
});
const killMessages = {
    '0': [
        '▉〖DOUBLE KILL〗by {username}! ▉',
        '▉〖TRIPLE KILL〗by {username}! ▉',
        '▉〖QUADRUPLE KILL〗by {username}! ▉'
    ],
    '5': [
        '✦〘{username}〙is on a killing spree! 『5 KILLSTREAK』',
        '✦〘{username}〙is thirsty for blood! 『5 KILLSTREAK』',
        '✦〘{username}〙is on a roll! 『5 KILLSTREAK』'
    ],
    '8': [
        '✦〘{username}〙is on a RAMPAGE! 『8 KILLSTREAK』',
        '✦〘{username}〙you’re still at it MADLAD?! 『8 KILLSTREAK』',
        '✦〘{username}〙is a certified killing machine! 『8 KILLSTREAK』'
    ],
    '12': [
        '✦〘{username}〙you’re too much of a monster HAVE SOME MERCY 『12 KILLSTREAK』',
        '✦〘{username}〙you’re officially a legend at this game.. 『12 KILLSTREAK』',
        '✦〘{username}〙is near UNSTOPPABLE! 『12 KILLSTREAK』'
    ]
};
const streakEndMessages = [
    '〘{killer}〙terminated {victim}\'s killstreak of {streak}!',
    '〘{killer}〙ended {victim}\'s killstreak of {streak}!',
    '〘{killer}〙has put a stop to {victim}\'s rampage!'
];
function handleKill(victimName, killerName, victimColour, killerColour, final = false) {
    if (!data.startedAt)
        return;
    const now = Date.now();
    const killer = data.players[killerName] ?? { kills: 0, finalKills: 0, streak: 0, killTiming: [] };
    const victim = data.players[victimName] ?? { streak: 0, deaths: 0, finalDeaths: 0 };
    if (!killer) {
        ++victim[final ? 'finalDeaths' : 'deaths'];
        victim.streak = 0;
        return;
    }
    killer.team = killerColour;
    victim.team = victimColour;
    ++victim[final ? 'finalDeaths' : 'deaths'];
    ++killer[final ? 'finalKills' : 'kills'];
    ++killer.streak;
    if (victim.streak > 2) {
        chat(`/pc ${randomValue(streakEndMessages).replace('{killer}', killerName).replace('{victim}', victimName).replace('{streak}', victim.streak.toString())}`);
        victim.streak = 0;
    }
    const kills = killer.killTiming.findIndex((k, i) => now - k > i * 2000 + 2000) + 1 || killer.killTiming.length + 1;
    if (killMessages[killer.streak.toString()]) {
        const message = killer.messages[killer.streak.toString()] ?? randomValue(killMessages[killer.streak.toString()]);
        chat(`/pc ${message.replace('{username}', killerName)}`);
    }
    if (kills >= 2 && kills <= 4) {
        chat(`/pc ${killMessages[0][kills - 2].replace('{username}', killerName)}`);
    }
    killer.killTiming.unshift(now);
}
function randomValue(array) {
    return array[Math.floor(Math.random() * array.length)];
}
async function onActualGameStart(players) {
    data._players = players;
}
async function onGameStart(game) {
    data.players = game.players.reduce((a, p, i) => {
        a[p.minecraft.name] = {
            minecraft: p.minecraft,
            discord: p.discord,
            messages: p.messages ?? [],
            joined: false,
            team: null,
            kills: 0,
            deaths: 0,
            streak: 0,
            killTiming: [],
            bedsLost: 0,
            bedsBroken: 0,
            finalKills: 0,
            finalDeaths: 0,
            wins: 0,
            losses: 0,
            winMessage: p.winMessage ?? null,
            loseMessage: p.loseMessage ?? null
        };
        return a;
    }, {});
    data.map = game.map;
    data.beds = 0;
    data.number = game.number;
    data.diamond = false;
    data.startedAt = null;
    data.endedAt = null;
    chat(...game.players.map(p => `/p ${p.minecraft.name}`), '/p settings allinvite');
    setTimeout(async () => {
        if (data.startedAt || data.endedAt)
            return;
        socket?.emit('gameCancel');
        await chat('/pc This game took too long to start, and has been canceled.', '/p leave');
        reset();
    }, 8 * 60 * 1000);
}
async function onGameEnd(winner) {
    if (!winner || data.beds <= 0)
        return;
    data.endedAt = Date.now();
    await chat('/pc GAME ENDED.');
    for (const username in data.players) {
        const player = data.players[username];
        if (!player.team)
            player.team = winner;
        const isWinner = player.team === winner;
        const gameMessage = player[isWinner ? 'winMessage' : 'loseMessage'];
        if (isWinner) {
            player.wins = 1;
        }
        else {
            player.losses = 1;
            player.bedsLost = 1;
        }
        if (gameMessage) {
            chat(`/pc ${gameMessage}`);
        }
    }
    socket?.emit('gameFinish', { players: data.players, number: data.number });
    reset();
}
function softReset() {
    data.startedAt = null;
    data.endedAt = null;
    data.warnings = {};
    chat('/lobby');
}
function reset() {
    data.players = {};
    data._players = [];
    data.map = null;
    data.startedAt = null;
    data.endedAt = null;
    data.warnings = {};
    data.partied = false;
    chat('/lobby', '/p leave');
}
function error(username) {
    return chat(username
        ? `/pc Bot detected that ${username} is nicked or is an alt. Please requeue or game will be voided.`
        : '/pc Bot detected that there is a nick or an alt in the game. Please requeue or game will be voided.');
}
const bannedItems = {
    '146:0:0': {
        name: 'Compact Pop-up Tower',
        weapon: false,
        block: true
    },
    '280:0:34': {
        name: 'Stick (Knockback II)',
        weapon: true
    },
    '261:0:49': {
        name: 'Bow (Punch I)',
        weapon: true
    },
    '261:0:0': {
        name: 'Bow',
        weapon: true,
        diamond: true
    },
    '49:0:0': {
        name: 'Obsidian',
        weapon: false,
        block: true
    },
    '368:0:0': {
        name: 'Ender Pearl',
        weapon: false,
        bed_break: true
    },
    '344:0:0': {
        name: 'Bridge Egg',
        weapon: false,
        diamond: true
    },
    '373:8203:0': {
        name: 'Jump V Potion',
        weapon: false,
        diamond: true
    }
};
function isBannedItem(item) {
    if (!item)
        return { item: false, value: 0 };
    const enchantment = item?.nbt?.value?.ench?.value?.value?.[0]?.id?.value ?? 0;
    const string = `${item.type}:${item.metadata}:${enchantment}`;
    const banned = bannedItems[string];
    const diamond = data.beds > 0 || data.diamond;
    if (!banned)
        return { item: false, value: string };
    return { item: banned.bed_break ? data.beds === 0 ? banned : false : banned.diamond ? diamond === false ? banned : false : banned, value: string };
}
bot.on('entityMoved', (entity) => {
    if (!data.startedAt || entity.type !== 'player' || !data.startedAt || isWhitelisted(entity.username) === false)
        return;
    const { item, value } = isBannedItem(entity.heldItem);
    if (!item || data.warnings[entity.username]?.[value] > 0)
        return;
    if (!data.warnings[entity.username])
        data.warnings[entity.username] = {};
    data.warnings[entity.username][value] = 1;
});
bot.on('onCorrelateAttack', (attacker, victim) => {
    if (!data.startedAt || !attacker.heldItem || isWhitelisted(attacker.username) === false || isWhitelisted(victim.username) === false)
        return;
    const { item, value } = isBannedItem(attacker.heldItem);
    if (!item || item.weapon === false || data.warnings[attacker.username]?.[value] > 1)
        return;
    if (!data.warnings[attacker.username])
        data.warnings[attacker.username] = {};
    data.warnings[attacker.username][value] = 2;
    socket?.emit('playerBan', { id: data.players[attacker.username].discord });
    chat(`/pc 〘${attacker.username}〙 attacked ${victim.username}  with banned item: ${item.name}`);
});
bot.on('entitySwingArm', (entity) => {
    if (!data.startedAt || entity.type !== 'player' || !data.startedAt || isWhitelisted(entity.username) === false)
        return;
    const { item, value } = isBannedItem(entity.heldItem);
    if (!item || !item.block || data.warnings[entity.username]?.[value] > 1)
        return;
    if (!data.warnings[entity.username])
        data.warnings[entity.username] = {};
    data.warnings[entity.username][value] = 2;
    socket?.emit('playerBan', { id: data.players[entity.username].discord });
    chat(`/pc 〘${entity.username}〙 Used banned item: ${item.name}`);
});
