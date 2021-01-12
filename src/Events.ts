import type { Player } from "./Player";

export interface GameStart {
    players: { data: Player }[];
}