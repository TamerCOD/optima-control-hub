import fs from 'fs';
import path from 'path';

function walk(dir: string) {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace p-3 with p-2
    content = content.replace(/\bp-3\b/g, 'p-2');
    content = content.replace(/\bmd:p-3\b/g, 'md:p-2');
    content = content.replace(/\bsm:p-3\b/g, 'sm:p-2');
    content = content.replace(/\blg:p-3\b/g, 'lg:p-2');
    content = content.replace(/\bxl:p-3\b/g, 'xl:p-2');

    // Replace p-4 with p-3
    content = content.replace(/\bp-4\b/g, 'p-3');
    content = content.replace(/\bmd:p-4\b/g, 'md:p-3');
    content = content.replace(/\bsm:p-4\b/g, 'sm:p-3');
    content = content.replace(/\blg:p-4\b/g, 'lg:p-3');
    content = content.replace(/\bxl:p-4\b/g, 'xl:p-3');

    // Replace p-5 with p-4
    content = content.replace(/\bp-5\b/g, 'p-4');
    content = content.replace(/\bmd:p-5\b/g, 'md:p-4');
    content = content.replace(/\bsm:p-5\b/g, 'sm:p-4');
    content = content.replace(/\blg:p-5\b/g, 'lg:p-4');
    content = content.replace(/\bxl:p-5\b/g, 'xl:p-4');

    // Replace p-6 with p-4
    content = content.replace(/\bp-6\b/g, 'p-4');
    content = content.replace(/\bmd:p-6\b/g, 'md:p-4');
    content = content.replace(/\bsm:p-6\b/g, 'sm:p-4');
    content = content.replace(/\blg:p-6\b/g, 'lg:p-4');
    content = content.replace(/\bxl:p-6\b/g, 'xl:p-4');

    // Replace p-8 with p-6
    content = content.replace(/\bp-8\b/g, 'p-6');
    content = content.replace(/\bmd:p-8\b/g, 'md:p-6');
    content = content.replace(/\bsm:p-8\b/g, 'sm:p-6');
    content = content.replace(/\blg:p-8\b/g, 'lg:p-6');
    content = content.replace(/\bxl:p-8\b/g, 'xl:p-6');

    // Replace p-10 with p-8
    content = content.replace(/\bp-10\b/g, 'p-8');
    content = content.replace(/\bmd:p-10\b/g, 'md:p-8');
    content = content.replace(/\bsm:p-10\b/g, 'sm:p-8');
    content = content.replace(/\blg:p-10\b/g, 'lg:p-8');
    content = content.replace(/\bxl:p-10\b/g, 'xl:p-8');

    // Replace p-4 with p-3 (maybe too small?)
    // Let's just do p-8 -> p-6 and p-6 -> p-4.
    
    fs.writeFileSync(file, content, 'utf8');
});

console.log('Replacement complete.');
