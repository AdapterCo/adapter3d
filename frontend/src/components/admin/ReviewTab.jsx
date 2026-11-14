import { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Star, RefreshCw, Printer, Copy, ExternalLink, Trash2, MapPin } from 'lucide-react';
import api from '../../services/api';

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default function ReviewTab({ data, setData }) {
  const review = data.googleReview || {};
  const [mapsUrl, setMapsUrl] = useState(review.mapsUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const qrRef = useRef(null);

  const applyReview = (googleReview) => setData(prev => ({ ...prev, googleReview }));

  const handleGenerate = async () => {
    setError('');
    if (!mapsUrl.trim()) {
      setError('Cole o link do Google Maps da sua empresa.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/google-review', { mapsUrl: mapsUrl.trim() });
      applyReview(res.data.googleReview);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível gerar o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remover o botão "Avaliar no Google" do seu perfil?')) return;
    setLoading(true);
    try {
      const res = await api.delete('/google-review');
      applyReview(res.data.googleReview);
      setMapsUrl('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(review.reviewUrl);
    alert('Link de avaliação copiado!');
  };

  // Abre uma página só com o cartaz (nome, estrelas, QR) e chama a impressão.
  const handlePrint = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) {
      alert('Permita pop-ups deste site para imprimir o QR Code.');
      return;
    }
    const name = escapeHtml(review.businessName || data.name);
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>QR Code - Avalie no Google</title>
<style>
  @page { size: A5 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #202124; display: flex; justify-content: center; }
  .card { width: 100%; max-width: 420px; text-align: center; padding: 28px 24px; border: 2px solid #e0e0e0; border-radius: 20px; }
  .g { font-size: 30px; font-weight: bold; letter-spacing: -0.5px; }
  .g span:nth-child(1){color:#4285F4}.g span:nth-child(2){color:#EA4335}.g span:nth-child(3){color:#FBBC05}
  .g span:nth-child(4){color:#4285F4}.g span:nth-child(5){color:#34A853}.g span:nth-child(6){color:#EA4335}
  h1 { font-size: 22px; margin: 14px 0 4px; }
  .stars { color: #FBBC05; font-size: 34px; letter-spacing: 4px; margin: 6px 0 16px; }
  .qr { display: inline-block; padding: 14px; background: #fff; border: 1px solid #eee; border-radius: 12px; }
  .qr svg { width: 240px; height: 240px; display: block; }
  p { margin: 16px 0 0; font-size: 15px; line-height: 1.4; }
  small { display: block; margin-top: 10px; color: #5f6368; font-size: 12px; }
</style></head><body>
<div class="card">
  <div class="g"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></div>
  <h1>${name}</h1>
  <div class="stars">★★★★★</div>
  <div class="qr">${svg.outerHTML}</div>
  <p><strong>Gostou? Avalie a gente no Google!</strong><br>Sua opinião ajuda muito.</p>
  <small>Aponte a câmera do celular para o QR Code</small>
</div>
<script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-500" /> Avaliação no Google
      </h3>
      <p className="text-sm text-gray-500 -mt-2">
        Cole o link do seu negócio no Google Maps. Geramos o link que abre direto a tela de avaliação,
        mostramos um botão "Avaliar no Google" no seu perfil e um QR Code pronto para imprimir.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Link do Google Maps</label>
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
            />
          </div>
          <button
            onClick={handleGenerate} disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center whitespace-nowrap disabled:opacity-70"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (review.reviewUrl ? 'Atualizar' : 'Gerar link')}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          No Google Maps, abra sua empresa, toque em <strong>Compartilhar</strong> e copie o link.
        </p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {review.reviewUrl && (
        <div className="border rounded-xl p-5 bg-gray-50 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Empresa encontrada</p>
            <p className="font-semibold text-gray-900">{review.businessName || '—'}</p>
            <p className="text-xs text-green-700 mt-1">Salvo. O botão já aparece no seu perfil público.</p>
          </div>

          <div className="flex justify-center">
            <div ref={qrRef} className="p-4 bg-white rounded-xl border">
              <QRCode value={review.reviewUrl} size={200} level="M" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={handlePrint} className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              <Printer className="w-4 h-4 mr-2" /> Imprimir QR Code
            </button>
            <button onClick={handleCopy} className="flex items-center justify-center p-3 border bg-white rounded-lg hover:bg-gray-100 font-medium text-gray-700">
              <Copy className="w-4 h-4 mr-2" /> Copiar link
            </button>
            <a href={review.reviewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-3 border bg-white rounded-lg hover:bg-gray-100 font-medium text-gray-700">
              <ExternalLink className="w-4 h-4 mr-2" /> Testar link
            </a>
            <button onClick={handleRemove} disabled={loading} className="flex items-center justify-center p-3 border border-red-200 bg-white rounded-lg hover:bg-red-50 font-medium text-red-600">
              <Trash2 className="w-4 h-4 mr-2" /> Remover botão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
