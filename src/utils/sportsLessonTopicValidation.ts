export const SPORTS_TOPIC_ERROR =
  '当前系统仅支持体育与健康类教案，请填写具体体育课题，例如：前滚翻、篮球运球、立定跳远、跳绳、运动后合理补水。';

type SportsLessonTopicValidationResult = {
  isValid: boolean;
  message?: string;
};

const SPORTS_TOPIC_KEYWORDS = [
  '体育',
  '体健',
  '健康',
  '运动',
  '锻炼',
  '体能',
  '体质',
  '热身',
  '放松',
  '柔韧',
  '力量',
  '耐力',
  '灵敏',
  '协调',
  '平衡',
  '速度',
  '爆发力',
  '补水',
  '安全',
  '篮球',
  '足球',
  '排球',
  '气排球',
  '乒乓球',
  '羽毛球',
  '网球',
  '棒球',
  '垒球',
  '手球',
  '橄榄球',
  '毽球',
  '田径',
  '短跑',
  '长跑',
  '快速跑',
  '耐久跑',
  '接力',
  '跨栏',
  '跳远',
  '跳高',
  '立定跳远',
  '投掷',
  '掷远',
  '投准',
  '投远',
  '实心球',
  '铅球',
  '标枪',
  '跳绳',
  '跑步',
  '慢跑',
  '快跑',
  '追逐跑',
  '折返跑',
  '障碍跑',
  '往返跑',
  '变速跑',
  '弯道跑',
  '起跑',
  '游泳',
  '蛙泳',
  '自由泳',
  '仰泳',
  '蝶泳',
  '体操',
  '广播体操',
  '健美操',
  '啦啦操',
  '韵律操',
  '前滚翻',
  '后滚翻',
  '滚翻',
  '鱼跃',
  '支撑跳跃',
  '武术',
  '五步拳',
  '太极',
  '跆拳道',
  '搏击',
  '队列',
  '队形',
  '引体向上',
  '俯卧撑',
  '仰卧起坐',
  '平板支撑',
  '深蹲',
  '弓步',
  '高抬腿',
  '开合跳',
  '坐位体前屈',
  '体前屈',
  '攀爬',
  '爬行',
  '跳跃',
  '单脚跳',
  '双脚跳',
  '连续跳',
  '蛙跳',
  '兔跳',
  '助跑跳',
  '跨跳',
  '跳荷叶',
  '投篮',
  '运球',
  '传球',
  '射门',
  '垫球',
  '发球',
  '接球',
  '扣球',
  '绕杆',
  '绕障碍',
  '挥拍',
  '颠球',
  '盘带',
  '滑步',
  '步伐',
  '体育游戏',
  '老鹰捉小鸡',
  '丢手绢',
  '捕鱼',
  '跳房子',
  'basketball',
  'football',
  'soccer',
  'volleyball',
  'badminton',
  'tabletennis',
  'tennis',
  'running',
  'swimming',
  'fitness',
  'yoga',
];

const CLEARLY_UNRELATED_EXACT_TOPICS = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '历史',
  '地理',
  '生物',
  '政治',
  '音乐',
  '美术',
  '科学',
  '信息技术',
  '编程',
  '吃饭',
  '睡觉',
  '做饭',
  '旅游',
  '购物',
  '聊天',
  '天气',
  '游戏',
];

const CLEARLY_UNRELATED_KEYWORDS = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '历史',
  '地理',
  '生物',
  '政治',
  '道德与法治',
  '信息技术',
  '编程',
  '作文',
  '古诗',
  '阅读',
  '书法',
  '画画',
  '唱歌',
  '钢琴',
  '音乐欣赏',
  '美术鉴赏',
  '天气预报',
  '烹饪',
  '做饭',
  '睡觉',
  '吃饭',
  '旅游',
  '购物',
  '电影',
  '电视剧',
  '聊天',
];

const normalizeTopic = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s,，。、“”‘’'"：:；;！!？?（）()【】[\]{}《》<>·\-_/\\]+/g, '');

export function validateSportsLessonTopic(value: string): SportsLessonTopicValidationResult {
  const normalized = normalizeTopic(value);

  if (!normalized) {
    return {
      isValid: false,
      message: '请先填写体育相关课程名称或课题。',
    };
  }

  if (CLEARLY_UNRELATED_EXACT_TOPICS.includes(normalized)) {
    return {
      isValid: false,
      message: SPORTS_TOPIC_ERROR,
    };
  }

  if (CLEARLY_UNRELATED_KEYWORDS.some((keyword) => normalized.includes(normalizeTopic(keyword)))) {
    return {
      isValid: false,
      message: SPORTS_TOPIC_ERROR,
    };
  }

  const hasSportsKeyword = SPORTS_TOPIC_KEYWORDS.some((keyword) =>
    normalized.includes(normalizeTopic(keyword)),
  );

  if (hasSportsKeyword) {
    return { isValid: true };
  }

  return {
    isValid: false,
    message: SPORTS_TOPIC_ERROR,
  };
}
