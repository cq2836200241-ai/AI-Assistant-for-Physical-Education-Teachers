import type { LessonPlanV2 } from './lessonPlanStorageV2';

export interface LessonPlanMarkdownOptions {
  includeEquipment?: boolean;
  includeTeacherActivity?: boolean;
  includeReflection?: boolean;
}

const CHINESE_SECTION_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

type ProcessStep = LessonPlanV2['教学过程'][string][string];

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStepValue(step: ProcessStep | undefined, key: keyof ProcessStep): string {
  return text(step?.[key]);
}

function compareNumberedKeys([a]: [string, unknown], [b]: [string, unknown]) {
  const aMatch = a.match(/^(\d+)(?:\.(\d+))?/);
  const bMatch = b.match(/^(\d+)(?:\.(\d+))?/);
  const aMajor = Number(aMatch?.[1] ?? Number.MAX_SAFE_INTEGER);
  const bMajor = Number(bMatch?.[1] ?? Number.MAX_SAFE_INTEGER);
  const aMinor = Number(aMatch?.[2] ?? 0);
  const bMinor = Number(bMatch?.[2] ?? 0);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return a.localeCompare(b, 'zh-CN');
}

function getOrderedSteps(phase: Record<string, ProcessStep> | undefined) {
  if (!phase || typeof phase !== 'object') return [];
  return Object.entries(phase).sort(compareNumberedKeys) as [string, ProcessStep][];
}

function addLabeledLine(lines: string[], label: string, value: string) {
  lines.push(`- **${label}**：${value || '待补充'}`);
}

function addProcessStep(
  lines: string[],
  stepTitle: string,
  step: ProcessStep,
  options: LessonPlanMarkdownOptions,
) {
  lines.push(`#### ${stepTitle}`);
  addLabeledLine(lines, '教学内容', readStepValue(step, '教学内容'));
  if (options.includeTeacherActivity !== false) {
    addLabeledLine(lines, '教师活动', readStepValue(step, '教师活动'));
  }
  addLabeledLine(lines, '学生活动', readStepValue(step, '学生活动'));
  addLabeledLine(lines, '安全与提示', readStepValue(step, '安全与提示'));
  lines.push('');
}

function normalizeJsonText(value: string): string {
  return value
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
}

function parseJsonCandidate(value: string): unknown | null {
  const normalized = normalizeJsonText(value);
  try {
    return JSON.parse(normalized) as unknown;
  } catch {
    return null;
  }
}

function extractBalancedJson(text: string): string | null {
  const start = text.search(/[\[{]/);
  if (start < 0) return null;

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function getFirstObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.find((item) => item && typeof item === 'object') ?? null;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function getString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function getProcessStep(value: unknown): ProcessStep {
  const step = getRecord(value);
  return {
    教学内容: getString(step.教学内容, '围绕本课主题开展分组练习，明确动作要求和完成标准。'),
    教师活动: getString(step.教师活动, '讲解示范动作方法，组织分组轮换，巡视纠错并提醒安全。'),
    学生活动: getString(step.学生活动, '按要求参与练习，观察同伴动作，完成自评互评和合作交流。'),
    安全与提示: getString(step.安全与提示, '保持安全间距，听从教师口令，避免追逐碰撞和抢练。'),
  };
}

function getFirstStep(phase: unknown): unknown {
  const record = getRecord(phase);
  return Object.values(record).find((value) => isRecord(value)) ?? null;
}

function normalizeLessonPlan(value: unknown): LessonPlanV2 | null {
  const firstObject = getFirstObject(value);
  if (!isRecord(firstObject)) return null;
  const source = firstObject;

  const goals = getRecord(source.教学目标);
  const keyPoints = getRecord(source.教学重难点);
  const venue = getRecord(source.场地与器材);
  const process = getRecord(source.教学过程);
  const startPart = getRecord(process.开始部分);
  const warmupPart = getRecord(process.准备部分);
  const basicPart = getRecord(process.基本部分);
  const endPart = getRecord(process.结束部分);
  const load = getRecord(source.预计运动负荷);
  const safety = Array.isArray(source.安全措施)
    ? source.安全措施.map((item) => getString(item)).filter(Boolean)
    : [];
  const topic = getString(source.课题名称, '体育课题');

  return {
    课题名称: topic,
    教学目标: {
      运动能力: getString(goals.运动能力, `通过${topic}学习，提高动作控制和身体协调能力。`),
      健康行为: getString(goals.健康行为, '能主动热身并遵守课堂安全要求，形成良好运动习惯。'),
      体育品德: getString(goals.体育品德, '在合作练习中遵守规则，积极鼓励同伴并参与互评。'),
    },
    教学重难点: {
      教学重点: getString(keyPoints.教学重点, `${topic}的核心动作方法和练习要求。`),
      教学难点: getString(keyPoints.教学难点, '动作衔接稳定，练习中保持节奏和安全距离。'),
    },
    场地与器材: {
      教学场地: getString(venue.教学场地, '学校操场或体育活动区域。'),
      教具器材: getString(venue.教具器材, '标志盘、口哨及本课所需器材。'),
    },
    教学过程: {
      开始部分: {
        '1.1 课堂常规': getProcessStep(startPart['1.1 课堂常规'] ?? getFirstStep(startPart)),
      },
      准备部分: {
        '2.1 专项热身': getProcessStep(warmupPart['2.1 专项热身'] ?? getFirstStep(warmupPart)),
      },
      基本部分: {
        [`3.1 技能学习：${topic}`]: getProcessStep(
          Object.entries(basicPart).find(([key]) => key.includes('3.1') || key.includes('技能'))?.[1] ??
            getFirstStep(basicPart),
        ),
        '3.2 比赛练习：小组挑战赛': getProcessStep(
          Object.entries(basicPart).find(([key]) => key.includes('3.2') || key.includes('比赛') || key.includes('挑战'))?.[1],
        ),
        '3.3 趣味游戏：技能闯关': getProcessStep(
          Object.entries(basicPart).find(([key]) => key.includes('3.3') || key.includes('游戏') || key.includes('闯关'))?.[1],
        ),
      },
      结束部分: {
        '4.1 放松与小结': getProcessStep(endPart['4.1 放松与小结'] ?? getFirstStep(endPart)),
      },
    },
    预计运动负荷: {
      平均心率: getString(load.平均心率, '约120-135次/分钟'),
      练习密度: getString(load.练习密度, '约35%-45%'),
    },
    安全措施:
      safety.length > 0
        ? safety
        : [
            '练习前检查场地和器材，清理周边障碍物。',
            '练习中保持安全间距，听从统一口令有序轮换。',
            '发现身体不适或动作风险时及时停止练习并报告教师。',
          ],
    课后反思: getString(
      source.课后反思,
      '课后可结合学生动作掌握、参与积极性和安全执行情况继续调整练习设计。',
    ),
  };
}

export function extractLessonPlanJson(raw: string): LessonPlanV2 | null {
  const trimmed = raw.trim();

  const parse = (value: string) => {
    try {
      return normalizeLessonPlan(parseJsonCandidate(value));
    } catch {
      return null;
    }
  };

  let parsed = parse(trimmed);

  if (!parsed) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) parsed = parse(fenced[1].trim());
  }

  if (!parsed) {
    const balancedJson = extractBalancedJson(normalizeJsonText(trimmed));
    if (balancedJson) parsed = parse(balancedJson);
  }

  return parsed;
}

export function renderLessonPlanToMarkdown(
  plan: LessonPlanV2,
  options: LessonPlanMarkdownOptions = {},
): string {
  const lines: string[] = [];
  let sectionIndex = 0;

  const nextSectionTitle = (title: string) => {
    const sectionNumber = CHINESE_SECTION_NUMBERS[sectionIndex] || String(sectionIndex + 1);
    sectionIndex += 1;
    return `## ${sectionNumber}、${title}`;
  };

  lines.push(nextSectionTitle('课题名称'));
  lines.push(text(plan.课题名称) || '未命名课题', '');

  lines.push(nextSectionTitle('教学目标'));
  addLabeledLine(lines, '运动能力', text(plan.教学目标?.运动能力));
  addLabeledLine(lines, '健康行为', text(plan.教学目标?.健康行为));
  addLabeledLine(lines, '体育品德', text(plan.教学目标?.体育品德));
  lines.push('');

  lines.push(nextSectionTitle('教学重难点'));
  addLabeledLine(lines, '教学重点', text(plan.教学重难点?.教学重点));
  addLabeledLine(lines, '教学难点', text(plan.教学重难点?.教学难点));
  lines.push('');

  if (options.includeEquipment !== false) {
    lines.push(nextSectionTitle('场地与器材'));
    addLabeledLine(lines, '教学场地', text(plan.场地与器材?.教学场地));
    addLabeledLine(lines, '教具器材', text(plan.场地与器材?.教具器材));
    lines.push('');
  }

  lines.push(nextSectionTitle('教学过程'));
  lines.push('');

  const phases = [
    { key: '开始部分', title: '1. 开始部分' },
    { key: '准备部分', title: '2. 准备部分' },
    { key: '基本部分', title: '3. 基本部分' },
    { key: '结束部分', title: '4. 结束部分' },
  ] as const;

  phases.forEach((phase) => {
    const steps = getOrderedSteps(plan.教学过程?.[phase.key]);
    if (steps.length === 0) return;

    lines.push(`### ${phase.title}`);
    steps.forEach(([stepTitle, step]) => {
      addProcessStep(lines, stepTitle, step, options);
    });
  });

  lines.push(nextSectionTitle('预计运动负荷'));
  addLabeledLine(lines, '平均心率', text(plan.预计运动负荷?.平均心率));
  addLabeledLine(lines, '练习密度', text(plan.预计运动负荷?.练习密度));
  lines.push('');

  lines.push(nextSectionTitle('安全措施'));
  const safetyItems = Array.isArray(plan.安全措施) ? plan.安全措施.filter(Boolean) : [];
  if (safetyItems.length > 0) {
    safetyItems.forEach((item) => {
      lines.push(`- ${text(item) || '待补充'}`);
    });
  } else {
    lines.push('- 待补充');
  }
  lines.push('');

  if (options.includeReflection !== false) {
    lines.push(nextSectionTitle('课后反思'));
    lines.push(text(plan.课后反思) || '本节课结束后，可结合学生掌握情况与课堂安全表现继续完善。');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
