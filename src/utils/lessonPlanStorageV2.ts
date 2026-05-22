import seedData from '../date/lesson_plans_seed_v2.json';
import { readDesktopStore, writeDesktopStore } from '../lib/desktopStorage';
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
let plansCache: LessonPlanV2[] | null = null;
let favoritesCache: LessonPlanV2[] | null = null;

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

async function readStoredPlans(): Promise<LessonPlanV2[] | null> {
  const parsed = await readDesktopStore<unknown>(STORAGE_KEY, null);
  if (!Array.isArray(parsed)) return null;
  return standardizeLessonPlansProcess(parsed.filter(isLessonPlanV2));
}

async function writeStoredPlans(plans: LessonPlanV2[]) {
  plansCache = plans;
  await writeDesktopStore(STORAGE_KEY, plans);
}

export async function initializeSeedDataV2() {
  const stored = await readStoredPlans();
  if (stored && stored.length > 0) return;
  await writeStoredPlans(getSeedPlans());
}

export async function getAllLessonPlansV2(): Promise<LessonPlanV2[]> {
  if (plansCache) return plansCache;
  const stored = await readStoredPlans();
  if (stored) {
    plansCache = stored;
    return stored;
  }
  const seeds = getSeedPlans();
  await writeStoredPlans(seeds);
  return seeds;
}

export async function addLessonPlanV2(plan: LessonPlanV2) {
  if (!isLessonPlanV2(plan)) {
    throw new Error('教案数据结构不完整，无法保存到 V2 教案库。');
  }
  const standardizedPlan = standardizeLessonPlanProcess(plan);
  const plans = await getAllLessonPlansV2();
  await writeStoredPlans([standardizedPlan, ...plans]);
  return standardizedPlan;
}

/* ─── 教案收藏 ─── */

export async function getFavorites(): Promise<LessonPlanV2[]> {
  if (favoritesCache) return favoritesCache;
  const parsed = await readDesktopStore<unknown>(FAVORITES_KEY, []);
  favoritesCache = Array.isArray(parsed)
    ? standardizeLessonPlansProcess(parsed.filter(isLessonPlanV2))
    : [];
  return favoritesCache;
}

export async function addFavorite(plan: LessonPlanV2) {
  if (!isLessonPlanV2(plan)) return;
  const standardizedPlan = standardizeLessonPlanProcess(plan);
  const favorites = await getFavorites();
  const exists = favorites.some((f) => matchesLessonPlan(f, standardizedPlan));
  if (exists) return;
  favoritesCache = [standardizedPlan, ...favorites];
  await writeDesktopStore(FAVORITES_KEY, favoritesCache);
}

export async function removeFavorite(plan: LessonPlanV2) {
  const favorites = await getFavorites();
  const filtered = favorites.filter((f) => !matchesLessonPlan(f, plan));
  favoritesCache = filtered;
  await writeDesktopStore(FAVORITES_KEY, filtered);
}

export async function deleteLessonPlanV2(plan: LessonPlanV2): Promise<void> {
  const plans = await getAllLessonPlansV2();
  const filtered = plans.filter((p) => !matchesLessonPlan(p, plan));
  await writeStoredPlans(filtered);
  await removeFavorite(plan);
}

export async function isFavorite(plan: LessonPlanV2): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((f) => matchesLessonPlan(f, plan));
}
