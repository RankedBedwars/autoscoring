"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var dotenv_1 = require("dotenv");
dotenv_1["default"].config();
var socket_io_client_1 = require("socket.io-client");
var mineflayer_1 = require("mineflayer");
var ranks = ['[VIP]', '[VIP+]', '[MVP]', '[MVP+]', '[MVP++]', '[YOUTUBE]', '[HELPER]', '[MOD]', '[ADMIN]'];
var bot = mineflayer_1["default"].createBot({
    host: 'mc.hypixel.net',
    version: '1.8',
    username: process.env.USERNAME,
    password: process.env.PASSWORD
});
var set = false;
var players = [];
var pTemp = [];
var botInviteList = [];
var team1 = [];
var team2 = [];
var greenTeam = [];
var redTeam = [];
var peopleWhoBrokeBeds = [];
var socket;
var gameStarted = false;
var gameEnded = false;
bot.on("login", function () {
    console.log(bot.username + " --> Online!");
    socket = socket_io_client_1.io("http://localhost:" + process.env.SOCKET_PORT + "/?key=" + process.env.SOCKET_KEY + "&bot=" + bot.username);
    socket.on("gameStart", function (data) {
        var _players = data.players;
        console.log("Received data: " + JSON.stringify(data.players));
        players = _players;
        pTemp = __spreadArrays(players);
        botInviteList = players.map(function (p) { return p.minecraft.name; });
        team1 = botInviteList.slice(0, (players.length) / 2);
        team2 = botInviteList.slice(players.length / 2);
    });
    setTimeout(function () { return bot.chat("/p leave"); }, 1000);
});
bot.on("message", function (message) {
    var line0 = message.toString().split('\n')[0];
    var line0_arr = line0.split(' ');
    // party system
    if (message.toString().split('\n').length > 1) {
        var line1 = message.toString().split('\n')[1];
        var line1_arr = line1.split(' ');
        if (ranks.includes(line1_arr[0]) && line1_arr[3] === 'invited' && line1_arr[4] === 'you' && botInviteList.includes(line1_arr[1])) {
            bot.chat("/party accept " + line1_arr[1]);
        }
        else if (line1_arr[2] === 'invited' && line1_arr[3] === 'you' && botInviteList.includes(line1_arr[0])) {
            bot.chat("/party accept " + line1_arr[0]);
        }
        return;
    }
    if (line0.includes(':')) {
        return;
    }
    if (message.toString() === 'You are AFK. Move around to return from AFK.') {
        return bot.chat('/lobby');
    }
    var motD = message.toMotd();
    var greenPos = motD.indexOf('§a');
    var redPos = motD.indexOf('§c');
    // Final Kill, Normal Kill + Death, Normal Death, Bed Break, GameStart, GameEnd
    if (!gameStarted) {
        return;
    }
    if (line0 === 'All beds have been destroyed!') {
        return peopleWhoBrokeBeds.push('null');
    }
    if (line0.endsWith("died.")) {
        var p = findPlayer(line0_arr[0]);
        if (p)
            return p.deaths++;
        errorMsg(line0_arr[0]);
        return gameReset();
    }
    // Final Kill
    if (line0.endsWith('FINAL KILL!')) {
        var ign = line0_arr.slice(-3, -2)[0].slice(0, -1);
        if (ign === 'void' || ign === 'died') {
            if (!set) {
                if (greenPos !== -1) {
                    if (players.findIndex(function (p) { return p.minecraft.name === line0_arr[0]; }) < (players.length / 2)) {
                        greenTeam = team1;
                        redTeam = team2;
                    }
                    else {
                        redTeam = team1;
                        greenTeam = team2;
                    }
                }
                else {
                    if (players.findIndex(function (p) { return p.minecraft.name === line0_arr[0]; }) < (players.length / 2)) {
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
            catch (_a) {
                errorMsg(line0_arr[0]);
                return gameReset();
            }
        }
        var p = findPlayer(ign);
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
        catch (_b) {
            errorMsg(line0_arr[0]);
            return gameReset();
        }
    }
    // Bed Destroyed
    else if (line0.startsWith('BED DESTRUCTION >')) {
        peopleWhoBrokeBeds.push(line0_arr.slice(-1)[0].slice(0, -1));
    }
    // Actual Game Start
    else if (line0.trim() === 'Protect your bed and destroy the enemy beds.') {
        gameStarted = true;
        setTimeout(function () { return bot.chat('/lobby'); }, 2000);
        setTimeout(function () { return bot.chat('/rejoin'); }, 3000);
        Object.values(bot.players).forEach(function (player) {
            if (!botInviteList.includes(player.displayName.toString())) {
                setTimeout(function () { return errorMsg(player.username); }, 7000);
                gameReset();
            }
        });
    }
    // Normal Death
    else if (line0.indexOf('fell into the void.') !== -1) {
        try {
            return findPlayer(line0_arr[0]).deaths++;
        }
        catch (_c) {
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
    // KILL SECTION HERE SHD GO IN THE END    
    if (redPos === -1 || greenPos === -1) {
        return;
    }
    var kill = [line0_arr.slice(-1)[0].slice(0, -1).trim(), line0_arr[0].trim()];
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
    console.log("killer --> " + kill[0] + "\nkillee --> " + kill[1]);
    console.log("Green Team --> " + greenTeam + "\nRed Team --> " + redTeam);
    try {
        findPlayer(kill[0]).kills++;
    }
    catch (_d) {
        errorMsg(kill[0]);
        return gameReset();
    }
    try {
        return findPlayer(kill[1]).deaths++;
    }
    catch (_e) {
        errorMsg(kill[1]);
        return gameReset();
    }
});
function findPlayer(ign) {
    return players.find(function (player) { return player.minecraft.name === ign; });
}
function endGame(team) {
    if (peopleWhoBrokeBeds.length === 0) {
        gameStarted = false;
        bot.chat('/pc Game is being requeued.');
        gameReset();
    }
    if (gameEnded)
        return;
    gameEnded = true;
    bot.chat('/pc Great game guys! Svee says have a good day <3');
    setTimeout(function () { return bot.chat('/p leave'); }, 1000);
    players.forEach(function (player) {
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
    console.log("Game finished, sending back: " + JSON.stringify(players));
    socket.emit("gameFinish", players);
    botInviteList = [];
    gameReset();
}
function gameReset() {
    setTimeout(function () { return bot.chat('/lobby'); }, 3000);
    gameStarted = false;
    gameEnded = false;
    peopleWhoBrokeBeds = [];
    redTeam = [];
    greenTeam = [];
    set = false;
    return players = pTemp;
}
function errorMsg(ign) {
    if (ign === '') {
        return setTimeout(function () { return bot.chat("/pc Bot detected that there is a nick or an alt in the game. Please re-queue or this game will be voided."); }, 1000);
    }
    setTimeout(function () { return bot.chat("/pc Bot detected that " + ign + " is nicked or is an alt. Please re-queue or this game will be voided."); }, 1000);
}
