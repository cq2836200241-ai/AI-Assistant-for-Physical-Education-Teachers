/**
 * 将 Markdown 内容转换为 Word 文档
 * 
 * 方案：生成带完整样式的 HTML 文件，保存为 .doc 扩展名
 * Word 可以原生打开 HTML 文件，并保留所有 CSS 样式（字体、颜色、表格、边距等）
 * 这是目前浏览器端生成 Word 文档最可靠的方式
 */
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import remarkGfm from 'remark-gfm';

const AMP = '&' + 'amp;';

/**
 * 将 Markdown 文本转换为带完整样式的 HTML 字符串
 */
function markdownToHtml(markdown: string): string {
  const result = remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .processSync(markdown);

  return result.toString();
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': AMP,
    '<': '&' + 'lt;',
    '>': '&' + 'gt;',
    '"': '&' + 'quot;',
    "'": '&#' + '039;',
  };
  return text.replace(/[&<>"']/g, (ch) => map[ch]);
}

/**
 * 构建完整的 HTML 文档（包含符合 Word 兼容的 CSS 样式）
 * 
 * Word 支持以下 CSS 特性：
 * - @page 控制页面尺寸和边距
 * - 标准 CSS 字体、颜色、边框
 * - table 的 border-collapse
 * - @media print 分页控制
 */
function buildFullHtml(htmlContent: string, title: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  /* 页面设置 - Word 兼容 */
  @page {
    size: A4;
    margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    mso-page-orientation: portrait;
  }

  body {
    font-family: '宋体', 'SimSun', 'STSong', serif;
    font-size: 12pt;
    line-height: 1.8;
    color: #1e293b;
  }

  /* 标题样式 */
  h1 {
    font-size: 22pt;
    font-weight: bold;
    text-align: center;
    color: #1e293b;
    margin-top: 20pt;
    margin-bottom: 16pt;
    border-bottom: 2px solid #cbd5e1;
    padding-bottom: 8pt;
  }

  h2 {
    font-size: 18pt;
    font-weight: bold;
    color: #1e293b;
    margin-top: 18pt;
    margin-bottom: 12pt;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6pt;
  }

  h3 {
    font-size: 16pt;
    font-weight: bold;
    color: #334155;
    margin-top: 14pt;
    margin-bottom: 10pt;
  }

  h4 {
    font-size: 14pt;
    font-weight: bold;
    color: #475569;
    margin-top: 12pt;
    margin-bottom: 8pt;
  }

  /* 段落 - 首行缩进2字符 */
  p {
    margin: 6pt 0;
    text-indent: 2em;
  }

  /* 表格样式 - 完全兼容 Word */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
    font-size: 10.5pt;
  }

  th {
    background-color: #f8fafc;
    border: 1px solid #94a3b8;
    padding: 6pt 8pt;
    font-weight: bold;
    text-align: center;
  }

  td {
    border: 1px solid #94a3b8;
    padding: 5pt 8pt;
    text-align: left;
  }

  /* 列表 */
  ul, ol {
    margin: 6pt 0;
    padding-left: 24pt;
  }

  li {
    margin: 3pt 0;
  }

  /* 加粗和斜体 */
  strong { font-weight: bold; }
  em { font-style: italic; }

  /* 代码块 */
  code {
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    background-color: #f1f5f9;
    padding: 1pt 4pt;
  }

  pre {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 10pt;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
  }

  pre code { background: none; padding: 0; }

  hr {
    border: none;
    border-top: 1px solid #cbd5e1;
    margin: 16pt 0;
  }

  blockquote {
    border-left: 4px solid #94a3b8;
    margin: 10pt 0;
    padding: 6pt 12pt;
    color: #64748b;
    background-color: #f8fafc;
  }

  a {
    color: #2563eb;
    text-decoration: underline;
  }

  /* 打印/分页控制 */
  .page-break {
    page-break-after: always;
  }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

/**
 * 将 Markdown 内容导出为 Word 文档的 Blob
 * 
 * 使用 HTML 格式保存为 .doc 文件
 * Word/WPS 都能完美打开，保留所有样式、表格、颜色
 */
export async function exportMarkdownToWord(
  markdownContent: string,
  title: string = '体育教案'
): Promise<Blob> {
  // 1. 将 Markdown 转换为 HTML
  const htmlContent = markdownToHtml(markdownContent);

  // 2. 构建带样式的完整 HTML 文档（包含 Word 兼容标记）
  const fullHtml = buildFullHtml(htmlContent, title);

  // 3. 将 HTML 内容编码为 Blob
  // 使用 application/msword MIME 类型 + .doc 扩展名
  // Word 会将其识别为 Word 文档并保留 HTML 渲染效果
  const blob = new Blob([fullHtml], {
    type: 'application/msword',
  });

  return blob;
}
