import type { LessonPlanV2 } from './lessonPlanStorageV2';

type ProcessStep = LessonPlanV2['教学过程'][string][string];

const FALLBACK_STEP: ProcessStep = {
  教学内容: '围绕本课核心技能开展小组练习，教师根据学生水平调整难度。',
  教师活动: '讲解规则，组织分组轮换，巡视观察并及时提示动作要点。',
  学生活动: '按小组参与练习，遵守规则，互相提醒并完成自评互评。',
  安全与提示: '保持安全间距，听从统一口令，避免追逐碰撞。',
};

function cloneStep(step?: Partial<ProcessStep>): ProcessStep {
  return {
    教学内容: step?.教学内容 || FALLBACK_STEP.教学内容,
    教师活动: step?.教师活动 || FALLBACK_STEP.教师活动,
    学生活动: step?.学生活动 || FALLBACK_STEP.学生活动,
    安全与提示: step?.安全与提示 || FALLBACK_STEP.安全与提示,
  };
}

function findStepByKeyword(
  basicPart: Record<string, ProcessStep>,
  keywords: string[],
): ProcessStep | undefined {
  const entry = Object.entries(basicPart).find(([key]) =>
    keywords.some((keyword) => key.includes(keyword)),
  );

  return entry?.[1];
}

function createMatchStep(topic: string, source?: ProcessStep): ProcessStep {
  if (source) {
    return cloneStep(source);
  }

  return {
    教学内容: `围绕${topic}设置小组积分赛，学生按规则完成技能展示并累计得分。`,
    教师活动: '讲清比赛规则和评价标准，担任裁判，提醒学生控制速度与动作质量。',
    学生活动: '分组参赛，按顺序完成挑战，为同伴加油并记录小组成绩。',
    安全与提示: '比赛中保持队伍间距，等待区站在侧后方，禁止抢跑和推挤。',
  };
}

function createGameStep(topic: string, source?: ProcessStep): ProcessStep {
  if (source) {
    return cloneStep(source);
  }

  return {
    教学内容: `设计与${topic}相关的趣味闯关游戏，学生在游戏中反复运用本课技能。`,
    教师活动: '说明游戏方法，控制节奏，观察学生技能运用情况并及时鼓励。',
    学生活动: '积极参与游戏，在完成任务中巩固动作要领并体验合作乐趣。',
    安全与提示: '游戏路线单向进行，转弯和交接处减速，避免迎面相撞。',
  };
}

export function standardizeLessonPlanProcess(plan: LessonPlanV2): LessonPlanV2 {
  const process = plan.教学过程;
  const basicPart = process?.基本部分;
  if (!basicPart || typeof basicPart !== 'object') {
    return plan;
  }

  const topic = plan.课题名称 || '本课技能';
  const skillStep = findStepByKeyword(basicPart, ['技能学习']) ?? Object.values(basicPart)[0];
  const matchStep = findStepByKeyword(basicPart, ['比赛', '挑战赛', '达标赛', '积分赛']);
  const gameStep = findStepByKeyword(basicPart, ['游戏', '闯关']);

  return {
    ...plan,
    教学过程: {
      ...process,
      基本部分: {
        [`3.1 技能学习：${topic}`]: cloneStep(skillStep),
        '3.2 比赛练习：小组挑战赛': createMatchStep(topic, matchStep),
        '3.3 趣味游戏：技能闯关': createGameStep(topic, gameStep),
      },
    },
  };
}

export function standardizeLessonPlansProcess(plans: LessonPlanV2[]): LessonPlanV2[] {
  return plans.map(standardizeLessonPlanProcess);
}
