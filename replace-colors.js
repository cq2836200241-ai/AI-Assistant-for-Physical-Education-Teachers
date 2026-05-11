const fs = require('fs');
const files = [
  'src/App.tsx',
  'src/components/SettingsModal/SettingsModal.tsx',
  'src/components/ConfigPanel/ConfigPanel.tsx',
  'src/components/PreviewPanel/PreviewPanel.tsx',
  'src/components/HistoryDrawer/HistoryDrawer.tsx',
  'src/components/AuthScreen/AuthScreen.tsx',
  'src/components/AuthScreen/AuthWrapper.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/teal/g, 'primary').replace(/emerald-500/g, 'secondary-500');
  fs.writeFileSync(file, content);
}
console.log('Colors replaced successfully!');
