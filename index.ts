const mineflayer = require('mineflayer');
const ranks = ['[VIP]', '[VIP+]', '[MVP]', '[MVP+]', '[MVP++]', '[YOUTUBE]', '[HELPER]', '[MOD]', '[ADMIN]'];
let bot = mineflayer.createBot({
    host: 'mc.hypixel.net',
    version: '1.8',
    username: 'luddezwallin@gmail.com',
    password: 'Hibbert66!',
})
let set = false;

bot.on("login", () => {
    console.log(`${bot.username} --> Online!`);
})

// setup these variables when game starts

let players = [];
const botInviteList = players.map(p => p.minecraft.name); // shd remain this
const team1 = botInviteList.slice(0, 4);
const team2 = botInviteList.slice(4);
let greenTeam = []; // shd be empty
let redTeam = []; // shd be empty
let peopleWhoBrokeBeds = [];

bot.on("message", message => {

    const line0 = message.toString().split('\n')[0];
    const line0_arr = line0.split(' ');

    // party system
    if(message.toString().split('\n').length > 1) {
        
        const line1_arr = message.toString().split('\n')[1].split(' ');
        console.log(line1_arr);

        if(ranks.includes(line1_arr[0]) && line1_arr[3] === 'invited' && line1_arr[4] === 'you' && botInviteList.includes(line1_arr[1])) {
          bot.chat(`/party accept ${line1_arr[1]}`);        
        }
        else if(line1_arr[2] === 'invited' && line1_arr[3] === 'you' && botInviteList.includes(line1_arr[0])) {
          bot.chat(`/party accept ${line1_arr[0]}`);
        }

        return;
    }

   if(line0.includes(':')) {
        return;
    }

    if(message.toString() === 'You are AFK. Move around to return from AFK.') {
        return bot.chat('/lobby');
    }

    console.log(`\n${line0}\n`);
    const motD = message.toMotd();
    const greenPos = motD.indexOf('§a');
    const redPos = motD.indexOf('§c');
    const trimmed = line0.trim();

    // Final Kill, Normal Kill + Death, Normal Death, Bed Break, GameStart, GameEnd

    // Final Kill
    if(line0.endsWith('FINAL KILL!')) {
        let ign = line0_arr.slice(-3, -2)[0].slice(0, -1);

        if(ign === 'void') {
            return findPlayer(line0_arr[0]).deaths++;
        }

        findPlayer(ign).kills++;
        return findPlayer(line0_arr[0]).deaths++;
    }

    // Bed Destroyed
    else if(line0.startsWith('BED DESTRUCTION >')) {
        peopleWhoBrokeBeds.push(line0_arr.slice(-1)[0].slice(0, -1));
    }

    // Actual Game Start
    else if(line0.trim() === 'Protect your bed and destroy the enemy beds.') {
        bot.chat('/lobby');

        setTimeout(() => bot.chat('/rejoin'), 2000);
    }

    // Normal Death
    else if(line0.indexOf('fell into the void.') !== -1) {
        findPlayer(line0_arr[0]).deaths++;
    }

    // Win Tracker
    else if(trimmed.startsWith('Red -')) {
        endGame(redTeam);
    }

    // Win Tracker
    else if(trimmed.startsWith('Green -')) {
        endGame(greenTeam);
    }

    // KILL SECTION HERE SHD GO IN THE END    
    if(redPos === -1 || greenPos === -1) {
        return;
    }

    const kill = [line0_arr.slice(-1)[0].slice(0, -1).trim(), line0_arr[0].trim()];

    if(kill.includes('party') || kill.includes('eliminated') || kill.includes('<<') || kill.includes('----------------------------') || kill.includes('-----------------------------')) {
        return;
    }

    if(motD.indexOf('§c') < motD.indexOf('§a') && !set) {
        if(team1.includes(kill[0])) {
            greenTeam = team1;
            redTeam = team2;
        }
        console.log('teams set');
    }
    else if(!set) {
        if(team1.includes(kill[0])) {
            redTeam = team1;
            greenTeam = team2;
        }
        console.log('teams set');        
    }

    console.log(`killer --> ${kill[0]}\nkillee --> ${kill[1]}`);
        console.log(`Green Team --> ${greenTeam}\nRed Team --> ${redTeam}`);
        findPlayer(kill[0]).kills++;
        findPlayer(kill[1]).deaths++;
        set = true;
})

function findPlayer(ign) {
    return botInviteList.find(player => player.minecraft.name === ign);
}

function endGame(team) {
    bot.chat('/pc Great game guys! Svee says have a good day <3');
    bot.chat('/p leave');

    players.forEach(player => {

        if(team.includes(player.minecraft.name)) {
            player.winstreak++;
            player.wins++;
        }
        else {
            player.winstreak = 0;
            player.losses++;
        }

        if(peopleWhoBrokeBeds.includes(player.minecraft.ign)) {
            player.bedsBroken++;
            player.bedsStreak++;
        } 
        else {
            player.bedsStreak = 0;
        }

        if(peopleWhoBrokeBeds.length === 2) {
            player.bedsLost++;
        }
        else if(!team.includes(player.minecraft.name)) {
            player.bedsLost++;
        }

        // emit event
    })
}
