const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tag = require('../models/Tag');
const crypto = require('crypto');
const mailer = require('../services/mailer');
const { isPaidType, subscriptionState, productLimit } = require('../utils/plans');

const PAID_SIGNUP_MESSAGE = 'Cardápio e vitrine agora funcionam por assinatura: crie sua conta em /assinar. A tag é enviada depois para o seu endereço.';
const {
  MIN_PASSWORD_LENGTH,
  EMAIL_COLLATION,
  normalizeEmail,
  isValidEmail,
  normalizeSlug,
  isValidSlug
} = require('../utils/validation');
const { slugTakenByTag } = require('../utils/tagSlug');

const JWT_SECRET = process.env.JWT_SECRET;

// Código de tag vindo do corpo da requisição: precisa ser texto curto.
// Barra objetos/arrays que o Mongo interpretaria como operadores ($regex, $gt...).
const isTagId = (v) => typeof v === 'string' && v.length <= 64;

// Login User
exports.login = async (req, res) => {
  try {
    const { password } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    if (!email || typeof password !== 'string') {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    // Collation case-insensitive cobre contas antigas salvas com maiúsculas.
    let user = await User.findOne({ email }).collation(EMAIL_COLLATION);
    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    const payload = { user: { id: user.id, slug: user.slug, v: user.tokenVersion || 0 } };

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
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ message: 'ID da Tag é obrigatório' });
    // Só texto: um objeto como {"$regex": "..."} viraria operador na consulta
    // e permitiria descobrir códigos de tags ainda não ativadas.
    if (!isTagId(id)) return res.status(400).json({ message: 'Tag inválida. Verifique o código impresso no seu cartão.' });

    const tag = await Tag.findOne({ id });
    if (!tag) {
      return res.status(400).json({ message: 'Tag inválida. Verifique o código impresso no seu cartão.' });
    }
    if (isPaidType(tag.profileType)) {
      return res.status(400).json({ message: PAID_SIGNUP_MESSAGE });
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
    const { id, password, profileType, pet, name } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    const slug = normalizeSlug(req.body?.slug);

    if (!id || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    if (!isTagId(id)) {
      return res.status(400).json({ message: 'Tag inválida ou já ativada.' });
    }
    if (req.body?.acceptTerms !== true) {
      return res.status(400).json({ message: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Email inválido.' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }

    // Cardápio/vitrine não se ativam pela tag: a conta nasce na assinatura (/assinar)
    // e a tag é vinculada depois pelo administrador.
    const tagInfo = await Tag.findOne({ id }).select('profileType').lean();
    if (tagInfo && isPaidType(tagInfo.profileType)) {
      return res.status(400).json({ message: PAID_SIGNUP_MESSAGE });
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
    // Pet usa o ID da tag (definido por nós); os demais passam pela mesma
    // regra da edição de perfil: 3-32 caracteres, a-z, 0-9 e hífen, sem
    // palavras reservadas como "admin" ou "api".
    if (resolvedType !== 'pet' && !isValidSlug(resolvedSlug)) {
      throw { _userError: 'Complemento (URL) inválido. Use de 3 a 32 letras minúsculas, números ou hífen (sem começar/terminar com hífen).' };
    }

    // Checagens de email/slug (depois da reivindicação pra evitar race)
    if (await User.findOne({ email }).collation(EMAIL_COLLATION)) {
      throw { _userError: 'Este email já está em uso.' };
    }
    if (await User.findOne({ $or: [{ slug: resolvedSlug }, { previousSlugs: resolvedSlug }] })
      || (resolvedType !== 'pet' && await slugTakenByTag(resolvedSlug, { ownTagId: id }))) {
      throw { _userError: 'Este complemento (URL) já está em uso.' };
    }

    const userPayload = { id, email, password, slug: resolvedSlug, profileType: resolvedType, termsAcceptedAt: new Date() };
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

    const payload = { user: { id: user.id, slug: user.slug, v: user.tokenVersion || 0 } };
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
    // subscriptionState: usado pelo painel para avisos (aguardando pagamento,
    // perfil fora do ar). Somente leitura: não está em UPDATABLE_FIELDS.
    res.json({ ...user.toObject(), subscriptionState: subscriptionState(user), productLimit: productLimit(user) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const FORGOT_MESSAGE = 'Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha em instantes.';

// POST /api/auth/forgot-password { email }
// Sempre responde a mesma mensagem, exista o e-mail ou não (não revela quem é cliente).
exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Informe um e-mail válido.' });
    }

    const user = await User.findOne({ email }).collation(EMAIL_COLLATION).select('email name');
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await User.updateOne(
        { _id: user._id },
        { $set: { resetPasswordHash: hashToken(token), resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS) } }
      );

      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
      const link = `${appUrl}/redefinir-senha?token=${token}`;
      const text = [
        `Olá${user.name ? `, ${user.name}` : ''}!`,
        '',
        'Recebemos um pedido para redefinir a senha do seu painel Adapter Cards.',
        `Para criar uma nova senha, acesse: ${link}`,
        '',
        'O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.'
      ].join('\n');
      const html = `<p>Olá${user.name ? `, ${escapeHtml(user.name)}` : ''}!</p>
<p>Recebemos um pedido para redefinir a senha do seu painel <strong>Adapter Cards</strong>.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">Criar nova senha</a></p>
<p style="color:#555;font-size:13px">O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`;

      // Falha no envio não muda a resposta (evita revelar se o e-mail existe).
      mailer.sendMail({ to: user.email, subject: 'Redefinir sua senha - Adapter Cards', text, html })
        .catch(err => console.error('forgotPassword: falha ao enviar e-mail:', err.message));
    }

    res.json({ message: FORGOT_MESSAGE });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// POST /api/auth/reset-password { token, password }
exports.resetPassword = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const { password } = req.body || {};
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ message: 'Link inválido ou expirado. Peça um novo.' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }

    const user = await User.findOne({
      resetPasswordHash: hashToken(token),
      resetPasswordExpires: { $gt: new Date() }
    }).select('_id');
    if (!user) {
      return res.status(400).json({ message: 'Link inválido ou expirado. Peça um novo.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    // Token de uso único: removido junto com a troca da senha. tokenVersion
    // sobe para derrubar todos os logins abertos (ex.: token roubado).
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashed, resetPasswordHash: null, resetPasswordExpires: null }, $inc: { tokenVersion: 1 } }
    );

    res.json({ message: 'Senha alterada! Faça login com a nova senha.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
