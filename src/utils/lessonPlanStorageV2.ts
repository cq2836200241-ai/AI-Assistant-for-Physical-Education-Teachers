import seedData from '../date/lesson_plans_seed_v2.json';

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

const STORAGE_KEY = 'lesson_plans_v2';
const FAVORITES_KEY = 'lesson_plans_v2_favorites';

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
  return Array.isArray(seedData) ? (seedData.filter(isLessonPlanV2) as LessonPlanV2[]) : [];
}

function readStoredPlans(): LessonPlanV2[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isLessonPlanV2);
  } catch (error) {
    console.warn('V2 教案库读取失败，将重新初始化。', error);
    return null;
  }
}

function writeStoredPlans(plans: LessonPlanV2[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function initializeSeedDataV2() {
  const stored = readStoredPlans();
  if (stored && stored.length > 0) return;
  writeStoredPlans(getSeedPlans());
}

export function getAllLessonPlansV2(): LessonPlanV2[] {
  const stored = readStoredPlans();
  if (stored) return stored;
  const seeds = getSeedPlans();
  writeStoredPlans(seeds);
  return seeds;
}

export function addLessonPlanV2(plan: LessonPlanV2) {
  if (!isLessonPlanV2(plan)) {
    throw new Error('教案数据结构不完整，无法保存到 V2 教案库。');
  }
  const plans = getAllLessonPlansV2();
  writeStoredPlans([plan, ...plans]);
}

/* ─── 教案收藏 ─── */

export function getFavorites(): LessonPlanV2[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLessonPlanV2);
  } catch {
    return [];
  }
}

export function addFavorite(plan: LessonPlanV2) {
  if (!isLessonPlanV2(plan)) return;
  const favorites = getFavorites();
  // 避免重复收藏（按课题名称 + 教学场地去重）
  const exists = favorites.some(
    (f) => f.课题名称 === plan.课题名称 && f.场地与器材?.教学场地 === plan.场地与器材?.教学场地
  );
  if (exists) return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([plan, ...favorites]));
}

export function removeFavorite(plan: LessonPlanV2) {
  const favorites = getFavorites();
  const filtered = favorites.filter(
    (f) => !(f.课题名称 === plan.课题名称 && f.场地与器材?.教学场地 === plan.场地与器材?.教学场地)
  );
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

export function isFavorite(plan: LessonPlanV2): boolean {
  const favorites = getFavorites();
  return favorites.some(
    (f) => f.课题名称 === plan.课题名称 && f.场地与器材?.教学场地 === plan.场地与器材?.教学场地
  );
}
