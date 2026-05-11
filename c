/**
 * PDF 导出工具
 * 
 * 使用 html2canvas + jsPDF 将教案内容导出为 PDF
 * 
 * 工作原理：
 * 1. 获取 DOM 元素（#lesson-plan）
 * 2. 从 CSSOM 中临时移除 html2canvas 不支持的 CSS 规则（oklab）
 * 3. 使用 html2canvas 截图
 * 4. 恢复被移除的 CSS 规则
 * 5. 使用 jsPDF 将截图放入 A4 纸张
 * 
 * 已知兼容性问题：
 * - html2canvas 1.4.1 不支持 CSS oklab 颜色函数
 *   Tailwind CSS v4 preflight 的 ::placeholder 使用了
 *   color: color-mix(in oklab, currentcolor 50%, transparent);
 *   html2canvas 解析到这条规则时会直接报错崩溃
 * 
 * 适用于：Web / PWA / Electron / APK 所有环境
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfExportOptions {
  title?: string;
  margin?: [number, number, number, number] | [number, number] | number;
  imageQuality?: number;
  scale?: number;
}

/**
 * html2canvas 1.4.1 不支持 CSS oklab 颜色函数。
 * 
 * Tailwind CSS v4 preflight 中包含以下规则：
 *   @supports (...) {
 *     ::placeholder { color: color-mix(in oklab, currentcolor 50%, transparent); }
 *   }
 * 
 * html2canvas 解析这条规则时，遇到 oklab 色彩空间直接报错。
 * 
 * 此函数遍历所有样式表，临时移除包含 oklab 的 CSS 规则，
 * 并返回一个恢复函数，截图后还原。
 */
function removeOklabRules(): () => void {
  const patches: Array<{
    sheet: CSSStyleSheet;
    ruleIndex: number;
    parentRule: CSSGroupingRule | null;
    cssText: string;
  }> = [];

  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;

      for (let j = rules.length - 1; j >= 0; j--) {
        const rule = rules[j];

        // 1️⃣ 直接检查 CSSStyleRule 的 color 属性
        if (rule instanceof CSSStyleRule) {
          const colorVal = rule.style.getPropertyValue('color');
          if (colorVal && (colorVal.includes('oklab') || colorVal.includes('oklch') || colorVal.includes('lab(') || colorVal.includes('lch('))) {
            const cssText = rule.cssText;
            try {
              sheet.deleteRule(j);
              patches.push({ sheet, ruleIndex: j, parentRule: null, cssText });
            } catch (e) {
              // 某些规则可能无法删除
            }
            continue;
          }
        }

        // 2️⃣ 检查组规则（如 @supports、@media）内的子规则
        if (rule instanceof CSSGroupingRule) {
          const groupRules = rule.cssRules;
          if (!groupRules) continue;

          for (let k = groupRules.length - 1; k >= 0; k--) {
            const subRule = groupRules[k];
            if (subRule instanceof CSSStyleRule) {
              const colorVal = subRule.style.getPropertyValue('color');
              if (colorVal && (colorVal.includes('oklab') || colorVal.includes('oklch') || colorVal.includes('lab(') || colorVal.includes('lch('))) {
                const cssText = subRule.cssText;
                try {
                  rule.deleteRule(k);
                  patches.push({ sheet, ruleIndex: k, parentRule: rule as CSSGroupingRule, cssText });
                } catch (e) {
                  // 忽略删除失败
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // 跨域样式表无法访问，忽略
    }
  }

  return () => {
    for (const patch of patches) {
      try {
        if (patch.parentRule) {
          // 恢复到 @supports 组规则中
          patch.parentRule.insertRule(patch.cssText, patch.ruleIndex);
        } else {
          // 恢复到顶层样式表中
          patch.sheet.insertRule(patch.cssText, patch.ruleIndex);
        }
      } catch (e) {
        console.warn('恢复 CSS 规则失败:', e);
      }
    }
  };
}

/**
 * 直接下载 PDF 文件 - 所见即所得
 * 
 * 获取 DOM 中的 #lesson-plan 元素，
 * 使用 html2canvas 截图后用 jsPDF 输出为 A4 PDF
 */
export async function downloadLessonPlanPdf(
  filename: string = '体育教案',
  elementId: string = 'lesson-plan',
  options: PdfExportOptions = {}
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('PDF 导出失败：未找到教案内容元素 #' + elementId);
    return false;
  }

  const {
    margin = [15, 15, 15, 15],
    imageQuality = 0.95,
    scale = 2,
  } = options;

  // 保存原始样式
  const originalStyle = element.getAttribute('style') || '';
  // 临时移除 transform/zoom 以确保完整截图
  element.setAttribute('style', originalStyle + '; transform: none !important; zoom: 1 !important;');

  // 从 CSSOM 中临时移除包含 oklab 的规则
  const restoreRules = removeOklabRules();

  try {
    // 使用 html2canvas 截图
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/jpeg', imageQuality);

    // A4 尺寸：210mm x 297mm
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 计算图片在 PDF 中的尺寸（考虑边距）
    const marginTop = Array.isArray(margin) ? (margin.length === 4 ? margin[0] : margin[0]) : margin;
    const marginBottom = Array.isArray(margin) ? (margin.length === 4 ? margin[2] : margin[0]) : margin;
    const marginLeft = Array.isArray(margin) ? (margin.length === 4 ? margin[1] : margin[0]) : margin;
    const marginRight = Array.isArray(margin) ? (margin.length === 4 ? margin[3] : margin[0]) : margin;

    const availableWidth = pdfWidth - marginLeft - marginRight;
    const availableHeight = pdfHeight - marginTop - marginBottom;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // 计算缩放比例，使图片适应可用区域
    const ratio = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);
    const imgWidth = canvasWidth * ratio;
    const imgHeight = canvasHeight * ratio;

    // 居中放置
    const xOffset = marginLeft + (availableWidth - imgWidth) / 2;
    const yOffset = marginTop;

    // 如果内容超过一页，需要分页
    if (imgHeight <= availableHeight) {
      // 一页就能放下
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
    } else {
      // 需要分页：按 A4 可用高度切割 canvas
      const pageCanvasHeight = availableHeight / ratio;
      let totalHeight = 0;
      let pageNum = 0;

      while (totalHeight < canvasHeight) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        const currentPageHeight = Math.min(pageCanvasHeight, canvasHeight - totalHeight);
        // 从 canvas 中截取当前页对应的部分
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = currentPageHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, totalHeight, canvasWidth, currentPageHeight, 0, 0, canvasWidth, currentPageHeight);
        }

        const pageImgData = pageCanvas.toDataURL('image/jpeg', imageQuality);
        const pageImgHeight = currentPageHeight * ratio;

        pdf.addImage(pageImgData, 'JPEG', xOffset, yOffset, imgWidth, pageImgHeight);

        totalHeight += currentPageHeight;
        pageNum++;
      }
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF 下载失败:', error);
    return false;
  } finally {
    element.setAttribute('style', originalStyle);
    restoreRules();
  }
}
