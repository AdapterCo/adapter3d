const User = require('../models/User');
const storage = require('../services/storage');

// Get User by Slug (Public Card View)
exports.getUserBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const user = await User.findOne({ slug }).select('-password -email'); // Don't expose private data

    if (!user) {
      return res.status(404).json({ message: 'Perfil não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in getUserBySlug:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get User by Tag ID (For Physical NFC Redirection)
exports.getUserByTagId = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ id }).select('slug');

    if (!user) {
      return res.status(404).json({ message: 'Tag não ativada' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in getUserByTagId:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const RESERVED_SLUGS = new Set(['admin', 'register', 'tag', 'api', 'login', 'uploads', 'auth']);
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

// Update User Data
exports.updateUser = async (req, res) => {
  try {
    // Always use the authenticated user's ID from the JWT — never trust the URL param.
    const id = req.user.id;
    const updates = req.body;

    // Prevent user from changing email/password/id/profileType through this generic update route
    delete updates.email;
    delete updates.password;
    delete updates.id;
    delete updates.profileType;

    if (updates.slug) {
      // Pet: slug é fixo (= tagId, gravado no QR da peça). Ignora qualquer tentativa de mudar.
      const currentUser = await User.findOne({ id }).select('profileType slug');
      if (currentUser?.profileType === 'pet') {
        delete updates.slug;
      } else {
        const newSlug = String(updates.slug).toLowerCase();
        if (!SLUG_REGEX.test(newSlug) || RESERVED_SLUGS.has(newSlug)) {
          return res.status(400).json({ message: 'Slug inválido ou reservado.' });
        }
        updates.slug = newSlug;
        const existingSlug = await User.findOne({ slug: newSlug, id: { $ne: id } });
        if (existingSlug) {
          return res.status(400).json({ message: 'Este link (slug) já está em uso por outro usuário.' });
        }
      }
    }

    const user = await User.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload image to MinIO and return the public URL
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    if (!req.file.mimetype?.startsWith('image/')) {
      return res.status(400).json({ message: 'Apenas imagens são aceitas.' });
    }

    const { url } = await storage.uploadBuffer(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({ url });
  } catch (error) {
    console.error('Error in uploadImage:', error);
    res.status(500).json({ message: 'Erro ao enviar imagem.' });
  }
};
