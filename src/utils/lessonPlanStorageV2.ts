import seedData from '../date/lesson_plans_seed_v2.json';
import { readDesktopUserStore, writeDesktopUserStore } from '../lib/desktopStorage';
import {
  standardizeLessonPlanProcess,
  standardizeLessonPlansProcess,
} from './lessonPlanProcessStandard';

export interface LessonPlanV2 {
  课题名称: string;
  教学目标: {
    运动能力: string;
    健康行为: string;
    体育品德: string;
  };
  教学重难点: {
    教学重点: string;
    教学难点: string;
  };
  场地与器材: {
    教学场地: string;
    教具器材: string;
  };
  教学过程: Record<
    string,
    Record<
      string,
      {
        教学内容: string;
        教师活动: string;
        学生活动: string;
        安全与提示: string;
      }
    >
  >;
  预计运动负荷: {
    平均心率: string;
    练习密度: string;
  };
  安全措施: string[];
  课后反思: string;
}

const STORAGE_KEY = 'lesson-plans-v2';
const FAVORITES_KEY = 'lesson-plans-v2-favorites';
let plansCache: { username: string; plans: LessonPlanV2[] } | null = null;
let favoritesCache: { username: string; favorites: LessonPlanV2[] } | null = null;

function matchesLessonPlan(a: LessonPlanV2, b: LessonPlanV2): boolean {
  return (
    a.课题名称 === b.课题名称 &&
    a.场地与器材?.教学场地 === b.场地与器材?.教学场地
  );
}

function isLessonPlanV2(value: unknown): value is LessonPlanV2 {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<LessonPlanV2>;
  return Boolean(
    plan.课题名称 &&
      plan.教学目标 &&
      plan.教学重难点 &&
      plan.场地与器材 &&
      plan.教学过程 &&
      plan.预计运动负荷 &&
      Array.isArray(plan.安全措施)
  );
}

function getSeedPlans(): LessonPlanV2[] {
  if (!Array.isArray(seedData)) return [];
  return standardizeLessonPlansProcess(seedData.filter(isLessonPlanV2) as LessonPlanV2[]);
}

async function getCurrentUsername(): Promise<string | null> {
  const session = await window.desktopSession?.get();
  const username = session?.currentUser?.trim();
  return username || null;
}

async function readStoredPlans(username: string): Promise<LessonPlanV2[] | null> {
  const parsed = await readDesktopUserStore<unknown>(username, STORAGE_KEY, null);
  if (!Array.isArray(parsed)) return null;
  return standardizeLessonPlansProcess(parsed.filter(isLessonPlanV2));
}

async function writeStoredPlans(username: string, plans: LessonPlanV2[]) {
  plansCache = { username, plans };
  await writeDesktopUserStore(username, STORAGE_KEY, plans);
}

export async function initializeSeedDataV2() {
  const username = await getCurrentUsername();
  if (!username) return;

  const stored = await readStoredPlans(username);
  if (stored && stored.length > 0) return;
  await writeStoredPlans(username, getSeedPlans());
}

export async function getAllLessonPlansV2(): Promise<LessonPlanV2[]> {
  const username = await getCurrentUsername();
  if (!username) return [];

  if (plansCache?.username === username) return plansCache.plans;
  const stored = await readStoredPlans(username);
  if (stored) {
    plansCache = { username, plans: stored };
    return stored;
  }
  const seeds = getSeedPlans();
  await writeStoredPlans(username, seeds);
  return seeds;
}

export async function addLessonPlanV2(plan: LessonPlanV2) {
  const username = await getCurrentUsername();
  if (!username) {
    throw new Error('请先登录账号，再生成并保存教案。');
  }

  if (!isLessonPlanV2(plan)) {
    throw new Error('教案数据结构不完整，无法保存到 V2 教案库。');
  }
  const standardizedPlan = standardizeLessonPlanProcess(plan);
  const plans = await getAllLessonPlansV2();
  await writeStoredPlans(username, [standardizedPlan, ...plans]);
  return standardizedPlan;
}

/* ─── 教案收藏 ─── */

export async function getFavorites(): Promise<LessonPlanV2[]> {
  const username = await getCurrentUsername();
  if (!username) return [];

  if (favoritesCache?.username === username) return favoritesCache.favorites;
  const parsed = await readDesktopUserStore<unknown>(username, FAVORITES_KEY, []);
  favoritesCache = Array.isArray(parsed)
    ? { username, favorites: standardizeLessonPlansProcess(parsed.filter(isLessonPlanV2)) }
    : { username, favorites: [] };
  return favoritesCache.favorites;
}

export async function addFavorite(plan: LessonPlanV2) {
  const username = await getCurrentUsername();
  if (!username) return;

  if (!isLessonPlanV2(plan)) return;
  const standardizedPlan = standardizeLessonPlanProcess(plan);
  const favorites = await getFavorites();
  const exists = favorites.some((f) => matchesLessonPlan(f, standardizedPlan));
  if (exists) return;
  const nextFavorites = [standardizedPlan, ...favorites];
  favoritesCache = { username, favorites: nextFavorites };
  await writeDesktopUserStore(username, FAVORITES_KEY, nextFavorites);
}

export async function removeFavorite(plan: LessonPlanV2) {
  const username = await getCurrentUsername();
  if (!username) return;

  const favorites = await getFavorites();
  const filtered = favorites.filter((f) => !matchesLessonPlan(f, plan));
  favoritesCache = { username, favorites: filtered };
  await writeDesktopUserStore(username, FAVORITES_KEY, filtered);
}

export async function deleteLessonPlanV2(plan: LessonPlanV2): Promise<void> {
  const username = await getCurrentUsername();
  if (!username) return;

  const plans = await getAllLessonPlansV2();
  const filtered = plans.filter((p) => !matchesLessonPlan(p, plan));
  await writeStoredPlans(username, filtered);
  await removeFavorite(plan);
}

export async function isFavorite(plan: LessonPlanV2): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((f) => matchesLessonPlan(f, plan));
}
