const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Rotas do lojista: exige "Authorization: Bearer <token>".
// Além da assinatura e da validade, confere a versão do token com a conta:
// redefinir a senha sobe User.tokenVersion e derruba tokens antigos (ex.: um
// token roubado continua inútil depois que o dono troca a senha). Tokens sem
// "v" (emitidos antes desta checagem) valem como versão 0.
module.exports = async function (req, res, next) {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  let decoded;
  try {
    decoded = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }

  try {
    const id = decoded?.user?.id;
    const account = typeof id === 'string' ? await User.findOne({ id }).select('tokenVersion').lean() : null;
    if (!account || (account.tokenVersion || 0) !== (decoded.user.v || 0)) {
      return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    }
  } catch (err) {
    console.error('authMiddleware: erro ao conferir a sessão:', err.message);
    return res.status(500).json({ message: 'Erro no servidor' });
  }

  req.user = decoded.user;
  next();
};
