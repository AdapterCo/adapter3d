const express = require('express');
const router = express.Router();
const multer = require('multer');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');
const googleReviewController = require('../controllers/googleReviewController');
const statsController = require('../controllers/statsController');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('../middleware/rateLimit');

// Uploads vão direto pro MinIO. Multer só parseia o multipart em memória.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB por arquivo
});

// Limites por IP contra força bruta de senha e enumeração de IDs de tag.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
});
const tagLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: 'Muitos cadastros a partir desta rede. Tente novamente mais tarde.'
});

// Auth Routes
router.post('/auth/login', loginLimiter, authController.login);
router.post('/auth/validate-tag', tagLimiter, authController.validateTag);
router.post('/auth/register', registerLimiter, authController.register);
router.get('/auth/me', auth, authController.getMe);

// Public Card Route (By Slug)
router.get('/users/slug/:slug', userController.getUserBySlug);

// Tag Redirect Route (Find slug by Tag ID)
// Limite generoso: é a rota que roda a cada leitura de NFC/QR, mas impede
// varrer milhares de IDs para descobrir quais tags existem.
router.get('/users/tag/:id', rateLimit({
  windowMs: 60 * 1000, max: 60,
  message: 'Muitas requisições. Tente novamente em instantes.'
}), userController.getUserByTagId);

// Protected User Update Route
router.put('/users/:id', auth, userController.updateUser);

// Upload Route (auth-protected — só usuários logados podem subir arquivos)
router.post('/upload', auth, upload.single('image'), userController.uploadImage);

// Avaliação Google: resolve link do Maps → link direto de avaliação (serviço externo).
// Limitado para não sobrecarregar o serviço de terceiros.
router.post('/google-review', auth, rateLimit({
  windowMs: 15 * 60 * 1000, max: 15,
  message: 'Muitas tentativas de gerar o link. Aguarde alguns minutos.'
}), googleReviewController.resolve);
router.delete('/google-review', auth, googleReviewController.remove);

// Estatísticas. /track é público (perfis enviam via sendBeacon como text/plain,
// que não exige preflight de CORS); /stats exige login do lojista.
router.post('/track', rateLimit({
  windowMs: 60 * 1000, max: 120,
  message: 'Muitas requisições.'
}), express.text({ type: 'text/plain', limit: '16kb' }), statsController.track);
router.get('/stats', auth, statsController.getStats);

// Admin Routes (protegidas por X-Admin-Key header — sem JWT)
router.post('/admin/tags', adminAuth, adminController.createTags);
router.get('/admin/tags', adminAuth, adminController.listTags);
router.delete('/admin/tags/:id', adminAuth, adminController.deleteTag);

module.exports = router;
