const fs = require('fs');
const path = require('path');

console.log('--- Checking Env Keys ---');
console.log('process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'FOUND (length ' + process.env.GEMINI_API_KEY.length + ')' : 'NOT FOUND');
console.log('process.env.GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'FOUND (length ' + process.env.GOOGLE_API_KEY.length + ')' : 'NOT FOUND');
console.log('process.env.GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? 'FOUND (length ' + process.env.GOOGLE_GENAI_API_KEY.length + ')' : 'NOT FOUND');
console.log('process.env.ANTIGRAVITY_GEMINI_KEY:', process.env.ANTIGRAVITY_GEMINI_KEY ? 'FOUND' : 'NOT FOUND');
