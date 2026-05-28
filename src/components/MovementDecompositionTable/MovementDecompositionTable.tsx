import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Target, Zap, ChevronRight, Info, Search, Loader2, History, Download, Trash2, X, Star, Bookmark, Clock } from 'lucide-react';
import { useAIProvider } from '../../hooks/useAIProvider';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { readDesktopUserStore, writeDesktopUserStore } from '../../lib/desktopStorage';
import { getCurrentUser } from '../../lib/session';

interface MovementProgression {
  step: string;
  action: string;
  keyPoints: string;
  commonMistakes: string;
}

interface FavoriteItem {
  id: string;
  name: string;
  data: MovementProgression[];
  createdAt: string;
}

interface MovementSearchResult {
  isSportMovement: boolean;
  confidence?: number;
  normalizedName?: string;
  reason?: string;
  data?: MovementProgression[];
}

const STORAGE_KEY_FAVORITES = 'movement_favorites';
const STORAGE_KEY_LAST_RESULT = 'movement_last_search_result';
const STORAGE_KEY_HISTORY = 'movement_search_history';

const SPORT_MOVEMENT_ERROR = '请输入具体的体育动作名称，例如：篮球投篮、前滚翻、短跑起跑、蛙泳出发。';

function extractJsonObject(text: string): MovementSearchResult {
  try {
    return JSON.parse(text) as MovementSearchResult;
  } catch {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('AI 返回内容不是 JSON 对象');
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as MovementSearchResult;
  }
}

function isValidMovementProgression(item: unknown): item is MovementProgression {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return ['step', 'action', 'keyPoints', 'commonMistakes'].every(
    (key) => typeof candidate[key] === 'string' && candidate[key].trim().length > 0
  );
}

function normalizeMovementData(data: unknown): MovementProgression[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isValidMovementProgression).slice(0, 6);
}

function looksLikePotentialMovementQuery(term: string): boolean {
  const normalized = term.trim();
  if (!normalized || normalized.length > 30) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  return /[\p{L}\p{N}]/u.test(normalized);
}

const DEFAULT_DATA: MovementProgression[] = [
  {
    step: "准备阶段",
    action: "双脚并拢，身体重心微降",
    keyPoints: "眼视前方，手臂自然下垂",
    commonMistakes: "低头看地，重心不稳"
  },
  {
    step: "起动阶段",
    action: "后脚用力蹬地，前脚积极前迈",
    keyPoints: "蹬摆协调，上体前倾",
    commonMistakes: "蹬地无力，起动缓慢"
  },
  {
    step: "加速阶段",
    action: "步频逐渐加快，步幅逐渐加大",
    keyPoints: "摆臂有力，脚掌着地",
    commonMistakes: "步幅变动过晚"
  },
  {
    step: "核心阶段",
    action: "保持最高速度，呼吸平稳",
    keyPoints: "动作放松，躯干正直",
    commonMistakes: "身体僵硬，耸肩"
  },
  {
    step: "冲刺阶段",
    action: "躯干前倾，快速通过终点",
    keyPoints: "不减速，不跳线",
    commonMistakes: "过早减速"
  }
];

export function MovementDecompositionTable() {
  const { generate } = useAIProvider();
  const username = getCurrentUser() || 'anonymous';
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<MovementProgression[]>(DEFAULT_DATA);
  const [movementName, setMovementName] = useState('标准短跑起跑');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteAdded, setFavoriteAdded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const favoritesRef = useRef<HTMLDivElement>(null);

  // Load history, favorites and last search result on mount
  useEffect(() => {
    let alive = true;
    Promise.all([
      readDesktopUserStore<string[]>(username, STORAGE_KEY_HISTORY, []),
      readDesktopUserStore<FavoriteItem[]>(username, STORAGE_KEY_FAVORITES, []),
      readDesktopUserStore<{ name?: string; data?: MovementProgression[] } | null>(username, STORAGE_KEY_LAST_RESULT, null),
    ]).then(([savedHistory, savedFavorites, lastResult]) => {
      if (!alive) return;
      if (Array.isArray(savedHistory)) setSearchHistory(savedHistory);
      if (Array.isArray(savedFavorites)) setFavorites(savedFavorites);
      if (lastResult) {
        const parsed = lastResult;
        if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
          setData(parsed.data);
          setMovementName(parsed.name || '动作拆解');
        }
      }
    }).catch((error) => {
      console.error('Failed to load movement desktop storage', error);
    });
    return () => {
      alive = false;
    };
  }, [username]);

  // Click outside to close favorites panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (favoritesRef.current && !favoritesRef.current.contains(event.target as Node)) {
        setShowFavorites(false);
      }
    };
    if (showFavorites) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFavorites]);

  const addToFavorites = () => {
    const newItem: FavoriteItem = {
      id: Date.now().toString(),
      name: movementName,
      data: data,
      createdAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }),
    };
    const updated = [newItem, ...favorites.filter(f => f.name !== movementName)].slice(0, 20);
    setFavorites(updated);
    void writeDesktopUserStore(username, STORAGE_KEY_FAVORITES, updated);
    setFavoriteAdded(true);
    setTimeout(() => setFavoriteAdded(false), 2000);
  };

  const removeFavorite = (id: string) => {
    const updated = favorites.filter(f => f.id !== id);
    setFavorites(updated);
    void writeDesktopUserStore(username, STORAGE_KEY_FAVORITES, updated);
  };

  const loadFavorite = (item: FavoriteItem) => {
    setData(item.data);
    setMovementName(item.name);
    setShowFavorites(false);
  };

  const addToHistory = (term: string) => {
    const updated = [term, ...searchHistory.filter(h => h !== term)].slice(0, 8);
    setSearchHistory(updated);
    void writeDesktopUserStore(username, STORAGE_KEY_HISTORY, updated);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    void writeDesktopUserStore(username, STORAGE_KEY_HISTORY, []);
  };

  const exportToPDF = async () => {
    if (!tableRef.current || isExporting) return;
    
    const defaultFileName = `${movementName}_动作拆解报告.pdf`;
    let fileHandle: any = null;

    try {
      if ('showSaveFilePicker' in window) {
        // Request file picker IMMEDIATELY to preserve user gesture
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'PDF 报告',
            accept: { 'application/pdf': ['.pdf'] },
          }],
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled
      console.warn('File picker failed:', err);
      // fallback will be used if fileHandle remains null
    }

    setIsExporting(true);
    const element = tableRef.current;
    
    try {
      const canvas = await toCanvas(element, {
        pixelRatio: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        backgroundColor: '#ffffff',
        style: {
          overflow: 'visible',
          height: 'auto',
          maxHeight: 'none',
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      const pdfWidth = 210; // A4 纸标准宽度(mm)
      const margin = 10;
      const availableWidth = pdfWidth - margin * 2;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // 按比例缩放以适应 A4 宽度
      const ratio = availableWidth / canvasWidth;
      const imgWidth = canvasWidth * ratio;
      const imgHeight = canvasHeight * ratio;

      // 动态计算 PDF 页面高度 (图片高度 + 上下边距)
      const pdfHeight = imgHeight + margin * 2;

      const pdf = new jsPDF({
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        orientation: 'portrait',
      });

      const xOffset = margin;
      const yOffset = margin;

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);

      const pdfBlob = pdf.output('blob');
      
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
      } else {
        // Fallback if file picker isn't supported or failed
        pdf.save(defaultFileName);
      }
    } catch (error: any) {
      console.error('PDF 导出失败:', error);
      alert('PDF 导出失败: ' + (error.message || error));
    } finally {
      setIsExporting(false);
    }
  };

  // Click outside to close history dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeHistoryItem = useCallback((e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = searchHistory.filter(h => h !== term);
    setSearchHistory(updated);
    void writeDesktopUserStore(username, STORAGE_KEY_HISTORY, updated);
  }, [searchHistory, username]);

  const handleSearch = async (e?: React.FormEvent, termOverride?: string) => {
    if (e) e.preventDefault();
    const term = (termOverride || searchTerm).trim();
    if (!term.trim()) return;
    if (!looksLikePotentialMovementQuery(term)) {
      setError(SPORT_MOVEMENT_ERROR);
      setShowHistory(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowHistory(false);

    try {
      const systemPrompt = '你是一位严谨的体育教练和人体运动学专家。你的任务是先判断用户输入是否为具体体育动作，再输出JSON格式结果。';
      
      const userPrompt = `用户输入："${term}"

请严格按下面规则返回一个纯 JSON 对象，不要包含 Markdown 标记、解释或多余文字。

判断规则：
1. 只有当输入是具体体育动作、运动技术、体能练习动作或可在体育课中教学的身体动作时，isSportMovement 才能为 true。
2. 如果输入是普通名词、学科词、食品、地点、人物、情绪、闲聊、抽象概念，或不是明确身体动作，必须返回 isSportMovement: false。
3. 不要为了满足请求强行把无关词改编成运动动作。

如果不是体育动作，返回：
{
  "isSportMovement": false,
  "confidence": 0,
  "reason": "简短说明为什么不是体育动作"
}

如果是体育动作，返回：
{
  "isSportMovement": true,
  "confidence": 0.9,
  "normalizedName": "规范动作名称",
  "data": [
    {
      "step": "阶段名称",
      "action": "动作说明",
      "keyPoints": "技术要点",
      "commonMistakes": "常见错误"
    }
  ]
}

confidence 必须是 0.85 到 1 之间的小数。
data 要求：4-6步，涵盖准备、发力/启动、核心过程、结束/恢复等阶段；语言专业、简洁、适合体育教师课堂使用。`;

      const text = await generate(systemPrompt, userPrompt);
      if (!text) throw new Error('AI 未返回内容');
      
      const result = extractJsonObject(text);
      const parsedData = normalizeMovementData(result.data);
      
      if (result.isSportMovement === true && (result.confidence ?? 0) >= 0.75 && parsedData.length >= 3) {
        setData(parsedData);
        const displayName = result.normalizedName?.trim() || term;
        setMovementName(displayName);
        addToHistory(displayName);
        setSearchTerm(''); // Clear search after success
        // 保存最后一次搜索结果到桌面数据文件，下次打开时自动显示
        void writeDesktopUserStore(username, STORAGE_KEY_LAST_RESULT, { name: displayName, data: parsedData });
      } else {
        setError(result.reason?.trim() || SPORT_MOVEMENT_ERROR);
      }
    } catch (err) {
      console.error('AI Generation Error:', err);
      setError('无法获取有效的动作拆解，请输入具体体育动作，例如：篮球投篮、游泳出发、前滚翻。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white shrink-0 sm:flex-1">
            <Activity className="w-6 h-6" />
            <h3 className="text-xl font-black">{movementName} 动作拆解</h3>
          </div>

          <div className="relative w-full sm:w-[450px] shrink-0" ref={searchContainerRef}>
            <form onSubmit={(e) => handleSearch(e)}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowHistory(true)}
                placeholder="搜索动作 (如: 篮球投篮)"
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-28 text-white placeholder:text-white/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-[17px] font-medium"
              />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="absolute right-1.5 min-w-[90px] text-[15px] top-1/2 -translate-y-1/2 bg-white text-primary-700 px-4 py-1.5 rounded-lg font-black shadow-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-primary-600 mx-auto" /> : 'AI拆解'}
                </button>
              </form>

              {/* Search History Dropdown */}
              <AnimatePresence>
                {showHistory && searchHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                        <History className="w-3.5 h-3.5" />
                        <span>最近搜索</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); clearHistory(); setShowHistory(false); }}
                        className="text-slate-400 hover:text-red-500 text-[11px] font-bold transition-colors"
                      >
                        清除全部
                      </button>
                    </div>
                    <div className="py-1">
                      {searchHistory.map((term, i) => (
                        <motion.button
                          key={term + i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => handleSearch(undefined, term)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors group"
                        >
                          <span className="text-[15px] font-medium">{term}</span>
                          <button
                            onClick={(e) => removeHistoryItem(e, term)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                            title="删除"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 w-full sm:flex-1 justify-end">
            <div className="relative" ref={favoritesRef}>
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className={`relative bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all border border-white/20 shadow-sm ${favorites.length > 0 ? 'ring-2 ring-yellow-300/50' : ''}`}
                title="收藏列表"
              >
                <Bookmark className={`w-5 h-5 ${favorites.length > 0 ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                {favorites.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>

              {/* Favorites Panel */}
              <AnimatePresence>
                {showFavorites && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span>收藏列表</span>
                        <span className="text-slate-300 font-medium">({favorites.length})</span>
                      </div>
                    </div>
                    {favorites.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">
                        <Star className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                        <p>暂无收藏</p>
                        <p className="text-xs mt-1">AI 生成拆解后可点击星标收藏</p>
                      </div>
                    ) : (
                      <div className="py-1 max-h-64 overflow-y-auto">
                        {favorites.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors group cursor-pointer"
                            onClick={() => loadFavorite(item)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                                <span className="text-[14px] font-medium text-slate-700 truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 ml-5">
                                <Clock className="w-3 h-3 text-slate-300" />
                                <span className="text-[11px] text-slate-400">{item.createdAt}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFavorite(item.id); }}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1 shrink-0"
                              title="删除收藏"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={addToFavorites}
              className={`bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all border border-white/20 shadow-sm ${favoriteAdded ? 'ring-2 ring-yellow-300 bg-yellow-400/20' : ''}`}
              title="收藏当前拆解"
            >
              <Star className={`w-5 h-5 ${favoriteAdded ? 'fill-yellow-300 text-yellow-300' : ''}`} />
            </button>

            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all border border-white/20 shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[46px]"
              title="导出为 PDF"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto relative custom-scrollbar min-h-0" ref={tableRef}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
            <p className="text-primary-700 text-lg font-bold animate-pulse">大模型正在深度分析动作精髓...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-8 text-center">
            <Info className="w-16 h-16 text-rose-400 mb-4" />
            <p className="text-slate-600 text-lg font-medium">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-6 text-primary-600 text-lg font-bold hover:underline"
            >
              返回默认演示
            </button>
          </div>
        )}

        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="px-6 py-4 text-left text-[16px] font-black text-slate-800 w-32 shadow-sm">分解阶段</th>
              <th className="px-6 py-4 text-left text-[16px] font-black text-slate-800 shadow-sm">动作说明</th>
              <th className="px-6 py-4 text-left text-[16px] font-black text-slate-800 shadow-sm">技术要点 (关键)</th>
              <th className="px-6 py-4 text-left text-[16px] font-black text-slate-800 shadow-sm">常见错误纠正</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {data.map((item, idx) => (
                <motion.tr 
                  key={item.step + idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="border-b border-slate-100 hover:bg-emerald-50/30 transition-colors group"
                >
                  <td className="px-6 py-6 align-top">
                    <div className="bg-primary-100 text-primary-800 text-[14px] font-black py-1.5 px-3 rounded-lg inline-block shadow-sm">
                      {item.step}
                    </div>
                  </td>
                  <td className="px-6 py-6 align-top">
                    <div className="flex items-start gap-3">
                      <ChevronRight className="w-5 h-5 text-primary-500 mt-1 shrink-0" />
                      <span className="text-[17px] text-slate-900 font-bold leading-relaxed">{item.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 align-top">
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                      <span className="text-[16px] text-slate-700 leading-relaxed font-semibold">{item.keyPoints}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 align-top">
                    <div className="flex items-start gap-3 bg-rose-50/80 p-3 rounded-xl border border-rose-100">
                      <Info className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                      <span className="text-[15px] text-rose-700 font-medium leading-relaxed">{item.commonMistakes}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

