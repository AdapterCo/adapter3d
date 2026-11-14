const User = require('../models/User');

// Serviço externo que converte o link do Google Maps / Perfil da Empresa em
// link direto de avaliação. Resposta de sucesso:
//   { ok: true, place_id, review_link, business_name }
// Erro (HTTP 400): { ok: false, error: "mensagem" }
const RESOLVER_URL = 'https://tudoparaempresas.com.br/ferramentas/gerador-link-avaliacao-google/resolver.php?url=';
const RESOLVER_TIMEOUT_MS = 15000;

// Só aceitamos de volta um link de avaliação oficial do Google. Protege o botão
// público caso o serviço externo seja comprometido ou mude o formato.
const REVIEW_LINK_REGEX = /^https:\/\/search\.google\.com\/local\/writereview\?placeid=[A-Za-z0-9_-]+$/;

const EMPTY_REVIEW = { mapsUrl: '', reviewUrl: '', placeId: '', businessName: '' };

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

// POST /api/google-review  { mapsUrl }
// Resolve o link e já salva no perfil do usuário logado.
exports.resolve = async (req, res) => {
  const mapsUrl = String(req.body?.mapsUrl || '').trim();
  if (!mapsUrl || mapsUrl.length > 1000 || !isHttpUrl(mapsUrl)) {
    return res.status(400).json({ message: 'Cole o link de compartilhamento do Google Maps (ex: https://maps.app.goo.gl/...).' });
  }

  let payload;
  try {
    const response = await fetch(RESOLVER_URL + encodeURIComponent(mapsUrl), {
      signal: AbortSignal.timeout(RESOLVER_TIMEOUT_MS),
      headers: { Accept: 'application/json' }
    });
    payload = await response.json().catch(() => null);
  } catch (err) {
    console.error('google-review resolver error:', err.message);
    return res.status(502).json({ message: 'Não foi possível consultar o Google agora. Tente novamente em instantes.' });
  }

  if (!payload || payload.ok !== true) {
    const msg = typeof payload?.error === 'string' && payload.error.length < 300
      ? payload.error
      : 'Não foi possível gerar o link de avaliação a partir desse endereço.';
    return res.status(400).json({ message: msg });
  }

  const reviewUrl = String(payload.review_link || '');
  if (!REVIEW_LINK_REGEX.test(reviewUrl)) {
    console.error('google-review resolver returned unexpected link:', reviewUrl);
    return res.status(502).json({ message: 'O serviço retornou um link inesperado. Tente novamente mais tarde.' });
  }

  const googleReview = {
    mapsUrl,
    reviewUrl,
    placeId: String(payload.place_id || '').slice(0, 200),
    businessName: String(payload.business_name || '').slice(0, 200)
  };

  try {
    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      { $set: { googleReview } },
      { returnDocument: 'after' }
    ).select('googleReview');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json({ googleReview: user.googleReview });
  } catch (error) {
    console.error('google-review save error:', error);
    res.status(500).json({ message: 'Erro ao salvar o link de avaliação.' });
  }
};

// DELETE /api/google-review — remove o botão do perfil.
exports.remove = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      { $set: { googleReview: EMPTY_REVIEW } },
      { returnDocument: 'after' }
    ).select('googleReview');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json({ googleReview: user.googleReview });
  } catch (error) {
    console.error('google-review remove error:', error);
    res.status(500).json({ message: 'Erro ao remover o link de avaliação.' });
  }
};
