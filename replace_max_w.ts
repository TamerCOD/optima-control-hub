import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
                callback(dirPath);
            }
        }
    });
}

const replacements = [
    { from: /max-w-7xl/g, to: 'w-full' },
    { from: /max-w-6xl/g, to: 'w-full' },
    { from: /max-w-5xl/g, to: 'w-full' },
    { from: /max-w-4xl/g, to: 'w-full' },
    { from: /max-w-3xl/g, to: 'w-full' },
    { from: /max-w-2xl/g, to: 'w-full' },
];

walkDir('./src', (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    replacements.forEach(r => {
        content = content.replace(r.from, r.to);
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
});
