const fs = require('fs');
const path = require('path');

const notesDir = path.join(__dirname, 'notes');

// Ensure notes directory exists
if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir);
}

const notes = [];

// Read all files in notes directory
const files = fs.readdirSync(notesDir);

files.forEach(file => {
    if (path.extname(file) === '.md') {
        const filePath = path.join(notesDir, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');

        // Generate an ID (you can modify this logic as needed)
        const id = file.replace('.md', '');

        notes.push({
            id: id,
            content: content,
            mtime: stats.mtimeMs
        });
    }
});

// Write notes.json
const outputPath = path.join(__dirname, 'notes.json');
fs.writeFileSync(outputPath, JSON.stringify({ notes: notes }, null, 2));
console.log(`Generated notes.json with ${notes.length} notes.`);
