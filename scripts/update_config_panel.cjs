const fs = require('fs');
const file = 'c:\\Users\\刘猜\\Desktop\\练手1.0教案系统\\src\\components\\ConfigPanel\\ConfigPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// The modal starts at <Dialog open={showPreviewModal}
const splitIndex = content.indexOf('<Dialog open={showPreviewModal}');
let accordionPart = content.substring(0, splitIndex);
let modalPart = content.substring(splitIndex);

// 1. Panel Base Class
accordionPart = accordionPart.replace(
  "'px-4 pb-3 pt-2 space-y-3 rounded-[20px] border-t border-white/14 bg-white/94 text-slate-900'",
  "'px-4 pb-3 pt-2 space-y-3 rounded-[20px] border-t border-white/30 bg-white/15 backdrop-blur-xl text-white'"
);

// 2. Toggles
accordionPart = accordionPart.replace(
  /: 'text-\[14px\] border-slate-200 text-slate-600 hover:bg-slate-50'/g,
  ": 'text-[14px] border-white/20 bg-white/10 text-white hover:bg-white/20'"
);

// 3. Labels and borders
accordionPart = accordionPart.replace(/text-slate-500/g, 'text-white/90');
accordionPart = accordionPart.replace(/text-slate-600/g, 'text-white/80');
accordionPart = accordionPart.replace(/text-slate-700/g, 'text-white/90');
accordionPart = accordionPart.replace(/border-slate-100/g, 'border-white/15');

// 4. Inputs, Selects, Textareas
accordionPart = accordionPart.replace(
  /bg-slate-50\/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary-500\/20/g,
  'bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:ring-0'
);
accordionPart = accordionPart.replace(
  /border-slate-200 focus:border-primary-600/g,
  'bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15'
);

// 5. Ghost buttons text (like 随机推荐)
// Since text-slate-500 became text-white/90
accordionPart = accordionPart.replace(
  /text-white\/90 hover:text-primary-600/g, 
  'text-white/70 hover:text-white hover:bg-white/10'
);

// 6. Weather buttons
// Since text-slate-600 became text-white/80
accordionPart = accordionPart.replace(
  /'text-white\/80 bg-slate-50'/g, 
  "'text-white bg-white/10 border-white/20 hover:bg-white/20'"
);

// 7. Fix any unwanted text-white/90 on error messages if any (no, error messages are rose-600)
// Switch label cursor-pointer
accordionPart = accordionPart.replace(
  /Label className="cursor-pointer text-\[13px\] font-normal"/g,
  'Label className="cursor-pointer text-[13px] font-normal text-white/90"'
);

fs.writeFileSync(file, accordionPart + modalPart);
console.log('Update complete.');
