const fs = require('fs');
const path = require('path');

// 用 JSON 字符串解析方式构建数据，避免单引号转义问题
const jsonStr = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'lesson_plans_seed_v2.json'), 'utf8');

// 读取当前文件，检查是否完整
try {
  const parsed = JSON.parse(jsonStr);
  console.log('JSON is valid, items:', parsed.length);
} catch(e) {
  console.log('JSON is invalid:', e.message);
  console.log('File size:', fs.statSync(path.join(__dirname, '..', 'src', 'data', 'lesson_plans_seed_v2.json')).size);
}
