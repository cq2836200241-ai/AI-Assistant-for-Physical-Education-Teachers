/**
 * PDF 导出工具
 * 使用浏览器原生打印，输出矢量 PDF，文字清晰可搜索。
 * 打印样式定义在 src/styles/print.css。
 */
export function downloadLessonPlanPdf(): void {
  window.print();
}
