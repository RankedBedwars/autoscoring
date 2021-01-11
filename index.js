var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var mineflayer = require('mineflayer');
var ranks = ['[VIP]', '[VIP+]', '[MVP]', '[MVP+]', '[MVP++]', '[YOUTUBE]', '[HELPER]', '[MOD]', '[ADMIN]'];
var bot = mineflayer.createBot({
    host: 'mc.hypixel.net',
    version: '1.8',
    username: 'luddezwallin@gmail.com',
    password: 'Hibbert66!'
});
var set = false;
bot.on("login", function () {
    console.log(bot.username + " --> Online!");
});
// setup these variables when game starts
var team1 = []; // Player Objects
var team2 = []; // Player Objects
var botInviteList = __spreadArrays(team1, team2); // shd remain this
var greenTeam = []; // shd be empty
var redTeam = []; // shd be empty
bot.on("message", function (message) {
    var line0 = message.toString().split('\n')[0];
    var line0_arr = line0.split(' ');
    // party system
    if (message.toString().split('\n').length > 1) {
        var line1_arr = message.toString().split('\n')[1].split(' ');
        console.log(line1_arr);
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
    console.log("\n" + line0 + "\n");
    var motD = message.toMotd();
    var greenPos = motD.indexOf('§a');
    var redPos = motD.indexOf('§c');
    var trimmed = line0.trim();
    // Final Kill, Normal Kill + Death, Normal Death, Bed Break, GameStart, GameEnd
    // Final Kill
    if (line0.endsWith('FINAL KILL!')) {
        var ign = line0_arr.slice(-3, -2)[0].slice(0, -1);
        if (ign === 'void') {
            return;
        }
        console.log(ign + " --> Final Kill");
        // update player kills here
    }
    // Bed Destroyed
    else if (line0.startsWith('BED DESTRUCTION >')) {
        var ign = line0_arr.slice(-1)[0].slice(0, -1);
        console.log(ign + " --> Bed Destruction");
        // update team beds here by checking ign and also which team its in and        
    }
    // Actual Game Start
    else if (line0.trim() === 'Protect your bed and destroy the enemy beds.') {
        bot.chat('/lobby');
        setTimeout(function () { return bot.chat('/rejoin'); }, 2000);
    }
    // Normal Death
    else if (line0.indexOf('fell into the void.') !== -1) {
        var ign = line0_arr[0];
        console.log("DEATH --> " + message);
        // update deaths
    }
    // Game End
    else if (line0.includes('This game has been recorded.')) {
        bot.chat('/pc Great game guys! Svee says have a good day <3');
        bot.chat('/p leave');
        // update game status and end game
    }
    // Win Tracker
    else if (trimmed.startsWith('Red -')) {
        // Red Wins
    }
    // Win Tracker
    else if (trimmed.startsWith('Green -')) {
        return; // Green Wins
    }
    // KILL SECTION HERE SHD GO IN THE END    
    if (redPos === -1 || greenPos === -1) {
        return;
    }
    var kill = [line0_arr.slice(-1)[0].slice(0, -1).trim(), line0_arr[0].trim()];
    if (kill.includes('party') || kill.includes('eliminated') || kill.includes('<<') || kill.includes('----------------------------') || kill.includes('-----------------------------')) {
        return;
    }
    if (motD.indexOf('§c') < motD.indexOf('§a')) {
        if (!set) {
            if (team1.includes(kill[0])) {
                greenTeam = team1;
                redTeam = team2;
            }
        }
        console.log("killer --> " + kill[0] + "\nkillee --> " + kill[1]);
        console.log("Green Team --> " + greenTeam + "\nRed Team --> " + redTeam);
        set = true;
    }
    else {
        if (!set) {
            if (team1.includes(kill[0])) {
                redTeam = team1;
                greenTeam = team2;
            }
        }
        console.log("killer --> " + kill[0] + "\nkillee --> " + kill[1]);
        console.log("Green Team --> " + greenTeam + "\nRed Team --> " + redTeam);
        set = true;
    }
});
function findPlayer(ign) {
    return botInviteList.find(function (player) { return player.minecraft.name === ign; });
}
