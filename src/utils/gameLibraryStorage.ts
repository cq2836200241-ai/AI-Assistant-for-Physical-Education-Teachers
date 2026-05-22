import type { GameItem } from '../types/gameItem';
import { readDesktopStore, writeDesktopStore } from '../lib/desktopStorage';

/** 桌面 JSON 游戏库存储键（与内置 large_class_games.json 合并展示） */
export const USER_GAMES_STORAGE_KEY = 'saved-game-library-items';

export async function loadUserGamesFromStorage(): Promise<GameItem[]> {
  try {
    const parsed = await readDesktopStore<unknown>(USER_GAMES_STORAGE_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((game) => game?.id) as GameItem[] : [];
  } catch (error) {
    console.warn('Failed to load user games from desktop JSON storage', error);
    return [];
  }
}

export async function persistUserGames(games: GameItem[], seedIds: Set<string>) {
  const userGames = games.filter((game) => game?.id && !seedIds.has(game.id));
  await writeDesktopStore(USER_GAMES_STORAGE_KEY, userGames);
}

export function mergeLibraryWithUserGames(seed: GameItem[], userGames: GameItem[]): GameItem[] {
  const seedIds = new Set(seed.map((game) => game.id));
  const uniqueUser = userGames.filter((game) => game?.id && !seedIds.has(game.id));
  return [...uniqueUser, ...seed];
}
