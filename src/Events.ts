import type { Player } from "./Player";

export interface GameStart {
    players: Player[];
    map: string;
}