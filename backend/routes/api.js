const express = require('express');
const router = express.Router();
const multer = require('multer');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');
const googleReviewController = require('../controllers/googleReviewController');
const statsController = require('../controllers/statsController');
const ogController = require('../controllers/ogController');
const billingController = require('../controllers/billingController');
const customerController = require('../controllers/customerController');
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

// Recuperação de senha (limites baixos: cada pedido dispara um e-mail).
router.post('/auth/forgot-password', rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: 'Muitos pedidos de recuperação. Tente novamente mais tarde.'
}), authController.forgotPassword);
router.post('/auth/reset-password', rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: 'Muitas tentativas. Aguarde alguns minutos.'
}), authController.resetPassword);

// Prévia de link (Open Graph) para WhatsApp/Instagram/Facebook. O nginx do
// frontend encaminha para cá só os robôs de prévia; pessoas recebem o SPA.
router.get('/og/tag/:id', ogController.byTag);
router.get('/og/:slug', ogController.bySlug);

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

// Lista de clientes (com consentimento). POST é público (carrinho); GET/DELETE do lojista.
router.post('/customers', rateLimit({
  windowMs: 60 * 60 * 1000, max: 30,
  message: 'Muitas requisições.'
}), customerController.register);
router.get('/customers', auth, customerController.list);
router.delete('/customers/:id', auth, customerController.remove);

// Assinaturas (cardápio/vitrine) via Mercado Pago.
router.get('/billing/prices', billingController.prices);
router.post('/billing/signup', rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: 'Muitas tentativas de cadastro. Tente novamente mais tarde.'
}), billingController.signup);
router.get('/billing/me', auth, billingController.me);
router.post('/billing/subscribe', auth, billingController.subscribe);
router.post('/billing/cancel', auth, billingController.cancel);
router.post('/billing/webhook', billingController.webhook);

// Admin Routes (protegidas por X-Admin-Key header — sem JWT)
router.post('/admin/tags', adminAuth, adminController.createTags);
router.get('/admin/tags', adminAuth, adminController.listTags);
router.delete('/admin/tags/:id', adminAuth, adminController.deleteTag);
router.get('/admin/summary', adminAuth, adminController.summary);
router.get('/admin/users', adminAuth, adminController.listUsers);
router.post('/admin/users/:id/active-until', adminAuth, adminController.setActiveUntil);
router.get('/admin/shipments', adminAuth, adminController.listShipments);
router.post('/admin/shipments/:id/link-tag', adminAuth, adminController.linkTag);
router.post('/admin/users/:id/send-report', adminAuth, adminController.sendReport);

module.exports = router;
