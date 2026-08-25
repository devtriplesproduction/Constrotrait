/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    if (!/<input\b/.test(content)) return;

    if (filepath.endsWith(path.join('components', 'ui', 'input.tsx'))) return;

    let newContent = content.replace(/<input\b/g, '<Input');
    newContent = newContent.replace(/<\/input>/g, '</Input>');

    if (!newContent.includes('import { Input }')) {
        const importRegex = /^import\s+.*?;?\s*$/gm;
        let match;
        let lastMatch;
        while ((match = importRegex.exec(newContent)) !== null) {
            lastMatch = match;
        }

        const importStatement = '\nimport { Input } from "@/components/ui/input";';
        if (lastMatch) {
            const insertPos = lastMatch.index + lastMatch[0].length;
            newContent = newContent.slice(0, insertPos) + importStatement + newContent.slice(insertPos);
        } else {
            newContent = importStatement.trim() + '\n' + newContent;
        }
    }

    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`Updated ${filepath}`);
}

function walkSync(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        var filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walkSync(filepath, callback);
        } else if (stats.isFile() && (file.endsWith('.tsx') || file.endsWith('.jsx'))) {
            callback(filepath);
        }
    });
}

walkSync(path.join(process.cwd(), 'src'), processFile);
