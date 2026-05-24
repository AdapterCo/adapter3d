import { useState } from 'react';
import { Share2, MessageCircle, X, ImageIcon } from 'lucide-react';
import { centsToBRL } from '../components/admin/utils';

export default function StorefrontProfile({ data }) {
  const { theme } = data;
  const products = (data.products || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const categories = (data.categories || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [selectedId, setSelectedId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const backgroundStyle = {
    background: theme.backgroundType === 'gradient' ? theme.backgroundGradient
      : theme.backgroundType === 'image' && theme.backgroundImage ? `url(${theme.backgroundImage}) center/cover no-repeat`
      : theme.backgroundColor
  };
  const textStyle = { color: theme.textColor };
  const buttonStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor };

  const filtered = activeCategory === 'all'
    ? products
    : products.filter(p => String(p.categoryId) === activeCategory);

  const selected = products.find(p => String(p._id) === selectedId);

  const buildWhatsappLink = (product) => {
    if (!data.whatsapp) return null;
    const clean = data.whatsapp.replace(/\D/g, '');
    const msg = `Olá! Tenho interesse em: ${product.name} (${centsToBRL(product.price)})`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: data.name || 'Vitrine', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen w-full" style={backgroundStyle}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/20 transition-all"
            style={textStyle}
          ><Share2 className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col items-center mb-8">
          {data.avatar && (
            <div className="w-24 h-24 rounded-full border-4 shadow-lg overflow-hidden mb-3 bg-white" style={{ borderColor: theme.buttonColor }}>
              <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-center" style={textStyle}>{data.name}</h1>
          <p className="text-sm opacity-70 mt-1" style={textStyle}>Vitrine</p>
        </div>

        {/* Filtro de categorias (chips) */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === 'all' ? 'shadow-md' : 'bg-white/60 text-gray-700'}`}
              style={activeCategory === 'all' ? buttonStyle : undefined}
            >Todos</button>
            {categories.map(c => (
              <button
                key={c._id}
                onClick={() => setActiveCategory(String(c._id))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === String(c._id) ? 'shadow-md' : 'bg-white/60 text-gray-700'}`}
                style={activeCategory === String(c._id) ? buttonStyle : undefined}
              >{c.name}</button>
            ))}
          </div>
        )}

        {/* Grid de produtos estilo Instagram */}
        {filtered.length === 0 ? (
          <p className="text-center opacity-60 py-12" style={textStyle}>
            Nenhum produto pra mostrar.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(p => (
              <button
                key={p._id}
                onClick={() => setSelectedId(String(p._id))}
                className="bg-white rounded-xl shadow-sm overflow-hidden text-left hover:shadow-md hover:scale-[1.02] transition-all"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">{p.name || '(sem nome)'}</h3>
                  <p className="font-bold mt-1 text-base" style={{ color: theme.buttonColor }}>
                    {centsToBRL(p.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 text-center opacity-60 text-sm font-medium" style={textStyle}>
          Criado com Adapter Cards
        </div>
      </div>

      {/* Modal de produto */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={() => setSelectedId(null)}>
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-white/90 rounded-full shadow-md hover:bg-white"
            ><X className="w-5 h-5" /></button>

            <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
              {selected.image ? (
                <img src={selected.image} alt={selected.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-20 h-20 text-gray-300" />
              )}
            </div>

            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-900">{selected.name || '(sem nome)'}</h2>
              <p className="text-2xl font-bold mt-2" style={{ color: theme.buttonColor }}>
                {centsToBRL(selected.price)}
              </p>

              {data.whatsapp ? (
                <a
                  href={buildWhatsappLink(selected)}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-5 w-full flex items-center justify-center p-3 rounded-xl font-medium shadow-sm hover:scale-[1.02] transition-all"
                  style={buttonStyle}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Comprar via WhatsApp
                </a>
              ) : (
                <p className="mt-5 text-sm text-center text-gray-500">
                  WhatsApp do estabelecimento não configurado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
