const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');

dotenv.config();

const REQUIRED_ENV = [
  'JWT_SECRET',
  'ADMIN_KEY',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
  'MINIO_PUBLIC_URL'
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} não está definido. Configure-o no .env antes de iniciar o servidor.`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); // confiar no X-Forwarded-* do Traefik
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/digitalcard')
.then(() => {
  console.log('MongoDB connected');
  // Resumo mensal por e-mail (verifica de hora em hora; envia no dia 1 após 9h).
  require('./services/monthlyReport').startMonthlyReportScheduler();
})
.catch(err => console.log('MongoDB connection error:', err));

// Saúde do serviço (monitor de disponibilidade, ex.: UptimeRobot).
// 200 = API e banco no ar; 503 = banco desconectado.
app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ ok: dbUp, db: dbUp ? 'up' : 'down', uptime: Math.round(process.uptime()) });
});

// Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
