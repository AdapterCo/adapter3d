const express = require('express');
const router = express.Router();
const multer = require('multer');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// Uploads vão direto pro MinIO. Multer só parseia o multipart em memória.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB por arquivo
});

// Auth Routes
router.post('/auth/login', authController.login);
router.post('/auth/validate-tag', authController.validateTag);
router.post('/auth/register', authController.register);
router.get('/auth/me', auth, authController.getMe);

// Public Card Route (By Slug)
router.get('/users/slug/:slug', userController.getUserBySlug);

// Tag Redirect Route (Find slug by Tag ID)
router.get('/users/tag/:id', userController.getUserByTagId);

// Protected User Update Route
router.put('/users/:id', auth, userController.updateUser);

// Upload Route (auth-protected — só usuários logados podem subir arquivos)
router.post('/upload', auth, upload.single('image'), userController.uploadImage);

// Admin Routes (protegidas por X-Admin-Key header — sem JWT)
router.post('/admin/tags', adminAuth, adminController.createTags);
router.get('/admin/tags', adminAuth, adminController.listTags);
router.delete('/admin/tags/:id', adminAuth, adminController.deleteTag);

module.exports = router;
