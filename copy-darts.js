const fs = require('fs');
const path = require('path');

const srcRed = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\66dc8312-3777-4ba1-a166-3ce8ac7d963d\\red_dart_1772498352462.png';
const srcGreen = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\66dc8312-3777-4ba1-a166-3ce8ac7d963d\\green_dart_1772498368027.png';
const destRed = path.join(__dirname, 'public', 'red_dart.png');
const destGreen = path.join(__dirname, 'public', 'green_dart.png');
const destFavicon = path.join(__dirname, 'public', 'favicon.ico');

fs.copyFileSync(srcRed, destRed);
fs.copyFileSync(srcGreen, destGreen);
fs.copyFileSync(srcRed, destFavicon);

console.log('Images copied successfully.');
