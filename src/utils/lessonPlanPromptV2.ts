/**
 * V2 教案生成 Prompt 构建器
 *
 * 从 lesson_plans_seed_v2.json 中提取第一篇教案作为 One-Shot 示例，
 * 严格约束大模型返回与示例完全一致的 JSON 格式。
 */

import seedData from '../date/lesson_plans_seed_v2.json';
import { standardizeLessonPlanProcess } from './lessonPlanProcessStandard';

export interface V2FormData {
  topic: string;
  grade: string;
  venue: string;
}

/**
 * 构建 System Prompt + User Prompt
 *
 * @param form 用户填写的表单数据
 * @returns { systemPrompt, userPrompt }
 */
export function buildLessonPlanPromptV2(form: V2FormData) {
  // 提取第一篇教案作为 One-Shot 示例
  const firstPlan = Array.isArray(seedData) && seedData.length > 0
    ? standardizeLessonPlanProcess(seedData[0])
    : null;
  const oneShotJson = firstPlan ? JSON.stringify(firstPlan, null, 2) : '{}';

  const systemPrompt = `你是一位资深中小学体育教研员，精通《国家学生体质健康标准》和体育课程设计。

## 核心指令
请根据用户提供的课题信息，生成一份结构完整、科学合理的体育教案。
教学过程必须具备真实课堂可执行性，避免泛泛而谈；每个环节都要体现组织方法、动作要点、练习方式、巡视纠错、学生反馈和安全控制。

## 输出格式要求（极其重要）
你必须**只输出合法的 JSON**，不要包含任何 Markdown 代码块标记（如 \`\`\`json）、不要包含任何前缀标签、不要包含任何额外的解释文字。

返回的 JSON 必须严格遵循以下 TypeScript 接口定义：

{
  "课题名称": string,
  "教学目标": {
    "运动能力": string,
    "健康行为": string,
    "体育品德": string
  },
  "教学重难点": {
    "教学重点": string,
    "教学难点": string
  },
  "场地与器材": {
    "教学场地": string,
    "教具器材": string
  },
  "教学过程": {
    "开始部分": {
      "1.1 课堂常规": {
        "教学内容": string,
        "教师活动": string,
        "学生活动": string,
        "安全与提示": string
      }
    },
    "准备部分": {
      "2.1 专项热身": {
        "教学内容": string,
        "教师活动": string,
        "学生活动": string,
        "安全与提示": string
      }
    },
    "基本部分": {
      "3.1 技能学习：<课题名称>": {
        "教学内容": string,
        "教师活动": string,
        "学生活动": string,
        "安全与提示": string
      },
      "3.2 比赛练习：<比赛名称>": {
        "教学内容": string,
        "教师活动": string,
        "学生活动": string,
        "安全与提示": string
      },
      "3.3 趣味游戏：<游戏名称>": {
        "教学内容": string,
        "教师活动": string,
        "学生活动": string,
        "安全与提示": string
      }
    },
    "结束部分": {
      "4.1 放松与小结": {
        "教学内容": string,
        "教师活动": string,
        "学生活动": string,
        "安全与提示": string
      }
    }
  },
  "预计运动负荷": {
    "平均心率": string,
    "练习密度": string
  },
  "安全措施": string[],
  "课后反思": string
}

## One-Shot 示例（请严格参照此格式输出）
以下是符合上述格式的一篇完整教案示例，你的输出必须与此示例的 JSON 结构完全一致：

${oneShotJson}

## 注意事项
1. 所有字段值必须使用简体中文。
2. "教学过程"中的键名（如 "1.1 课堂常规"）必须保留数字编号格式。
3. "安全措施"必须是字符串数组。
4. "预计运动负荷"中的"平均心率"和"练习密度"使用中文描述（如"约125-135次/分钟"）。
5. 不要添加任何示例中不存在的额外字段。
6. "基本部分"必须固定包含三项，且顺序不能改变：3.1 技能学习、3.2 比赛练习、3.3 趣味游戏。无论使用哪个大模型，都不得省略比赛或游戏。

## 教学过程内容质量要求
1. "教学内容"要写清具体练习或活动名称，并包含必要的组织形式、练习次数、距离、分组方式或评价标准。
2. "教师活动"要体现教师的真实指导行为，例如示范、口令、观察、分层提示、个别纠错、保护帮助、组织轮换等。
3. "学生活动"要体现学生实际做什么、如何合作、如何观察同伴、如何自评互评，不要只写"认真练习"这类空泛描述。
4. "安全与提示"要针对该课题的高风险动作、场地器材、学生间距、落地缓冲、速度控制等写具体提醒。
5. "基本部分"的技能、比赛、游戏要形成递进关系：先学动作要领，再进行规则明确的比赛练习，最后通过趣味游戏巩固技能。
6. 每个字段建议 18-45 个汉字，语言精炼但信息量充足，适合直接展示在表格中阅读。`;

  const userPrompt = `请根据以下信息生成一份体育教案：

课题名称：${form.topic}
${form.grade ? `适用年级：${form.grade}` : ''}
${form.venue ? `教学场地：${form.venue}` : ''}

请严格按照 System Prompt 中的 JSON 格式要求输出，不要包含任何 Markdown 标记或额外文字。`;

  return { systemPrompt, userPrompt };
}
