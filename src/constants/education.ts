/** 学段阶段配置 */
export const EDUCATION_LEVELS = [
  { id: 'primary', label: '小学', grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
  { id: 'junior', label: '初中', grades: ['七年级', '八年级', '九年级'] },
  { id: 'senior', label: '高中', grades: ['高一', '高二', '高三'] },
  { id: 'college', label: '大学', grades: ['大一', '大二', '大三', '大四'] },
] as const;

export type EducationLevelId = (typeof EDUCATION_LEVELS)[number]['id'];

/** 获取指定学段的年级列表（完整名称） */
export function getGradesByLevel(levelId: string): string[] {
  const level = EDUCATION_LEVELS.find(l => l.id === levelId);
  return level ? [...level.grades] : EDUCATION_LEVELS[0].grades.slice();
}

/** 年级完整名称 → 简称映射（用于课表显示） */
export const GRADE_SHORT: Record<string, string> = {
  '一年级': '一', '二年级': '二', '三年级': '三', '四年级': '四', '五年级': '五', '六年级': '六',
  '七年级': '七', '八年级': '八', '九年级': '九',
  '高一': '高一', '高二': '高二', '高三': '高三',
  '大一': '大一', '大二': '大二', '大三': '大三', '大四': '大四',
};

/** 默认每个年级的班级数 */
export const DEFAULT_CLASS_COUNT = 6;

/** 生成默认的年级班级数字典 */
export function getDefaultClassCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const level of EDUCATION_LEVELS) {
    for (const grade of level.grades) {
      counts[grade] = DEFAULT_CLASS_COUNT;
    }
  }
  return counts;
}

/** 根据学段获取对应提示词中的教研员角色描述 */
export function getEducatorRole(levelId: string): string {
  switch (levelId) {
    case 'primary':
      return '你是一位顶尖的小学体育教研员，精通《国家学生体质健康标准》和现行体育课程设置要求。';
    case 'junior':
      return '你是一位顶尖的初中体育教研员，熟悉《义务教育体育与健康课程标准》及中考体育测试要求。';
    case 'senior':
      return '你是一位经验丰富的高中体育教师，精通高中体育与健康课程标准和学业水平测试要求。';
    case 'college':
      return '你是一位大学体育教师，熟悉大学生体质健康测试标准和公共体育课程教学要求。';
    default:
      return '你是一位顶尖的体育教研员，精通体育课程设置要求。';
  }
}

/** 根据学段获取教学负荷适配描述 */
export function getLoadAdaptation(levelId: string): string {
  switch (levelId) {
    case 'primary':
      return '负荷适配：根据年级特性调整运动量。低年级（1-2）侧重情境化趣味性，中年级（3-4）侧重基本技能，高年级（5-6）侧重专项技能和实战对抗。';
    case 'junior':
      return '负荷适配：初中阶段侧重基本运动技能与专项运动技能的衔接，适当增加体能训练强度，为中考体育做准备。七、八年级注重基础，九年级可适当增加实战与考核内容。';
    case 'senior':
      return '负荷适配：高中阶段注重专项运动技能的深化与自主锻炼能力的培养，运动负荷应达到中等以上强度，体现模块化教学特点。';
    case 'college':
      return '负荷适配：大学阶段注重终身体育意识的培养，运动负荷适中，兼顾趣味性与健身效果，体现自主选择与个性化发展。';
    default:
      return '';
  }
}
