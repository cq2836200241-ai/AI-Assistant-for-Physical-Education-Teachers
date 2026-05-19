import type { GameItem } from '../types/gameItem';

/** 浏览器本地 JSON 库存储键（与内置 large_class_games.json 合并展示） */
export const USER_GAMES_STORAGE_KEY = 'pe_saved_game_library_items';

export function loadUserGamesFromStorage(): GameItem[] {
  try {
    const saved = localStorage.getItem(USER_GAMES_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as GameItem[];
    return Array.isArray(parsed) ? parsed.filter((game) => game?.id) : [];
  } catch (error) {
    console.warn('Failed to load user games from local JSON storage', error);
    return [];
  }
}

export function persistUserGames(games: GameItem[], seedIds: Set<string>) {
  const userGames = games.filter((game) => game?.id && !seedIds.has(game.id));
  localStorage.setItem(USER_GAMES_STORAGE_KEY, JSON.stringify(userGames));
}

export function mergeLibraryWithUserGames(seed: GameItem[], userGames: GameItem[]): GameItem[] {
  const seedIds = new Set(seed.map((game) => game.id));
  const uniqueUser = userGames.filter((game) => game?.id && !seedIds.has(game.id));
  return [...uniqueUser, ...seed];
}
