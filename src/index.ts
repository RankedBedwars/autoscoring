import dotenv from "dotenv";
dotenv.config();

import { io, Socket } from "socket.io-client";
import mineflayer from "mineflayer";
import type { Player } from "./Player";
import type { GameStart } from "./Events";

const ranks = ['[VIP]', '[VIP+]', '[MVP]', '[MVP+]', '[MVP++]', '[YOUTUBE]', '[HELPER]', '[MOD]', '[ADMIN]'];
let bot = mineflayer.createBot({
    host: 'mc.hypixel.net',
    version: '1.8',
    username: process.env.USERNAME!,
    password: process.env.PASSWORD!,
});

let set = false;
let players: Player[] = [];
let pTemp = [...players];
let botInviteList = players.map(p => p.minecraft.name);
let team1 = botInviteList.slice(0, (players.length) / 2);
let team2 = botInviteList.slice(4);
let greenTeam: string[] = [];
let redTeam: string[] = []; 
let peopleWhoBrokeBeds: string[] = [];

let socket: Socket;

bot.on("login", () => {
    console.log(`${bot.username} --> Online!`);
    socket = io(`http://localhost:${process.env.SOCKET_PORT!}/?key=${process.env.SOCKET_KEY!}&bot=${bot.username}`);
    socket.on("gameStart", (data: GameStart) => {
        const _players = data.players.map(({ data }) => data);
        players = _players;
        pTemp = [...players];
        botInviteList = players.map(p => p.minecraft.name);
        team1 = botInviteList.slice(0, (players.length) / 2);
        team2 = botInviteList.slice(4);
    });
});

bot.on("message", message => {
    
    const line0 = message.toString().split('\n')[0];
    const line0_arr = line0.split(' ');

    // party system
    if(message.toString().split('\n').length > 1) {
        
        const line1 = message.toString().split('\n')[1];
        const line1_arr = line1.split(' ');
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

    const motD = message.toMotd();
    const greenPos = motD.indexOf('§a');
    const redPos = motD.indexOf('§c');

    // Final Kill, Normal Kill + Death, Normal Death, Bed Break, GameStart, GameEnd

    if(line0 === 'All beds have been destroyed!') {
        return peopleWhoBrokeBeds.push('null');
    }

    // Final Kill
    if(line0.endsWith('FINAL KILL!')) {
        var ign = line0_arr.slice(-3, -2)[0].slice(0, -1);
        if (ign === 'void') {
            if(!set) {
                if(greenPos !== -1) {
                    if(players.findIndex(p => p.minecraft.name === line0_arr[0]) <= 0) {
                        greenTeam = team1;
                        redTeam = team2;
                    }
                    else {
                        redTeam = team1;
                        greenTeam = team2;
                    }
                }
                else {
                    if(players.findIndex(p => p.minecraft.name === line0_arr[0]) <= 0) {
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
                return findPlayer(line0_arr[0])!.deaths!++;
            }
            catch {
                gameReset();
                return errorMsg();
            }
        }

        let p = findPlayer(ign);

        if(!p) {
            p = findPlayer(line0_arr.slice(-5, -4)[0].slice(0, -2));
            if(!p) {
               return console.log(p); 
            }
        }

        if(motD.indexOf('§c') < motD.indexOf('§a') && !set) {
            if(team1.includes(line0_arr[0])) {
                redTeam = team1;
                greenTeam = team2;
            }
            else {
                greenTeam = team1;
                redTeam = team2;
            }
            console.log('teams set');
        }
        else if(!set) {
            if(team1.includes(line0_arr[0])) {
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
            p.kills!++;
            return findPlayer(line0_arr[0])!.deaths!++;
        }
        catch {
            gameReset();
            return errorMsg();
        }
    }

    // Bed Destroyed
    else if(line0.startsWith('BED DESTRUCTION >')) {
        peopleWhoBrokeBeds.push(line0_arr.slice(-1)[0].slice(0, -1));
    }

    // Actual Game Start
    else if(line0.trim() === 'Protect your bed and destroy the enemy beds.') {
        setTimeout(() => bot.chat('/lobby'), 2000);
        setTimeout(() => bot.chat('/rejoin'), 3000);
    }

    // Normal Death
    else if(line0.indexOf('fell into the void.') !== -1) {
        try {
            return findPlayer(line0_arr[0])!.deaths!++;
        }
        catch {
            gameReset();
            return errorMsg();
        }
    }

    else if(line0 === 'TEAM ELIMINATED > Green Team has been eliminated!') {
        endGame(redTeam);
    }

    else if(line0 === 'TEAM ELIMINATED > Red Team has been eliminated!') {
        endGame(greenTeam);
    }

    // KILL SECTION HERE SHD GO IN THE END    
    if(redPos === -1 || greenPos === -1) {
        return;
    }

    const kill = [line0_arr.slice(-1)[0].slice(0, -1).trim(), line0_arr[0].trim()];

    if(!(findPlayer(kill[0]) && findPlayer(kill[1]))) {
        return;
    }

    if(motD.indexOf('§c') < motD.indexOf('§a') && !set) {
        if(team1.includes(kill[0])) {
            greenTeam = team1;
            redTeam = team2;
        }
        else {
            redTeam = team1;
            greenTeam = team2;
        }
    }
    else if(!set) {
        if(team1.includes(kill[0])) {
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
        findPlayer(kill[0])!.kills!++;
        return findPlayer(kill[1])!.deaths!++;
    }
    catch {
        gameReset();
        return errorMsg();
    }
    
})

function findPlayer(ign: string) {
    return players.find(player => player.minecraft.name === ign);
}

function endGame(team: string[]) {
    if(peopleWhoBrokeBeds.length === 0) {
        bot.chat('Game is being requeued.');
        gameReset();
    }

    bot.chat('/pc Great game guys! Svee says have a good day <3');
    setTimeout(() => bot.chat('/p leave'), 1000);

    players.forEach(player => {

        if(team.includes(player.minecraft.name)) {
            player.winstreak!++;
            player.wins!++;
        }
        else {
            player.winstreak = 0;
            player.losses!++;
        }

        if(peopleWhoBrokeBeds!.includes(player.minecraft.name)) {
            player.bedsBroken!++;
            player.bedstreak!++;
        } 
        else {
            player.bedstreak = 0;
        }

        if(peopleWhoBrokeBeds.length === 2) {
            player.bedsLost!++;
        }
        else if(!team.includes(player.minecraft.name)) {
            player.bedsLost!++;
        }        
    })

    socket.emit("gameFinish", players);
    gameReset();
}

function gameReset() {
    setTimeout(() => bot.chat('/lobby'), 1000);
    redTeam = [];
    greenTeam = [];
    set = false;
    return players = pTemp;
}

function errorMsg() {
    setTimeout(() => bot.chat('/pc Bot detected a nick or an alt. Please re-queue or this game will be voided.'), 1000);
}
