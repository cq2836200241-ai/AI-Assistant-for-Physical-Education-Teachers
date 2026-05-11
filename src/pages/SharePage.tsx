import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LessonPlanViewer } from '../components/LessonPlanViewer/LessonPlanViewer';
import { Activity } from 'lucide-react';

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      if (!id) return;
      try {
        const docRef = doc(db, 'sharedPlans', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setPlan(docSnap.data());
        } else {
          setError('找不到该教案，可能已被删除或链接无效。');
        }
      } catch (err: any) {
        console.error('Error fetching shared plan:', err);
        setError('加载教案时出错。');
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">正在加载分享的教案...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">出错了</h1>
        <p className="text-slate-500 text-center max-w-md mb-8">{error}</p>
        <a 
          href="/" 
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
        >
          回到首页
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="h-[64px] bg-[#b04929] border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2.5 text-[25px]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center text-[#fff] font-bold text-sm shadow-sm ring-1 ring-black/5">PE</div>
          <span className="text-[25px] font-semibold text-[#ecfefc]">体育教案分享</span>
        </div>
        <div className="text-slate-200 text-sm hidden sm:block">
          通过 PE 教案助手分享
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-auto bg-[#8e99a1]">
        <div className="max-w-5xl mx-auto py-8">
           <LessonPlanViewer 
             content={plan.content} 
             title={plan.title} 
             grades={plan.grades}
           />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-slate-100 border-t border-slate-200 flex flex-col items-center justify-center gap-4 shrink-0">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Activity className="w-4 h-4" />
          <span>体育教案助手 · 让教学更简单</span>
        </div>
        <a 
          href="/" 
          className="text-xs text-primary-600 hover:underline font-medium"
        >
          也想制作属于你的专业教案？点击这里试试
        </a>
      </footer>
    </div>
  );
}
