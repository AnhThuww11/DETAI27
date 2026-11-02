const express = require('express');
const client = require('prom-client');
const app = express();
const port = process.env.PORT || 3000;

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status']
});

let isErrorVersion = process.env.FAIL === 'true';

app.get('/', (req, res) => {
  if (isErrorVersion) {
    httpRequestCounter.inc({ method: 'GET', status: '500' });
    return res.status(500).send('V2 Error: Internal Server Error!');
  }
  httpRequestCounter.inc({ method: 'GET', status: '200' });
  res.send('Hello from Project DETAI27 - Version 1.0 (Healthy)');
});

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(port, () => console.log(`App running on port ${port}`));