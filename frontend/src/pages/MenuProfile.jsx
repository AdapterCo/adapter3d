import { Share2, MapPin, Plus } from 'lucide-react';
import { centsToBRL } from '../components/admin/utils';
import GoogleReviewButton from '../components/GoogleReviewButton';
import DirectionsButton from '../components/DirectionsButton';
import CartUI, { QtyControl } from '../components/cart/CartUI';
import useCart from '../hooks/useCart';

export default function MenuProfile({ data }) {
  const { theme } = data;
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

  const backgroundStyle = {
    background: theme.backgroundType === 'gradient' ? theme.backgroundGradient
      : theme.backgroundType === 'image' && theme.backgroundImage ? `url(${theme.backgroundImage}) center/cover no-repeat`
      : theme.backgroundColor
  };
  const textStyle = { color: theme.textColor };
  const accentStyle = { color: theme.buttonColor };
  const buttonStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor };
  const cart = useCart(data);

  // Agrupa produtos por categoria. Os "sem categoria" vão pro final.
  const grouped = categories.map(cat => ({
    category: cat,
    items: products.filter(p => p.categoryId && String(p.categoryId) === String(cat._id))
  })).filter(g => g.items.length > 0);

  const uncategorized = products.filter(p => !p.categoryId || !categories.find(c => String(c._id) === String(p.categoryId)));
  if (uncategorized.length > 0) {
    grouped.push({ category: { _id: 'none', name: categories.length > 0 ? 'Outros' : 'Cardápio' }, items: uncategorized });
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: data.name || 'Cardápio', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen w-full" style={backgroundStyle}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/20 transition-all"
            style={textStyle}
          ><Share2 className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col items-center mb-10">
          {data.avatar && (
            <div className="w-24 h-24 rounded-full border-4 shadow-lg overflow-hidden mb-3 bg-white" style={{ borderColor: theme.buttonColor }}>
              <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-center" style={textStyle}>{data.name}</h1>
          <p className="text-sm opacity-70 mt-1" style={textStyle}>Cardápio</p>
          {data.address && (
            <p className="text-sm opacity-80 mt-2 flex items-center gap-1 text-center" style={textStyle}>
              <MapPin className="w-4 h-4 flex-shrink-0" /> {data.address}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 -mt-4 empty:hidden">
          <GoogleReviewButton data={data} buttonStyle={buttonStyle} />
          <DirectionsButton data={data} buttonStyle={buttonStyle} />
        </div>

        {/* Conteúdo */}
        {products.length === 0 ? (
          <p className="text-center opacity-60" style={textStyle}>
            Nenhum produto cadastrado.
          </p>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ category, items }) => (
              <section key={category._id}>
                <h2 className="text-lg font-bold uppercase tracking-wide mb-3 pb-2 border-b-2" style={{ ...textStyle, borderColor: theme.buttonColor }}>
                  {category.name}
                </h2>
                <div className="space-y-3">
                  {items.map((p) => (
                    <div key={p._id} className="flex gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                      <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl opacity-40">🍽️</span>
                        )}
                      </div>
                      <div className="flex-grow flex flex-col justify-center min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{p.name || '(sem nome)'}</h3>
                        <p className="font-bold text-lg mt-1" style={accentStyle}>
                          {centsToBRL(p.price)}
                        </p>
                      </div>
                      {cart.enabled && (
                        <div className="flex-shrink-0 self-center">
                          {cart.qtyOf(p._id) > 0 ? (
                            <QtyControl qty={cart.qtyOf(p._id)} onChange={(q) => cart.setQty(p._id, q)} buttonStyle={buttonStyle} size="sm" />
                          ) : (
                            <button
                              onClick={() => cart.add(p._id)}
                              className="p-2 rounded-full shadow hover:scale-105 transition-all"
                              style={buttonStyle}
                              aria-label={`Adicionar ${p.name}`}
                            ><Plus className="w-5 h-5" /></button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className={`mt-12 text-center opacity-60 text-sm font-medium ${cart.count > 0 ? 'pb-24' : ''}`} style={textStyle}>
          Criado com Adapter Cards
        </div>
      </div>
      <CartUI cart={cart} data={data} buttonStyle={buttonStyle} />
    </div>
  );
}
