/**
 * 中国小学体育与健康 一至六年级 运动技能课程总览数据
 *
 * 后期完善说明：
 * - 修改/补充内容只需编辑下方 CURRICULUM_DATA 数组
 * - 新增年级单元：在数组中追加新对象
 * - 修改学习目标：编辑对应单元的 objs 数组
 * - 新增运动领域：在 areas 数组中添加新标签，colorClass 可选值见 AREA_COLOR_MAP
 */

export interface CurriculumArea {
  label: string;
  colorClass: string;
}

export interface CurriculumUnit {
  /** 年级 1-6 */
  grade: number;
  /** 学期 1=上学期, 2=下学期 */
  sem: number;
  /** 年级显示标签 */
  gradeLabel: string;
  /** 年级 CSS 类名 */
  gradeClass: string;
  /** 技能名称 */
  skillName: string;
  /** 运动领域标签 */
  areas: CurriculumArea[];
  /** 学习目标 */
  objs: string[];
}

export interface GradeGroup {
  label: string;
  sub: string;
  grades: number[];
}

/** 运动领域颜色映射（方便后续扩展时查阅） */
export const AREA_COLOR_MAP: Record<string, string> = {
  走跑: 'tag-run',
  跳跃: 'tag-jump',
  投掷: 'tag-throw',
  体操: 'tag-gym',
  球类: 'tag-ball',
  舞蹈: 'tag-dance',
  游泳: 'tag-swim',
};

/** 学段分组 */
export const GRADE_GROUPS: GradeGroup[] = [
  { label: '第一学段（1–2年级）', sub: '动作基础养成期', grades: [1, 2] },
  { label: '第二学段（3–4年级）', sub: '技能习得拓展期', grades: [3, 4] },
  { label: '第三学段（5–6年级）', sub: '技术巩固综合期', grades: [5, 6] },
];

/** 学期显示名 */
export const SEM_LABELS: Record<number, string> = {
  1: '上学期',
  2: '下学期',
};

/** 课程数据 */
export const CURRICULUM_DATA: CurriculumUnit[] = [
  {
    grade: 1, sem: 1, gradeLabel: '一年级', gradeClass: 'g1',
    skillName: '走跑游戏 · 基础移动',
    areas: [{ label: '走跑', colorClass: 'tag-run' }, { label: '跳跃', colorClass: 'tag-jump' }],
    objs: [
      '掌握自然走姿，步伐协调，手脚对侧摆动',
      '能按口令变换走跑节奏（快走、慢跑）',
      '跑步时保持直线，不碰撞同伴',
      '单脚跳、双脚跳起步，落地缓冲意识初建',
      '通过游戏培养空间感知与简单协作意识',
    ],
  },
  {
    grade: 1, sem: 2, gradeLabel: '一年级', gradeClass: 'g1',
    skillName: '投掷游戏 · 基础体操',
    areas: [{ label: '投掷', colorClass: 'tag-throw' }, { label: '体操', colorClass: 'tag-gym' }],
    objs: [
      '单手原地上手投掷，初步建立出手角度概念',
      '双手持轻器械（沙包/软球）做简单投准游戏',
      '滚翻前滚预备动作：低头团身，保护意识',
      '能完成简单队列队形（横排、纵队、圆形）',
      '了解运动安全基本规则，不推撞他人',
    ],
  },
  {
    grade: 2, sem: 1, gradeLabel: '二年级', gradeClass: 'g2',
    skillName: '跑跳技能 · 协调发展',
    areas: [{ label: '走跑', colorClass: 'tag-run' }, { label: '跳跃', colorClass: 'tag-jump' }],
    objs: [
      '30–50米加速跑，启动姿势初步规范化',
      '跨越障碍跑，培养节奏感与空间判断力',
      '立定跳远：双脚起跳，摆臂、蹬地、落地三段协调',
      '跳绳基础：单人连续跳绳10次以上',
      '通过接力游戏培养团队意识与规则遵守',
    ],
  },
  {
    grade: 2, sem: 2, gradeLabel: '二年级', gradeClass: 'g2',
    skillName: '球类启蒙 · 民间游戏',
    areas: [{ label: '球类', colorClass: 'tag-ball' }, { label: '舞蹈', colorClass: 'tag-dance' }],
    objs: [
      '大球滚动控制：原地拍球5次以上不失控',
      '踢球初步：脚内侧传球方向感建立',
      '韵律活动：跟随音乐做简单肢体律动',
      '民间传统游戏（跳皮筋、丢手绢等）动作要领',
      '培养对球类运动的兴趣与基本手眼协调',
    ],
  },
  {
    grade: 3, sem: 1, gradeLabel: '三年级', gradeClass: 'g3',
    skillName: '耐久跑 · 前滚翻',
    areas: [{ label: '走跑', colorClass: 'tag-run' }, { label: '体操', colorClass: 'tag-gym' }],
    objs: [
      '匀速跑400–600米，初步建立配速意识',
      '跑步呼吸节律：掌握鼻口配合二步一呼吸',
      '前滚翻完整动作：低头团身→推手→滚动→起身',
      '能连续完成2次前滚翻，方向保持直线',
      '了解肌肉酸痛与运动疲劳的基本概念',
    ],
  },
  {
    grade: 3, sem: 2, gradeLabel: '三年级', gradeClass: 'g3',
    skillName: '投掷技术 · 篮球启蒙',
    areas: [{ label: '投掷', colorClass: 'tag-throw' }, { label: '球类', colorClass: 'tag-ball' }],
    objs: [
      '侧向投掷：持轻器械（垒球/沙包）侧身蹬转投掷',
      '投掷距离与准度兼顾，初步建立「全身发力」意识',
      '篮球原地运球：单手拍球，控制节奏20次以上',
      '行进间运球初体验，方向感与球感建立',
      '了解篮球基本规则（走步、双运）',
    ],
  },
  {
    grade: 4, sem: 1, gradeLabel: '四年级', gradeClass: 'g4',
    skillName: '跨栏跑 · 后滚翻',
    areas: [{ label: '走跑', colorClass: 'tag-run' }, { label: '体操', colorClass: 'tag-gym' }],
    objs: [
      '跨栏跑：主力腿蹬地，摆动腿积极前伸跨越',
      '节奏稳定，连续跨越3–5个低矮障碍',
      '后滚翻：团身→后倒→推手翻转→起身完整完成',
      '能正确判断并规避滚翻中的颈部受力风险',
      '跑步步频与步幅关系的初步认知',
    ],
  },
  {
    grade: 4, sem: 2, gradeLabel: '四年级', gradeClass: 'g4',
    skillName: '足球基础 · 跳绳进阶',
    areas: [{ label: '球类', colorClass: 'tag-ball' }, { label: '跳跃', colorClass: 'tag-jump' }],
    objs: [
      '足球脚内侧传接球：稳定传球方向与力度控制',
      '运球绕障碍：变向运球，保持球不远离脚',
      '交叉跳绳：单摇双脚交叉跳30次以上',
      '双人跳绳：节奏配合与入绳时机判断',
      '了解足球比赛基本规则（越位、界外）',
    ],
  },
  {
    grade: 5, sem: 1, gradeLabel: '五年级', gradeClass: 'g5',
    skillName: '中长跑 · 篮球技术',
    areas: [{ label: '走跑', colorClass: 'tag-run' }, { label: '球类', colorClass: 'tag-ball' }],
    objs: [
      '800/1000米中长跑测试（男女分组），达到标准',
      '跑姿技术：前倾角度、摆臂与步频的协调优化',
      '篮球行进间运球上篮：三步上篮步法初步掌握',
      '双手胸前传球与接球：出手角度与力度控制',
      '团队配合意识：简单的传切跑位概念',
    ],
  },
  {
    grade: 5, sem: 2, gradeLabel: '五年级', gradeClass: 'g5',
    skillName: '排球入门 · 武术基础',
    areas: [{ label: '球类', colorClass: 'tag-ball' }, { label: '舞蹈', colorClass: 'tag-dance' }],
    objs: [
      '排球正面双手垫球：手型固定，迎球击打点稳定',
      '自垫连续10次以上，控制球高度在腰部以上',
      '武术基本功：弓步、马步、虚步站型规范',
      '武术基本手型（拳、掌、勾）与基本步型组合',
      '了解中国传统武术文化内涵与礼仪规范',
    ],
  },
  {
    grade: 6, sem: 1, gradeLabel: '六年级', gradeClass: 'g6',
    skillName: '田径综合 · 体能测评',
    areas: [{ label: '走跑', colorClass: 'tag-run' }, { label: '跳跃', colorClass: 'tag-jump' }, { label: '投掷', colorClass: 'tag-throw' }],
    objs: [
      '50米冲刺跑：起跑反应、加速段、最高速维持完整技术',
      '跳远技术完整掌握：助跑–起跳–腾空–落地四阶段',
      '铅球/实心球推：持球手型、蹬地转体、出手角度（约40°）',
      '完成《国家学生体质健康标准》全项测试',
      '能对自身体能水平进行初步自我评价',
    ],
  },
  {
    grade: 6, sem: 2, gradeLabel: '六年级', gradeClass: 'g6',
    skillName: '综合球类 · 毕业体能',
    areas: [{ label: '球类', colorClass: 'tag-ball' }, { label: '游泳', colorClass: 'tag-swim' }],
    objs: [
      '乒乓球/羽毛球：正手攻球/平高球基本技术',
      '对打回合中保持正确站位与击球点判断',
      '游泳（有条件学校）：蛙泳或自由泳连续游25米',
      '运动损伤预防：肌肉拉伤、扭伤的初步处置知识',
      '小学阶段运动技能回顾，培养终身体育锻炼意志',
    ],
  },
];
