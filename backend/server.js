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
// A chave de admin dá acesso total ao /gestao e é testável pela internet:
// curta demais pode ser adivinhada. Não derruba o servidor, só avisa.
if (process.env.ADMIN_KEY.length < 32) {
  console.warn('AVISO: ADMIN_KEY tem menos de 32 caracteres. Gere uma chave forte, ex.: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); // confiar no X-Forwarded-* do Traefik

// A rede traefik9 é compartilhada com outros projetos: um contêiner vizinho
// pode chamar o backend direto e inventar o X-Forwarded-For, burlando os
// limites por IP (login, cadastro...). Com PROXY_SECRET definido, o Traefik
// injeta o cabeçalho X-Adapter-Proxy (ver docker-compose.yml) e só pedidos
// com ele têm o X-Forwarded-For aceito; os demais contam pelo IP de conexão.
const PROXY_SECRET = process.env.PROXY_SECRET || '';
if (PROXY_SECRET) {
  const crypto = require('crypto');
  const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();
  const expected = digest(PROXY_SECRET);
  app.use((req, res, next) => {
    const got = req.headers['x-adapter-proxy'];
    delete req.headers['x-adapter-proxy'];
    if (typeof got !== 'string' || !crypto.timingSafeEqual(digest(got), expected)) {
      delete req.headers['x-forwarded-for'];
    }
    next();
  });
} else {
  console.warn('AVISO: PROXY_SECRET não definido. Contêineres na rede traefik9 podem falsificar o IP (X-Forwarded-For) e burlar os limites por IP.');
}
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
