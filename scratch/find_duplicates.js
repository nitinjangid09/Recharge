
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Desktop\\Recharge\\src\\constants\\Colors.js', 'utf8');

// Simple regex to find hex codes and their variables
const lines = content.split('\n');
const colorMap = {};
const keyMap = {};

lines.forEach((line, index) => {
    const match = line.match(/^\s*(\w+):\s*["'](#[\w\d]+)["']/);
    if (match) {
        const key = match[1];
        const value = match[2].toUpperCase();
        if (!colorMap[value]) colorMap[value] = [];
        colorMap[value].push(key);
        keyMap[key] = value;
    }
});

console.log("Duplicate values:");
for (const [value, keys] of Object.entries(colorMap)) {
    if (keys.length > 1) {
        console.log(`${value}: ${keys.join(', ')}`);
    }
}

const keys = lines.map(l => l.match(/^\s*(\w+):/)).filter(m => m).map(m => m[1]);
const duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
console.log("\nDuplicate keys:");
console.log([...new Set(duplicates)].join(', '));
