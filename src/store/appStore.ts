import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultClassCounts, EDUCATION_LEVELS } from '../constants/education';

export interface FormState {
  grades: string[];
  ability: string;
  courseName: string;
  duration: string;
  studentCount: number;
  equipments: string[];
  courseType: string;
  weather: '晴天' | '高温' | '雨天';
  teachingFocus: string;
  hasFitness: boolean;
  hasGame: boolean;
  hasSkillTraining: boolean;
  hasMatch: boolean;
  emotionTarget: string;
  customDetailsEnabled: boolean;
  classPeriod: string;
  reflection: string;
  venue: string;
  includeEquipment: boolean;
  includeTeacherActivity: boolean;
  includeReflection: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
}

export interface LessonPlan {
  id: string;
  title: string;
  date: string;
  content: string; // Markdown
  tags: string[];
  summary: string;
  grades: string[];
}

export interface AdoptedPlan {
  id: string;
  planId: string;
  title: string;
  dateAdopted: string;
  grade: string;
  className: string;
  content: string;
}

export interface CourseEntry {
  day: number; // 1-5 for Mon-Fri
  slotId: string;
  grade: string;
  className: string;
}

interface AppState {
  // Form State
  form: FormState;
  setForm: (form: Partial<FormState>) => void;
  
  // Settings
  providers: Record<string, ProviderConfig>;
  activeProviderId: string;
  theme: string;
  setTheme: (theme: string) => void;
  setActiveProviderId: (id: string) => void;
  updateProvider: (id: string, config: Partial<ProviderConfig>) => void;
  
  // Education Settings
  educationLevel: string;
  setEducationLevel: (level: string) => void;
  classCounts: Record<string, number>;
  setClassCount: (grade: string, count: number) => void;
  resetClassCounts: () => void;
  
  // Generation logic
  
  // Generation logic
  isGenerating: boolean;
  generationProgress: number;
  generationStatus: string;
  currentPlanContent: string;
  lastGeneratedPlanId: string | null;
  setIsGenerating: (v: boolean) => void;
  setGenerationProgress: (v: number) => void;
  setGenerationStatus: (v: string) => void;
  setCurrentPlanContent: (v: string | ((prev: string) => string)) => void;
  setLastGeneratedPlanId: (id: string | null) => void;
  
  // History

  history: LessonPlan[];
  previewedHistoryPlan: LessonPlan | null;
  setPreviewedHistoryPlan: (plan: LessonPlan | null) => void;
  addHistory: (plan: LessonPlan) => void;
  removeHistory: (id: string) => void;
  updateHistoryContent: (id: string, content: string, summary?: string) => void;
  clearHistory: () => void;

  
  // Schedule
  schedule: Record<string, string>;
  updateSchedule: (key: string, subject: string) => void;

  // Course Data (可编辑的课表)
  courseData: CourseEntry[];
  setCourseData: (data: CourseEntry[]) => void;
  addCourseEntry: (entry: CourseEntry) => void;
  removeCourseEntry: (day: number, slotId: string) => void;
  
  // Display settings
  autoMist: boolean;
  setAutoMist: (v: boolean) => void;
  isTimetableEditMode: boolean;
  setTimetableEditMode: (v: boolean) => void;
  classReminderEnabled: boolean;
  setClassReminderEnabled: (v: boolean) => void;
  
  // Adopted Plans
  adoptedPlans: AdoptedPlan[];
  addAdoptedPlan: (plan: AdoptedPlan) => void;
  removeAdoptedPlan: (id: string) => void;
  clearAdoptedPlansByClass: (grade: string, className: string) => void;
}

const defaultForm: FormState = {
  grades: [],
  ability: '',
  courseName: '',
  duration: '40分钟',
  studentCount: 40,
  equipments: [],
  courseType: '',
  weather: '晴天',
  teachingFocus: '',
  hasFitness: true,
  hasGame: true,
  hasSkillTraining: true,
  hasMatch: false,
  emotionTarget: '',
  customDetailsEnabled: false,
  classPeriod: '',
  reflection: '',
  venue: '',
  includeEquipment: true,
  includeTeacherActivity: true,
  includeReflection: true,
};

const defaultProviders: Record<string, ProviderConfig> = {
  gemini: { id: 'gemini', name: 'Google Gemini', apiKey: '', model: 'gemini-2.5-flash', temperature: 0.8 },
  openai: { id: 'openai', name: 'OpenAI', apiKey: '', model: 'gpt-4o', temperature: 0.8 },
  anthropic: { id: 'anthropic', name: 'Anthropic', apiKey: '', model: 'claude-3-5-sonnet-20241022', temperature: 0.8 },
  qwen: { id: 'qwen', name: '阿里云百炼 (Qwen)', apiKey: '', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max', temperature: 0.8 },
  doubao: { id: 'doubao', name: '字节跳动 (Doubao)', apiKey: '', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro', temperature: 0.8 },
  ernie: { id: 'ernie', name: '百度文心 (ERNIE)', apiKey: '', baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop', model: 'ernie-4.0', temperature: 0.8 },
  spark: { id: 'spark', name: '讯飞星火 (Spark)', apiKey: '', baseUrl: 'https://spark-api-open.xf-yun.com/v1', model: 'spark-max', temperature: 0.8 },
  glm: { id: 'glm', name: '智谱 AI (GLM)', apiKey: '', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4', temperature: 0.8 },
  deepseek: { id: 'deepseek', name: 'DeepSeek', apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', temperature: 0.8 },
  custom: { id: 'custom', name: '自定义 (Custom)', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo', temperature: 0.8 },
};

const defaultCourseData: CourseEntry[] = [
  { day: 1, slotId: 'am3', grade: '五', className: '2' },
  { day: 1, slotId: 'pm2', grade: '四', className: '1' },
  { day: 2, slotId: 'pm1', grade: '四', className: '3' },
  { day: 2, slotId: 'pm2', grade: '五', className: '1' },
  { day: 2, slotId: 'pm3', grade: '四', className: '2' },
  { day: 3, slotId: 'am1', grade: '五', className: '3' },
  { day: 3, slotId: 'pm1', grade: '四', className: '3' },
  { day: 3, slotId: 'pm2', grade: '五', className: '1' },
  { day: 3, slotId: 'pm3', grade: '五', className: '2' },
  { day: 3, slotId: 'ext1', grade: '二', className: '1' },
  { day: 4, slotId: 'am1', grade: '三', className: '2' },
  { day: 4, slotId: 'pm1', grade: '四', className: '1' },
  { day: 4, slotId: 'pm3', grade: '四', className: '2' },
  { day: 4, slotId: 'ext1', grade: '四', className: '3' },
  { day: 4, slotId: 'ext2', grade: '五', className: '1' },
  { day: 5, slotId: 'am3', grade: '三', className: '1' },
  { day: 5, slotId: 'pm1', grade: '三', className: '3' },
  { day: 5, slotId: 'pm2', grade: '五', className: '3' },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      form: defaultForm,
      setForm: (newForm) => set((state) => ({ form: { ...state.form, ...newForm } })),
      
      providers: defaultProviders,
      activeProviderId: 'gemini',
      theme: 'ocean',
      setTheme: (theme) => set({ theme }),
      setActiveProviderId: (id) => set({ activeProviderId: id }),
      updateProvider: (id, config) => set((state) => ({
        providers: {
          ...state.providers,
          [id]: { ...state.providers[id], ...config }
        }
      })),
      
      // Education Settings
      educationLevel: 'primary',
      setEducationLevel: (level) => {
        set((state) => {
          // 切换学段时清空年级选择
          const newForm = { ...state.form, grades: [] };
          return { educationLevel: level, form: newForm };
        });
      },
      classCounts: getDefaultClassCounts(),
      setClassCount: (grade, count) => set((state) => ({
        classCounts: { ...state.classCounts, [grade]: count }
      })),
      resetClassCounts: () => set({ classCounts: getDefaultClassCounts() }),
      
      isGenerating: false,
      generationProgress: 0,
      generationStatus: '',
      currentPlanContent: '',
      lastGeneratedPlanId: null,
      setIsGenerating: (v) => set({ isGenerating: v }),
      setGenerationProgress: (v) => set({ generationProgress: v }),
      setGenerationStatus: (v) => set({ generationStatus: v }),
      setCurrentPlanContent: (v) => set((state) => ({ 
        currentPlanContent: typeof v === 'function' ? v(state.currentPlanContent) : v 
      })),
      setLastGeneratedPlanId: (id) => set({ lastGeneratedPlanId: id }),
      
      history: [],

      previewedHistoryPlan: null,
      setPreviewedHistoryPlan: (plan) => set({ previewedHistoryPlan: plan }),
      addHistory: (plan) => set((state) => ({ history: [plan, ...state.history] })),
      removeHistory: (id) => set((state) => ({ history: state.history.filter(h => h.id !== id) })),
      updateHistoryContent: (id, content, summary) => set((state) => ({
        history: state.history.map(h => 
          h.id === id 
            ? { ...h, content, summary: summary ?? content.slice(0, 100).replace(/#/g, '') + '...' }
            : h
        )
      })),
      clearHistory: () => set({ history: [] }),

      
      schedule: {},
      updateSchedule: (key, subject) => set((state) => ({ schedule: { ...state.schedule, [key]: subject } })),
      
      courseData: defaultCourseData,
      setCourseData: (data) => set({ courseData: data }),
      addCourseEntry: (entry) => set((state) => ({ courseData: [...state.courseData, entry] })),
      removeCourseEntry: (day, slotId) => set((state) => ({
        courseData: state.courseData.filter(e => !(e.day === day && e.slotId === slotId))
      })),
      
      autoMist: false,
      setAutoMist: (v) => set({ autoMist: v }),
      isTimetableEditMode: false,
      setTimetableEditMode: (v) => set({ isTimetableEditMode: v }),
      classReminderEnabled: false,
      setClassReminderEnabled: (v) => set({ classReminderEnabled: v }),
      
      adoptedPlans: [],
      addAdoptedPlan: (plan) => set((state) => ({ adoptedPlans: [plan, ...state.adoptedPlans] })),
      removeAdoptedPlan: (id) => set((state) => ({ adoptedPlans: state.adoptedPlans.filter(p => p.id !== id) })),
      clearAdoptedPlansByClass: (grade, className) => set((state) => ({ 
        adoptedPlans: state.adoptedPlans.filter(p => !(p.grade === grade && p.className === className)) 
      }))
    }),
    {
      name: 'pe-lesson-planner-storage-v2',
      partialize: (state) => ({
        form: state.form,
        providers: state.providers,
        activeProviderId: state.activeProviderId,
        theme: state.theme,
        educationLevel: state.educationLevel,
        classCounts: state.classCounts,
        history: state.history,
        schedule: state.schedule,
        courseData: state.courseData,
        autoMist: state.autoMist,
        classReminderEnabled: state.classReminderEnabled,
        adoptedPlans: state.adoptedPlans
      }),
    }
  )
);
