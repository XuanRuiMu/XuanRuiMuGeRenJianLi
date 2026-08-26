import { DimensionMaze } from './DimensionMaze.js';
import { LightningShooter } from './LightningShooter.js';
import { MechBattle } from './MechBattle.js';
import { NeonArena } from './NeonArena.js';
import { NeonDefense } from './NeonDefense.js';
import { ReactionGame } from './ReactionGame.js';
import { StarOcean } from './StarOcean.js';

export const 游戏注册表 = [
  { 标识: 'reaction', 类: ReactionGame, 类型: 'SOLO', 名称键: 'games.reaction.title' },
  { 标识: 'neon-arena', 类: NeonArena, 类型: 'PVP', 名称键: 'games.neonArena.title' },
  {
    标识: 'lightning-shooter',
    类: LightningShooter,
    类型: 'SOLO',
    名称键: 'games.lightningShooter.title'
  },
  { 标识: 'star-ocean', 类: StarOcean, 类型: 'RPG', 名称键: 'games.starOcean.title' },
  { 标识: 'mech-battle', 类: MechBattle, 类型: 'PVE', 名称键: 'games.mechBattle.title' },
  {
    标识: 'dimension-maze',
    类: DimensionMaze,
    类型: 'PUZZLE',
    名称键: 'games.dimensionMaze.title'
  },
  { 标识: 'neon-defense', 类: NeonDefense, 类型: 'TD', 名称键: 'games.neonDefense.title' }
];
