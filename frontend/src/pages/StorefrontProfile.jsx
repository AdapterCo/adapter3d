import { useState } from 'react';
import { Share2, ImageIcon, MapPin, Plus } from 'lucide-react';
import GoogleReviewButton from '../components/GoogleReviewButton';
import DirectionsButton from '../components/DirectionsButton';
import CartUI from '../components/cart/CartUI';
import ProductModal, { PriceTag, SoldOutBadge } from '../components/cart/ProductModal';
import useCart from '../hooks/useCart';
import OpenStatus from '../components/OpenStatus';
import { track } from '../services/track';

export default function StorefrontProfile({ data }) {
  const { theme } = data;
  const cart = useCart(data);
  const visibleCategories = (data.categories || []).filter(c => c.isVisible !== false);
  const visibleCategoryIds = new Set(visibleCategories.map(c => String(c._id)));

  const products = (data.products || [])
    .filter(p => {
      if (p.isVisible === false) return false;
      if (p.categoryId && !visibleCategoryIds.has(String(p.categoryId))) return false;
      return true;
    })
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const categories = visibleCategories.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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

  const openProduct = (p) => {
    setSelectedId(String(p._id));
    track(data, 'product_view', { target: String(p._id) });
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
      <div className={`max-w-3xl mx-auto px-4 py-8 ${cart.count > 0 ? 'pb-28' : ''}`}>
        {/* Header */}
        <div className="flex justify-end mb-4">
          <button
            data-track="share" onClick={handleShare}
            className="p-2 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/20 transition-all"
            style={textStyle}
          ><Share2 className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col items-center mb-6">
          {data.avatar && (
            <div className="w-24 h-24 rounded-full border-4 shadow-lg overflow-hidden mb-3 bg-white" style={{ borderColor: theme.buttonColor }}>
              <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-center" style={textStyle}>{data.name}</h1>
          <p className="text-sm opacity-70 mt-1" style={textStyle}>Vitrine</p>
          <OpenStatus hours={data.businessHours} />
          {data.address && (
            <p className="text-sm opacity-80 mt-2 flex items-center gap-1 text-center" style={textStyle}>
              <MapPin className="w-4 h-4 flex-shrink-0" /> {data.address}
            </p>
          )}
        </div>

        <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 empty:hidden">
          <GoogleReviewButton data={data} buttonStyle={buttonStyle} />
          <DirectionsButton data={data} buttonStyle={buttonStyle} />
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
            {filtered.map(p => {
              const inCart = cart.enabled ? cart.qtyOf(p._id) : 0;
              return (
                <button
                  key={p._id}
                  onClick={() => openProduct(p)}
                  className="bg-white rounded-xl shadow-sm overflow-hidden text-left hover:shadow-md hover:scale-[1.02] transition-all relative"
                >
                  {inCart > 0 && (
                    <span className="absolute top-2 right-2 z-10 min-w-[1.75rem] h-7 px-2 rounded-full text-sm font-bold flex items-center justify-center shadow" style={buttonStyle}>
                      {inCart}
                    </span>
                  )}
                  {p.soldOut && <SoldOutBadge className="absolute top-2 left-2 z-10" />}
                  <div className={`aspect-square bg-gray-100 flex items-center justify-center overflow-hidden ${p.soldOut ? 'opacity-60 grayscale' : ''}`}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">{p.name || '(sem nome)'}</h3>
                    <p className="font-bold mt-1 text-base">
                      <PriceTag product={p} color={theme.buttonColor} />
                    </p>
                    {p.soldOut ? (
                      <div className="mt-2 text-center py-1.5 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600">Esgotado</div>
                    ) : (
                      <div className="mt-2 text-center py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-1" style={buttonStyle}>
                        {cart.enabled ? <><Plus className="w-3.5 h-3.5" /> Adicionar</> : 'Comprar'}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center opacity-60 text-sm font-medium" style={textStyle}>
          Criado com Adapter Cards · <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline">Privacidade</a>
        </div>
      </div>

      {selected && (
        <ProductModal key={selected._id} product={selected} data={data} cart={cart} buttonStyle={buttonStyle} accentColor={theme.buttonColor} onClose={() => setSelectedId(null)} />
      )}

      <CartUI cart={cart} data={data} buttonStyle={buttonStyle} />
    </div>
  );
}
