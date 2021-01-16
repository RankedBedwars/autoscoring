"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const socket_io_client_1 = require("socket.io-client");
const mineflayer_1 = __importDefault(require("mineflayer"));
const ranks = ['[VIP]', '[VIP+]', '[MVP]', '[MVP+]', '[MVP++]', '[YOUTUBE]', '[HELPER]', '[MOD]', '[ADMIN]'];
let bot = mineflayer_1.default.createBot({
    host: 'mc.hypixel.net',
    version: '1.8',
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
});
let set = false;
let players = [];
let pTemp = [];
let botInviteList = [];
let team1 = [];
let team2 = [];
let greenTeam = [];
let redTeam = [];
let peopleWhoBrokeBeds = [];
let map;
let mapChecked;
let players2 = {};
let in_party = [];
let chat = [];
let botAssigned = false;
let socket;
let gameStarted = false;
let gameEnded = false;
let timeout;
bot.on("login", () => {
    console.log(`${bot.username} --> Online!`);
    socket = socket_io_client_1.io(`http://${process.env.LOCAL_SOCKET ? "localhost" : "rbw-s1.slicknicky10.me"}:${process.env.SOCKET_PORT}/?key=${process.env.SOCKET_KEY}&bot=${bot.username}`);
    socket.on("gameStart", (data) => {
        const _players = data.players;
        const _map = data.map;
        console.log(`Received data: ${JSON.stringify(data.players)}`);
        players = _players;
        pTemp = [...players];
        botInviteList = players.map(p => p.minecraft.name);
        team1 = botInviteList.slice(0, (players.length) / 2);
        team2 = botInviteList.slice(players.length / 2);
        map = _map;
        mapChecked = false;
        chat = [];
        in_party = [];
        players.forEach(player => {
            players2[player.minecraft.name] = { status: null, tries: 0 };
        });
        botAssigned = true;
        console.log('Game Started');
        timeout = setTimeout(() => {
            if (gameStarted)
                return;
            bot.chat("/pc This game took too long to start, and has been canceled.");
            setTimeout(() => bot.chat("/p leave"), 1000);
            socket.emit("gameCancel");
        }, 5 * 60000);
    });
    setTimeout(() => bot.chat("/p leave"), 1000);
});
bot.on("message", message => {
    console.log(message.toString().split(' '));
    const line0 = message.toString().split('\n')[0];
    const line0_arr = line0.split(' ');
    if (message.toString().split('\n').length > 1) {
        const line1 = message.toString().split('\n')[1];
        const line1_arr = line1.split(' ');
        if (line1.includes("invited") && line1.includes("to the party! They have 60 seconds to accept.")) {
            let invited = "", inviter = "";
            if (line1_arr[2].includes("["))
                invited = line1_arr[3];
            else
                invited = line1_arr[2];
            if (line1_arr[0].includes("["))
                inviter = line1_arr[1];
            else
                inviter = line1_arr[0];
            players2[invited].status = "invited";
            players2[invited].inviter = inviter;
        }
        else if (line1.includes("The party invite to") && line1.includes("has expired")) {
            let expired = "";
            if (line1_arr[4].includes("["))
                expired = line1_arr[5];
            else
                expired = line1_arr[4];
            if (Object.keys(players).includes(expired)) {
                if (players2[expired].tries < 3) {
                    chat.push(`/pc [RBW] ${expired} hasn't joined the party yet. ${3 - players2[expired].tries} tries remaining!`);
                    players2[expired].tries++;
                    chat.push("/p " + expired);
                }
                else {
                    bot.chat('/pc 3 invites expired. Please manually invite the remaining players.');
                }
            }
        }
        else if (line1.includes("joined the party.")) {
            let joined = "", rank = null;
            if (line1_arr[0].includes("[")) {
                rank = line1_arr[0];
                joined = line1_arr[1];
            }
            else
                joined = line1_arr[0];
            if (Object.keys(players2).includes(joined)) {
                players2[joined].status = "joined";
                players2[joined].rank = !rank ? "NON" : rank;
                in_party.push(joined);
            }
            if (in_party.length === players.length) {
                const mvp_pp = Object.keys(players2).find(key => players2[key].rank === "[MVP++]");
                if (mvp_pp)
                    chat.push(`/p transfer ${mvp_pp}`);
                else
                    chat.push("/p transfer " + in_party[Math.floor(Math.random() * players.length)]);
            }
        }
        else if (line1.includes("has left the party.") && !line1.includes(":")) {
            let left = "";
            if (line1_arr[0].includes("["))
                left = line1_arr[1];
            else
                left = line1_arr[0];
            if (Object.keys(players2).includes(left)) {
                players2[left].status = "left";
                in_party.filter(name => name !== left);
            }
        }
        return;
    }
    if (line0.includes(':')) {
        return;
    }
    if (line0_arr[1] === 'has' && line0_arr[2] === 'joined') {
        if (!mapChecked) {
            bot.chat('/map');
        }
        return;
    }
    if (line0.startsWith('You are currently playing on ')) {
        if (map !== line0_arr.slice(-1).join("") && !mapChecked) {
            bot.chat(`Please choose the map ${map} when you join the game instead of ${line0_arr.slice(-1).join("")}.`);
            return gameReset();
        }
        return;
    }
    if (message.toString() === 'You are AFK. Move around to return from AFK.') {
        return bot.chat('/lobby');
    }
    const motD = message.toMotd();
    const greenPos = motD.indexOf('§a');
    const redPos = motD.indexOf('§c');
    if (line0.trim() === 'Protect your bed and destroy the enemy beds.') {
        gameStarted = true;
        setTimeout(() => bot.chat('/lobby'), 4000);
        setTimeout(() => bot.chat('/rejoin'), 5000);
        setTimeout(() => {
            Object.values(bot.players).forEach(player => {
                console.log(player.displayName.toString());
                if (![...botInviteList, bot.username].includes(player.displayName.toString()) && player.ping === 1) {
                    errorMsg(player.username);
                    return gameReset();
                }
            });
            Object.values(bot.players).forEach(player => {
                console.log(player);
            });
            if (timeout)
                clearTimeout(timeout);
        }, 5500);
    }
    if (!gameStarted) {
        return;
    }
    if (line0 === 'All beds have been destroyed!') {
        return peopleWhoBrokeBeds.push('null');
    }
    if (line0.endsWith("died.")) {
        const p = findPlayer(line0_arr[0]);
        if (p)
            return p.deaths++;
        errorMsg(line0_arr[0]);
        return gameReset();
    }
    if (line0.endsWith('FINAL KILL!')) {
        var ign = line0_arr.slice(-3, -2)[0].slice(0, -1);
        if (ign === 'void' || ign === 'died') {
            if (!set) {
                if (greenPos !== -1) {
                    if (players.findIndex(p => p.minecraft.name === line0_arr[0]) < (players.length / 2)) {
                        greenTeam = team1;
                        redTeam = team2;
                    }
                    else {
                        redTeam = team1;
                        greenTeam = team2;
                    }
                }
                else {
                    if (players.findIndex(p => p.minecraft.name === line0_arr[0]) < (players.length / 2)) {
                        redTeam = team1;
                        greenTeam = team2;
                    }
                    else {
                        greenTeam = team1;
                        redTeam = team2;
                    }
                }
            }
            set = true;
            try {
                return findPlayer(line0_arr[0]).deaths++;
            }
            catch {
                errorMsg(line0_arr[0]);
                return gameReset();
            }
        }
        let p = findPlayer(ign);
        if (!p) {
            p = findPlayer(line0_arr.slice(-5, -4)[0].slice(0, -2));
            if (!p) {
                errorMsg('');
                return gameReset();
            }
        }
        if (motD.indexOf('§c') < motD.indexOf('§a') && !set) {
            if (team1.includes(line0_arr[0])) {
                redTeam = team1;
                greenTeam = team2;
            }
            else {
                greenTeam = team1;
                redTeam = team2;
            }
            console.log('teams set');
        }
        else if (!set) {
            if (team1.includes(line0_arr[0])) {
                greenTeam = team1;
                redTeam = team2;
            }
            else {
                redTeam = team1;
                greenTeam = team2;
            }
        }
        set = true;
        try {
            p.kills++;
            return findPlayer(line0_arr[0]).deaths++;
        }
        catch {
            errorMsg(line0_arr[0]);
            return gameReset();
        }
    }
    else if (line0.startsWith('BED DESTRUCTION >')) {
        peopleWhoBrokeBeds.push(line0_arr.slice(-1)[0].slice(0, -1));
    }
    else if (line0.indexOf('fell into the void.') !== -1) {
        try {
            return findPlayer(line0_arr[0]).deaths++;
        }
        catch {
            errorMsg(line0_arr[0]);
            return gameReset();
        }
    }
    else if (line0 === 'TEAM ELIMINATED > Green Team has been eliminated!') {
        endGame(redTeam);
    }
    else if (line0 === 'TEAM ELIMINATED > Red Team has been eliminated!') {
        endGame(greenTeam);
    }
    if (redPos === -1 || greenPos === -1) {
        return;
    }
    const kill = [line0_arr.slice(-1)[0].slice(0, -1).trim(), line0_arr[0].trim()];
    if (!(findPlayer(kill[0]) && findPlayer(kill[1]))) {
        return;
    }
    if (motD.indexOf('§c') < motD.indexOf('§a') && !set) {
        if (team1.includes(kill[0])) {
            greenTeam = team1;
            redTeam = team2;
        }
        else {
            redTeam = team1;
            greenTeam = team2;
        }
    }
    else if (!set) {
        if (team1.includes(kill[0])) {
            redTeam = team1;
            greenTeam = team2;
        }
        else {
            greenTeam = team1;
            redTeam = team2;
        }
    }
    console.log('teams set');
    set = true;
    console.log(`killer --> ${kill[0]}\nkillee --> ${kill[1]}`);
    console.log(`Green Team --> ${greenTeam}\nRed Team --> ${redTeam}`);
    try {
        findPlayer(kill[0]).kills++;
    }
    catch {
        errorMsg(kill[0]);
        return gameReset();
    }
    try {
        return findPlayer(kill[1]).deaths++;
    }
    catch {
        errorMsg(kill[1]);
        return gameReset();
    }
});
function findPlayer(ign) {
    return players.find(player => player.minecraft.name === ign);
}
function endGame(team) {
    if (peopleWhoBrokeBeds.length === 0) {
        gameStarted = false;
        bot.chat('/pc Game has to be re-queued.');
        return gameReset();
    }
    if (gameEnded)
        return;
    gameEnded = true;
    bot.chat('/pc Great game guys! Svee says have a good day <3');
    setTimeout(() => bot.chat('/p leave'), 1000);
    players.forEach(player => {
        if (team.includes(player.minecraft.name)) {
            player.winstreak++;
            player.wins++;
        }
        else {
            player.winstreak = 0;
            player.losses++;
        }
        if (peopleWhoBrokeBeds.includes(player.minecraft.name)) {
            player.bedsBroken++;
            player.bedstreak++;
        }
        else {
            player.bedstreak = 0;
        }
        if (peopleWhoBrokeBeds.length === 2) {
            player.bedsLost++;
        }
        else if (!team.includes(player.minecraft.name)) {
            player.bedsLost++;
        }
    });
    console.log(`Game finished, sending back: ${JSON.stringify(players)}`);
    socket.emit("gameFinish", players);
    botInviteList = [];
    players = [];
    players2 = {};
    chat = [];
    in_party = [];
    gameReset();
}
function gameReset() {
    setTimeout(() => bot.chat('/lobby'), 3000);
    gameStarted = false;
    gameEnded = false;
    peopleWhoBrokeBeds = [];
    redTeam = [];
    greenTeam = [];
    set = false;
    mapChecked = false;
    botAssigned = false;
    ``;
    return players = pTemp;
}
function errorMsg(ign) {
    if (ign === '') {
        return setTimeout(() => bot.chat(`/pc Bot detected that there is a nick or an alt in the game. Please requeue or game will be voided.`), 1000);
    }
    setTimeout(() => bot.chat(`/pc Bot detected that ${ign} is nicked or is an alt. Please requeue or game will be voided.`), 1000);
}
setInterval(() => {
    if (chat.length)
        bot.chat(chat.shift());
}, 800);
setInterval(() => {
    if (botAssigned) {
        chat.push("/p " + Object.keys(players2).slice(0, players.length / 2).join(" "));
        chat.push("/p " + Object.keys(players2).slice(players.length / 2).join(" "));
        botAssigned = false;
        console.log('Partied people.');
    }
}, 5000);
