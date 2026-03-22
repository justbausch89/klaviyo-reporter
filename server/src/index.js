require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const accountRouter = require('./routes/account');
const campaignsRouter = require('./routes/campaigns');
const flowsRouter = require('./routes/flows');
const deliverabilityRouter = require('./routes/deliverability');
const metricsRouter = require('./routes/metrics');
const segmentsRouter = require('./routes/segments');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', limiter);

app.use('/api/account', accountRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/deliverability', deliverabilityRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/segments', segmentsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Klaviyo Reporter API running on port ${PORT}`);
  if (!process.env.KLAVIYO_PRIVATE_KEY) {
    console.warn('WARNING: KLAVIYO_PRIVATE_KEY is not set in .env');
  }
});
