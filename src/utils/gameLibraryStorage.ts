import type { GameItem } from '../types/gameItem';
import { readDesktopStore, writeDesktopStore } from '../lib/desktopStorage';

/** 桌面 JSON 游戏库存储键（与内置 large_class_games.json 合并展示） */
export const USER_GAMES_STORAGE_KEY = 'saved-game-library-items';
export const FAVORITE_GAMES_STORAGE_KEY = 'favorite-game-library-items';
export const HIDDEN_SEED_GAMES_STORAGE_KEY = 'hidden-seed-game-library-ids';

function dedupeGames(games: GameItem[]) {
  const seen = new Set<string>();
  return games.filter((game) => {
    if (!game?.id || seen.has(game.id)) return false;
    seen.add(game.id);
    return true;
  });
}

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

export function mergeLibraryWithUserGames(seed: GameItem[], userGames: GameItem[], hiddenSeedIds: string[] = []): GameItem[] {
  const seedIds = new Set(seed.map((game) => game.id));
  const hiddenIds = new Set(hiddenSeedIds);
  const uniqueUser = userGames.filter((game) => game?.id && !seedIds.has(game.id));
  return [...uniqueUser, ...seed.filter((game) => !hiddenIds.has(game.id))];
}

export async function loadFavoriteGamesFromStorage(): Promise<GameItem[]> {
  try {
    const parsed = await readDesktopStore<unknown>(FAVORITE_GAMES_STORAGE_KEY, []);
    return Array.isArray(parsed) ? dedupeGames(parsed.filter((game) => game?.id) as GameItem[]) : [];
  } catch (error) {
    console.warn('Failed to load favorite games from desktop JSON storage', error);
    return [];
  }
}

export async function persistFavoriteGames(games: GameItem[]) {
  await writeDesktopStore(FAVORITE_GAMES_STORAGE_KEY, dedupeGames(games));
}

export async function loadHiddenSeedGameIdsFromStorage(): Promise<string[]> {
  try {
    const parsed = await readDesktopStore<unknown>(HIDDEN_SEED_GAMES_STORAGE_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    console.warn('Failed to load hidden seed game ids from desktop JSON storage', error);
    return [];
  }
}

export async function persistHiddenSeedGameIds(ids: string[]) {
  await writeDesktopStore(HIDDEN_SEED_GAMES_STORAGE_KEY, Array.from(new Set(ids)));
}
