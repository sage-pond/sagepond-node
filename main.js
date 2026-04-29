const { SagepondClient } = require('./dist/index.js');

const client = new SagepondClient({
    apiKey: process.env.SP_KEY
});

// Test with a dummy file if you want to run this locally:
// fs.writeFileSync('test.txt', 'This is a test sentence. This is another one.');

client.processFile('train_text.txt', 'tokenize')
    .then(results => {
        console.log('Processed results:', JSON.stringify(results, null, 2));
    })
    .catch(err => {
        // If test.txt doesn't exist, this will catch the error
        console.error('An error occurred:', err.message);
        if (err.stack) {
            console.error(err.stack);
        }
    });
