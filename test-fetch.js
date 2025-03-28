const fetch = require('node-fetch');
console.log('fetch:', fetch);
fetch('https://api.openai.com/v1/chat/completions')
  .then(res => console.log('Status:', res.status))
  .catch(err => console.error('Error:', err));