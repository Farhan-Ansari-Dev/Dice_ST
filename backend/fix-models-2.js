const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/\([a-zA-Z]+Schema as any\)\.pre\(\/\^find\/, function \(this: any, next: any\) \{/g, (match) => {
    return match.replace(/\([a-zA-Z]+Schema as any\)\./, (m) => m.replace(/\(?(.*) as any\)?\./, '$1.')).replace(', next: any', '');
  });

  content = content.replace(/if \(!this\.getOptions\(\)\.includeDeleted\) \{\n\s*this\.where\(\{ deleted_at: null \}\);\n\s*\}\n\s*next\(\);\n\}\);/g, (match) => {
    return `if (!this.getOptions().includeDeleted) {\n    this.where({ deleted_at: null });\n  }\n});`;
  });

  content = content.replace(/next\(\);\n\}\);/g, '});');

  fs.writeFileSync(filePath, content, 'utf8');
});

console.log("Fixed all models.");
