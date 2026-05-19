/**
 * 体育教案 PDF 导出组件 v3
 * 使用 marked + html2pdf.js 实现 Markdown 转 PDF
 */

import React, { useCallback } from "react";
import { marked } from "marked";

// HTML 实体常量（避免被格式化工具转义）
const AMP = String.fromCharCode(38) + "amp;";
const LT = String.fromCharCode(38) + "lt;";
const GT = String.fromCharCode(38) + "gt;";
const QUOT = String.fromCharCode(38) + "quot;";
const APOS = String.fromCharCode(38) + "#039;";

// ─── Markdown → HTML ──────────────────────────────
function renderMarkdownToHtml(content: string): string {
  const html = marked.parse(content, { async: false }) as string;
  return html
    .replace(/<table>/g, '<table class="pdf-table">')
    .replace(/<h1>/g, '<h1 class="pdf-h1">')
    .replace(/<h2>/g, '<h2 class="pdf-h2">')
    .replace(/<h3>/g, '<h3 class="pdf-h3">')
    .replace(/<h4>/g, '<h4 class="pdf-h4">')
    .replace(/<ul>/g, '<ul class="pdf-ul">')
    .replace(/<ol>/g, '<ol class="pdf-ol">');
}

// ─── 构建完整 HTML 文档 ────────────────────────────
function buildPdfHtml(
  contentHtml: string,
  title: string,
  grades: string[]
): string {
  const gradeStr = grades.length > 0 ? grades.join("\u3001") : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page {
    margin: 15mm;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    width: 210mm;
    padding: 40px;
    font-size: 14px;
    line-height: 1.8;
    color: #1a1a1a;
    background: #ffffff;
  }
  .pdf-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    margin-bottom: 16px;
    border-bottom: 2px solid #1a7a5e;
  }
  .pdf-header-title {
    font-size: 16px;
    font-weight: bold;
    color: #1a7a5e;
  }
  .pdf-header-sub {
    font-size: 12px;
    color: #888;
  }
  .pdf-h1 {
    font-size: 18px;
    color: #1a7a5e;
    margin-top: 16px;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid #1a7a5e;
  }
  .pdf-h2 {
    font-size: 16px;
    color: #1a7a5e;
    margin-top: 14px;
    margin-bottom: 6px;
    padding-bottom: 3px;
    border-bottom: 1.5px solid #ddd;
  }
  .pdf-h3 {
    font-size: 15px;
    color: #333;
    margin-top: 10px;
    margin-bottom: 4px;
  }
  .pdf-h4 {
    font-size: 14px;
    font-weight: bold;
    color: #333;
    margin-top: 8px;
    margin-bottom: 3px;
  }
  p {
    margin-bottom: 6px;
  }
  .pdf-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 13px;
  }
  .pdf-table th,
  .pdf-table td {
    border: 1px solid #ccc;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  .pdf-table th {
    background-color: #1a7a5e;
    color: #ffffff;
    font-weight: bold;
  }
  .pdf-table tr:nth-child(even) {
    background-color: #f9fafb;
  }
  .pdf-table tr:nth-child(odd) {
    background-color: #ffffff;
  }
  .pdf-ul, .pdf-ol {
    padding-left: 24px;
    margin-bottom: 6px;
  }
  .pdf-ul li {
    list-style-type: disc;
    color: #1a1a1a;
  }
  .pdf-ul li::marker {
    color: #1a7a5e;
  }
  .pdf-ol li {
    list-style-type: decimal;
  }
  hr {
    border: none;
    border-top: 1px solid #eee;
    margin: 8px 0;
  }
  .pdf-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 11px;
    color: #aaa;
    padding: 8px 40px;
    border-top: 1px solid #eee;
  }
  .page-break {
    page-break-after: always;
  }
  strong, b {
    font-weight: bold;
  }
</style>
</head>
<body>
  <div class="pdf-header">
    <span class="pdf-header-title">${escapeHtml("\u4f53\u80b2\u6559\u6848\u52a9\u624b \u00b7 " + title)}</span>
    <span class="pdf-header-sub">${escapeHtml(gradeStr)}</span>
  </div>
  ${contentHtml}
  <div class="pdf-footer">${escapeHtml("\u4f53\u80b2\u6559\u6848\u52a9\u624b \u81ea\u52a8\u751f\u6210")}</div>
</body>
</html>`;
}

// ─── HTML 转义 ────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/[&]/g, () => AMP)
    .replace(/[<]/g, () => LT)
    .replace(/[>]/g, () => GT)
    .replace(/["]/g, () => QUOT)
    .replace(/[']/g, () => APOS);
}

// ─── 导出按钮组件 ──────────────────────────────────
interface PdfExportButtonProps {
  content: string;
  title?: string;
  grades?: string[];
  className?: string;
}

const PdfExportButton: React.FC<PdfExportButtonProps> = ({
  content,
  title = "\u6559\u6848",
  grades = [],
  className,
}) => {
  const handleExport = useCallback(async () => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const contentHtml = renderMarkdownToHtml(content);
      const fullHtml = buildPdfHtml(contentHtml, title, grades);

      const container = document.createElement("div");
      container.innerHTML = fullHtml;
      document.body.appendChild(container);

      const gradeStr = grades.length > 0 ? grades[0] : "";
      const fileName = `${gradeStr}_${title}_\u6559\u6848.pdf`;

      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: fileName,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
        pagebreak: { mode: ["avoid-all" as const, "css" as const, "legacy" as const] },
      };

      await html2pdf().set(opt).from(container).save();

      document.body.removeChild(container);
    } catch (error) {
      console.error("PDF \u5bfc\u51fa\u5931\u8d25:", error);
      alert("PDF \u5bfc\u51fa\u5931\u8d25\uff0c\u8bf7\u67e5\u770b\u63a7\u5236\u53f0\u9519\u8bef\u4fe1\u606f\u3002");
    }
  }, [content, title, grades]);

  return (
    <button
      onClick={handleExport}
      className={
        className ||
        "inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      }
    >
      {"\u5bfc\u51fa PDF"}
    </button>
  );
};

export { PdfExportButton };
export default PdfExportButton;
