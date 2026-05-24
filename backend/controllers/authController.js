const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tag = require('../models/Tag');

const JWT_SECRET = process.env.JWT_SECRET;

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    const payload = { user: { id: user.id, slug: user.slug } };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, slug: user.slug, email: user.email, name: user.name, profileType: user.profileType } });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Validate Tag ID
exports.validateTag = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'ID da Tag é obrigatório' });

    const tag = await Tag.findOne({ id });
    if (!tag) {
      return res.status(400).json({ message: 'Tag inválida. Verifique o código impresso no seu cartão.' });
    }
    if (tag.isActivated) {
      return res.status(400).json({ message: 'Esta Tag já está ativada e vinculada a um perfil.' });
    }

    res.json({ message: 'Tag disponível', valid: true, profileType: tag.profileType });
  } catch (error) {
    console.error('Validate tag error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Register User (Activate Tag)
exports.register = async (req, res) => {
  let claimedTag = null;
  try {
    const { id, email, password, slug, profileType, pet, name } = req.body;

    if (!id || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    // Reivindica a tag de forma atômica: só dá certo se ela existir E estiver livre.
    claimedTag = await Tag.findOneAndUpdate(
      { id, isActivated: false },
      { isActivated: true },
      { returnDocument: 'after' }
    );
    if (!claimedTag) {
      // ou a tag não existe na pool, ou já foi ativada por outro
      return res.status(400).json({ message: 'Tag inválida ou já ativada.' });
    }

    // Trava o tipo do perfil ao tipo da tag. Se o cliente mandou um tipo diferente, rejeita.
    if (profileType && profileType !== claimedTag.profileType) {
      throw { _userError: `Esta tag é do tipo "${claimedTag.profileType}" e não pode ser ativada como "${profileType}".` };
    }
    const resolvedType = claimedTag.profileType;

    // Pet: slug é fixo = tagId (URL gravada no QR da coleira).
    // Business/Menu/Storefront: usuário escolhe slug bonito (a peça/QR é gerada DEPOIS).
    const resolvedSlug = resolvedType === 'pet' ? id : slug;
    if (!resolvedSlug) {
      throw { _userError: 'Complemento (URL) é obrigatório.' };
    }

    // Checagens de email/slug (depois da reivindicação pra evitar race)
    if (await User.findOne({ email })) {
      throw { _userError: 'Este email já está em uso.' };
    }
    if (await User.findOne({ slug: resolvedSlug })) {
      throw { _userError: 'Este complemento (URL) já está em uso.' };
    }

    const userPayload = { id, email, password, slug: resolvedSlug, profileType: resolvedType };
    if (resolvedType === 'pet') {
      // Pet profile: name é o nome do pet, pet.* contém o resto
      if (pet && typeof pet === 'object') userPayload.pet = pet;
      if (pet && pet.name) userPayload.name = pet.name;
    } else if (name) {
      userPayload.name = name;
    }

    const user = new User(userPayload);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // Vincula a tag ao usuário criado (pra rastrear quem ativou cada tag)
    await Tag.findOneAndUpdate({ id }, { activatedBy: user._id });

    const payload = { user: { id: user.id, slug: user.slug } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, slug: user.slug, email: user.email, name: user.name, profileType: user.profileType } });
    });
  } catch (error) {
    // Rollback da reivindicação da tag se qualquer coisa deu errado depois dela
    if (claimedTag) {
      try {
        await Tag.findOneAndUpdate({ id: claimedTag.id }, { isActivated: false, activatedBy: null });
      } catch (rollbackErr) {
        console.error('Tag rollback failed:', rollbackErr);
      }
    }
    if (error && error._userError) {
      return res.status(400).json({ message: error._userError });
    }
    console.error('Register error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Get current logged in user profile (for Admin panel)
exports.getMe = async (req, res) => {
  try {
    // req.user.id is the tag ID from the JWT payload
    const user = await User.findOne({ id: req.user.id }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};
