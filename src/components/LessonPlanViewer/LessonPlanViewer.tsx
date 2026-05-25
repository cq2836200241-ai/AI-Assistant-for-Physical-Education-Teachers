import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRef, useEffect, useState } from 'react';

interface LessonPlanViewerProps {
  content: string;
  title?: string;
  grades?: string[];
  zoom?: number;
  editable?: boolean;
  onContentChange?: (newContentText: string) => void;
}

export function LessonPlanViewer({ content, title, grades, zoom = 1, editable = false, onContentChange }: LessonPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(content);

  // 同步外部 content 到本地状态
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // 编辑模式下自动聚焦
  useEffect(() => {
    if (editable && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editable]);

  // 使用传入的 zoom prop，不再独立计算缩放——由父组件 PreviewPanel 统一管理
  const effectiveZoom = zoom;

  if (editable) {
    return (
      <div
        ref={containerRef}
        className="flex-1 w-full flex justify-center items-start overflow-auto p-2 sm:p-4 md:p-8"
      >
        <div
          id="lesson-plan"
          style={{ zoom: effectiveZoom }}
          className="w-full max-w-[794px] min-h-[700px] sm:min-h-[1123px] h-fit bg-white shadow-lg ring-4 ring-primary-500 shadow-2xl z-10 px-[12mm] sm:px-[16mm] md:px-[20mm] py-[15mm] sm:py-[20mm] md:py-[25mm] transition-all duration-500"
        >
          <div className="flex items-center gap-2 mb-4 text-sm text-primary-600 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
            正在编辑 Markdown 源码（请保留 #、** 等 Markdown 标记）
          </div>
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={(e) => {
              setLocalContent(e.target.value);
              if (onContentChange) {
                onContentChange(e.target.value);
              }
            }}
            className="w-full h-[800px] min-h-[70vh] p-4 border-2 border-primary-200 rounded-xl font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 bg-slate-50"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full flex justify-center items-start overflow-auto p-2 sm:p-4 md:p-8"
    >
      <div
        id="lesson-plan"
        style={{ zoom: effectiveZoom }}
        className={`w-full max-w-[794px] min-h-[700px] sm:min-h-[1123px] h-fit bg-white shadow-lg ring-1 ring-slate-900/5 px-[12mm] sm:px-[16mm] md:px-[20mm] py-[15mm] sm:py-[20mm] md:py-[25mm] transition-all duration-500 opacity-100`}
      >
        <div
          className={`prose prose-sm sm:prose-base prose-slate prose-h2:text-[16px] sm:prose-h2:text-[18px] prose-h2:font-bold prose-h2:text-slate-800 prose-h2:border-b-2 prose-h2:border-slate-200 prose-h2:pb-2 prose-h2:mt-6 sm:prose-h2:mt-8 prose-h2:mb-3 sm:prose-h2:mb-4 prose-h3:text-[17px] sm:prose-h3:text-[19px] prose-h3:font-[SimSun,STSong,serif] prose-h3:font-bold prose-h3:text-slate-800 prose-h4:text-[17px] sm:prose-h4:text-[19px] prose-h4:font-[SimSun,STSong,serif] prose-h4:font-bold prose-h4:text-slate-800 prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-slate-300 prose-th:border prose-th:border-slate-300 prose-th:bg-slate-50 prose-th:px-2 sm:prose-th:px-3 prose-th:py-1.5 sm:prose-th:py-2 prose-td:border prose-td:border-slate-300 prose-td:px-2 sm:prose-td:px-3 prose-td:py-1.5 sm:prose-td:py-2 max-w-none markdown-body outline-none transition-all`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const headingText = String(children);
                const sectionClasses = [
                  headingText.includes('课题名称') ? 'section-topic' : '',
                  headingText.includes('反思') ? 'section-reflection' : '',
                ].filter(Boolean).join(' ');
                return <h2 className={sectionClasses}>{children}</h2>
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
