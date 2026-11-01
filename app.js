const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || 'v1';

app.get('/', (req, res) => {
  if (VERSION === 'v2' && Math.random() < 0.5) {
    return res.status(500).send('Internal Server Error (Simulated Failure in V2)');
  }
  res.send(Application Version: ${VERSION});
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(PORT, () => console.log(App running version ${VERSION} on port ${PORT}));
