import { FormState } from '../store/appStore';
import { getEducatorRole, getLoadAdaptation } from '../constants/education';

export const buildPrompt = (form: FormState, isRegeneration: boolean = false, educationLevel: string = 'primary') => {
  const isCustomEnabled = form.customDetailsEnabled;
  
  // Only use custom values if the master switch is ON, otherwise use defaults
  const includeEquipment = isCustomEnabled ? form.includeEquipment : true;
  const includeTeacherActivity = isCustomEnabled ? form.includeTeacherActivity : true;
  const includeReflection = isCustomEnabled ? form.includeReflection : true;
  const customReflection = isCustomEnabled ? form.reflection : '';
  const customClassPeriod = isCustomEnabled ? form.classPeriod : '';
  const customVenue = isCustomEnabled ? form.venue : '';
  const effectiveWeather = isCustomEnabled ? form.weather : '晴天';

  const educatorRole = getEducatorRole(educationLevel);
  const loadAdaptation = getLoadAdaptation(educationLevel);

  const levelLabels: Record<string, string> = {
    primary: '小学',
    junior: '初中',
    senior: '高中',
    college: '大学',
  };
  const levelLabel = levelLabels[educationLevel] || '小学';

  const chineseNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  let sectionIndex = 1;
  const getNextSection = () => chineseNums[sectionIndex++ - 1] || sectionIndex.toString();

  const systemPrompt = `你是一位顶尖的${levelLabel}体育教研员，精通《国家学生体质健康标准》和现行体育课程设置要求。
请你根据我提供的条件，生成一份结构严谨、科学合理、可落地实施的【${levelLabel}体育教案】。
${isRegeneration ? '\n### ⚠️ 重新生成要求 (特别说明)\n这是一个重新生成的请求。请在保持教学目标一致的前提下，尝试使用**不同的热身游戏、不同的技能练习手段或不同的比赛形式**。内容必须与之前的设计有所区别，增加新鲜感和创意，提供多种教学思路。' : ''}

### 核心设计规范与排版要求（必须严格遵守）
1. 全程严格使用简体中文输出，绝对不要包含任何英文词汇、英语语句或英文字符（除了必要的标点符号或阿拉伯数字）。
2. ${loadAdaptation}
3. 能力适配：基础班需降低难度，分解动作；普通班正常推进；提高班需加强难度及体能挑战。
4. 环节完整：必须包含完整的【开始部分 - 准备部分 - 基本部分 - 结束部分】。**不要在这些部分的标题或子标题后面添加具体的时间规划（例如：取消像"(10分钟)"这样的时间标注）**。
5. 取消队形示意图：不需要设计或绘制任何队形站位示意图图表。${!includeTeacherActivity ? '\n6. 取消教师活动：根据用户定制要求，教学过程中**绝对不能**包含"教师活动"的相关描述。' : ''}
7. **排版格式限制**：教学过程**绝不使用表格排版**。并且所有生成的标题级别需要严格遵循以下规定：
   - **一级标题**：使用 Markdown 二级标题（##），且使用汉字形式的编号。例如：\`## 一、教学过程\`。
   - **二级标题**：使用 Markdown 三级标题（###），且使用纯数字编号。例如：\`### 1. 开始部分\`、\`### 2. 准备部分\`等。
   - **三级标题**：使用 Markdown 四级标题（####），采用点分数字编号。例如：\`#### 1.1 课堂常规\`、\`#### 3.2 专项练习\`等。
   - **四级标题及更细分的层级**：绝对**不允许使用任何 Markdown 的标题语法（不允许出现 # 号）**，直接换行、用加粗文字表示小标题。
   - **独立成行**：在"教学过程"的任何环节中，**"教学内容"、"教师活动"（如有）、"学生活动"、"安全与提示"必须各占一行，且加粗显示。** 不要把它们和具体描述写在同一行。

### 教案固定结构：
## 一、课题名称
(填写具体的课题名称)
## 二、教学目标
(从运动能力、健康行为、体育品德三个维度撰写)
## 三、教学重难点
- **教学重点**：(本节课最核心的环节或学习点)
- **教学难点**：(学生可能遇到并需要克服的难处)
${includeEquipment ? `\n## ${getNextSection()}、场地与器材\n- **教学场地**：(根据要求填写的场地)\n- **教具器材**：(列出所需的器材详情)\n` : ''}
## ${getNextSection()}、教学过程
(按照规范，教学过程不能使用表格，必须使用明确的各级小标题排版：)

### 1. 开始部分
#### 1.1 环节名称（如：课堂常规）
- **教学内容**：(文本描述)
${includeTeacherActivity ? '- **教师活动**：(文本描述)\n' : ''}- **学生活动**：(文本描述)
- **安全与提示**：(文本描述)

### 2. 准备部分
#### 2.1 环节名称（如：热身跑）
(按上方格式填写)

### 3. 基本部分
#### 3.1 环节名称
(按上方格式填写)

### 4. 结束部分
#### 4.1 环节名称（如：放松运动）
(按上方格式填写)

## ${getNextSection()}、预计运动负荷
(预估平均心率、练习密度等核心负荷指标)

## ${getNextSection()}、安全措施
(列举具体的保护与防止受伤的指导和安排)
${includeReflection ? `\n## ${getNextSection()}、课后反思\n(如有具体预设反思或教学期望，请根据要求撰写；如无，则预留反思框架空间)` : ''}`;

  let userPrompt = `请为以下设定生成一份详细教案：
- 适用年级：${form.grades.join('、') || '未指定'}
- 学生能力水平：${form.ability || '普通班'}
- 课题名称：${form.courseName || '未指定课题'}
- 课时要求：${form.duration}
- 天气情况（上课场景）：${effectiveWeather === '雨天' ? '雨天（必须设计为室内体育课）' : effectiveWeather === '高温' ? '高温天气（必须严格注意防暑降温）' : '晴天/完美天气'}
- 班级人数：${form.studentCount}人
- 课型选择：${form.courseType || '新授课'}
- 教学场地：${customVenue || '根据教学内容合理安排'}
${includeEquipment ? `- 教具与器材：${form.equipments.join('、') || '由系统根据课程推荐'}` : '- 教具与器材：由系统随机安排（并在教案中隐藏此部分）'}
${effectiveWeather === '雨天' ? '- ⚠️ **特殊约束要求 (极端重要)**：用户选择了**雨天**，本节课**必须按照室内课教案生成**！生成的教案必须在"场地与器材"中标明为"教室"或"室内场地"。教学过程中的热身、技能练习和游戏必须符合室内狭小空间（有桌椅等障碍物）的限制要求，绝对不能出现室外大幅跑跳（如绕操场跑步等）。如果该运动项目无法在室内开展（如标枪等），必须转化为相关的室内辅助练习、原地的徒手模仿练习、或理论与室内安全实践课！安全防范措施重点必须围绕室内安全和课桌椅防撞写！' : ''}
${effectiveWeather === '高温' ? `- ⚠️ **特殊约束要求 (极端重要)**：当前上课天气为**高温**。教案生成时必须充分考虑防暑降温：
    1. **降低劳动强度**：适当减少高强度对抗环节的时间，降低总运动负荷，避免学生中暑。
    2. **增加补水环节**：在"教学过程"中，必须在"准备部分"和"基本部分"之间，以及"基本部分"的中途，强制显式安排**"组织学生有序补水"**的环节内容。
    3. **选择荫凉场地**：如果可能，建议在教案中提示尽量选择在荫凉处（如树荫下、廊桥下或体育馆侧翼）进行讲解和简单练习。
    4. **安全预警**：在"安全措施"部分，必须增加针对"热射病"、"脱水"和"晒伤"的预防指导。` : ''}
- 教学重点：${form.teachingFocus || '无'}
- 特别要求：
  ${form.hasSkillTraining ? '- 必须包含专门的技能训练环节。' : '- 弱化专项技能训练。'}
  ${form.hasMatch ? '- 必须在主体部分包含对抗性比赛环节。' : '- 不安排比赛环节。'}
  ${form.hasFitness ? '- 必须在主体部分包含特定体能素质练习（如核心、上肢、灵敏等）。' : '- 弱化体能素质练习。'}
  ${form.hasGame ? '- 必须包含与课题相关的互动游戏环节。' : '- 不安排游戏环节。'}
- 期望的情感目标导向：${form.emotionTarget || '全面发展'}`;

  if (isCustomEnabled) {
    userPrompt += `
- 专业定制教案细节：
  - 第几课时：${customClassPeriod || '未提供具体课时，请根据常理推断'}
  ${!includeEquipment ? '- 场地与器材要求：已关闭"场地与器材"。请不要在教案中体现场地与器材这个板块。' : ''}
  ${includeReflection ? `- 课后教学反思要求：${customReflection ? `请直接在课后反思部分填入并充分扩展以下反思内容："${customReflection}"` : '请基于本节课的内容自动生成有深度的课后反思'}` : '- 课后教学反思要求：根据定制要求，不需要包含反思板块，请不要在教案中体现。'}
`;
    if (!includeTeacherActivity) {
      userPrompt += `  - 教师活动定制要求：已关闭"教学过程中的教师活动"。请务必在生成的"教学过程"中去掉教师活动相关的描述，也不要有相关的教师指导文字。\n`;
    }
  }

  return { systemPrompt, userPrompt };
};
