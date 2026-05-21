const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const apiRoutes = require('./routes/api');

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não está definido. Configure-o no .env antes de iniciar o servidor.');
  process.exit(1);
}
if (!process.env.ADMIN_KEY) {
  console.error('FATAL: ADMIN_KEY não está definido. Configure-o no .env antes de iniciar o servidor.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); // confiar no X-Forwarded-* do Traefik
app.use(cors());
app.use(express.json());
// Uploads ficam sob /api pra Traefik rotear tudo do backend num PathPrefix só
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/digitalcard')
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
