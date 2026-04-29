const { SagepondClient } = require('./dist/index.js');

const client = new SagepondClient({
    apiKey: process.env.SP_KEY
});

// Test with a dummy file if you want to run this locally:
// fs.writeFileSync('test.txt', 'This is a test sentence. This is another one.');

client.processFile('train_text.txt', 'tokenize')

