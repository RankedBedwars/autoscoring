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

let team1 = []; // Player Objects
let team2 = []; // Player Objects
let botInviteList = [...team1, ...team2]; // shd remain this
let greenTeam = []; // shd be empty
let redTeam = []; // shd be empty

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
            return ;
        }

        console.log(`${ign} --> Final Kill`);
        // update player kills here
    }

    // Bed Destroyed
    else if(line0.startsWith('BED DESTRUCTION >')) {

        const ign = line0_arr.slice(-1)[0].slice(0, -1);
        console.log(`${ign} --> Bed Destruction`);
        // update team beds here by checking ign and also which team its in and        
    }

    // Actual Game Start
    else if(line0.trim() === 'Protect your bed and destroy the enemy beds.') {
        bot.chat('/lobby');

        setTimeout(() => bot.chat('/rejoin'), 2000);
    }

    // Normal Death
    else if(line0.indexOf('fell into the void.') !== -1) {
        const ign = line0_arr[0];
        console.log(`DEATH --> ${message}`);
        // update deaths
    }

    // Game End
    else if(line0.includes('This game has been recorded.')) {
        bot.chat('/pc Great game guys! Svee says have a good day <3');
        bot.chat('/p leave');

        // update game status and end game
    }

    // Win Tracker
    else if(trimmed.startsWith('Red -')) {
        // Red Wins
    }

    // Win Tracker
    else if(trimmed.startsWith('Green -')) {
        return; // Green Wins
    }

    // KILL SECTION HERE SHD GO IN THE END    
    if(redPos === -1 || greenPos === -1) {
        return;
    }

    const kill = [line0_arr.slice(-1)[0].slice(0, -1).trim(), line0_arr[0].trim()];

    if(kill.includes('party') || kill.includes('eliminated') || kill.includes('<<') || kill.includes('----------------------------') || kill.includes('-----------------------------')) {
        return;
    }

    if(motD.indexOf('§c') < motD.indexOf('§a')) {
        if(!set) {
            if(team1.includes(kill[0])) {
                greenTeam = team1;
                redTeam = team2;
            }
        }
        console.log(`killer --> ${kill[0]}\nkillee --> ${kill[1]}`);
        console.log(`Green Team --> ${greenTeam}\nRed Team --> ${redTeam}`);
        set = true;
    }
    else {
        if(!set) {
            if(team1.includes(kill[0])) {
                redTeam = team1;
                greenTeam = team2;
            }
        }
        console.log(`killer --> ${kill[0]}\nkillee --> ${kill[1]}`);
        console.log(`Green Team --> ${greenTeam}\nRed Team --> ${redTeam}`);
        set = true;
    }
})

function findPlayer(ign) {
    return botInviteList.find(player => player.minecraft.name === ign);
}
