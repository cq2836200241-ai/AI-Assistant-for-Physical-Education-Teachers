import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Target, Zap, ChevronRight, Info, Search, Loader2, History, Download, Trash2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MovementProgression {
  step: string;
  action: string;
  keyPoints: string;
  commonMistakes: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<MovementProgression[]>(DEFAULT_DATA);
  const [movementName, setMovementName] = useState('标准短跑起跑');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('movement_search_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  const addToHistory = (term: string) => {
    const updated = [term, ...searchHistory.filter(h => h !== term)].slice(0, 8);
    setSearchHistory(updated);
    localStorage.setItem('movement_search_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('movement_search_history');
  };

  const exportToPDF = async () => {
    if (!tableRef.current) return;
    
    try {
      const element = tableRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const availableWidth = pdfWidth - margin * 2;
      const availableHeight = pdfHeight - margin * 2;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const ratio = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);
      const imgWidth = canvasWidth * ratio;
      const imgHeight = canvasHeight * ratio;

      const xOffset = margin + (availableWidth - imgWidth) / 2;
      const yOffset = margin;

      if (imgHeight <= availableHeight) {
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
      } else {
        const pageCanvasHeight = availableHeight / ratio;
        let totalHeight = 0;
        let pageNum = 0;

        while (totalHeight < canvasHeight) {
          if (pageNum > 0) {
            pdf.addPage();
          }

          const currentPageHeight = Math.min(pageCanvasHeight, canvasHeight - totalHeight);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvasWidth;
          pageCanvas.height = currentPageHeight;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, totalHeight, canvasWidth, currentPageHeight, 0, 0, canvasWidth, currentPageHeight);
          }

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          const pageImgHeight = currentPageHeight * ratio;

          pdf.addImage(pageImgData, 'JPEG', xOffset, yOffset, imgWidth, pageImgHeight);

          totalHeight += currentPageHeight;
          pageNum++;
        }
      }

      pdf.save(`${movementName}_动作拆解报告.pdf`);
    } catch (error) {
      console.error('PDF 导出失败:', error);
    }
  };

  const handleSearch = async (e?: React.FormEvent, termOverride?: string) => {
    if (e) e.preventDefault();
    const term = termOverride || searchTerm;
    if (!term.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const prompt = `你是一位专业的体育教练和人体运动学专家。
        请对"${term}"这个运动动作进行专业的精细化拆解。

        要求：
        1. 返回一个JSON数组。
        2. 每个对象包含：step (阶段名称), action (动作说明), keyPoints (技术要点), commonMistakes (常见错误)。
        3. 拆解步骤通常为4-6步，涵盖准备、爆发、核心过程、结束/恢复等阶段。
        4. 语言专业、简洁、易懂。
        5. 必须返回纯JSON格式，可以直接被 JSON.parse 解析。不要包含 Markdown 标记。`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
      } catch (err: any) {
        if (err?.status === 429 || err?.status === 'RESOURCE_EXHAUSTED' || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('API请求频率超限或配额耗尽，无法自动生成分解表格，请稍后再试或手动输入。');
        }
        throw err;
      }
      
      const text = response.text;
      if (!text) throw new Error('AI 未返回内容');
      
      const parsedData = JSON.parse(text);
      
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        setData(parsedData);
        setMovementName(term);
        addToHistory(term);
        setSearchTerm(''); // Clear search after success
      } else {
        throw new Error('返回数据格式不正确');
      }
    } catch (err) {
      console.error('AI Generation Error:', err);
      setError('无法获取动作拆解，请换个词试试 (例如: "篮球投篮"、"游泳出发")');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white shrink-0">
            <Activity className="w-6 h-6" />
            <h3 className="text-xl font-black">{movementName} 动作拆解</h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:flex-1 justify-end">
            <form onSubmit={(e) => handleSearch(e)} className="relative w-full sm:max-w-2xl lg:max-w-4xl flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索动作名称 (如: 篮球投篮...)"
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

            <button
              onClick={exportToPDF}
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all border border-white/20 shadow-sm"
              title="导出为 PDF"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search History Chips */}
        <AnimatePresence>
          {searchHistory.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 flex-wrap"
            >
              <div className="flex items-center gap-1 text-white/60 text-xs font-bold mr-1">
                <History className="w-3 h-3" />
                <span>最近:</span>
              </div>
              {searchHistory.map((term, i) => (
                <motion.button
                  key={term + i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSearch(undefined, term)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full py-1 px-3 text-[13px] text-white/80 font-medium transition-all"
                >
                  {term}
                </motion.button>
              ))}
              <button 
                onClick={clearHistory}
                className="text-white/40 hover:text-white/80 text-[11px] font-bold ml-1 transition-colors"
              >
                清除
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="overflow-x-auto relative custom-scrollbar" ref={tableRef}>
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
      
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <p className="text-[12px] text-slate-400 text-center italic">
          * 以上分析由 AI 动态生成，基于专业教学规范，可作为教学辅助参考。
        </p>
      </div>
    </div>
  );
}

