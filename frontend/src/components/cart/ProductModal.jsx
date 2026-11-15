import { useState } from 'react';
import { X, ImageIcon, ShoppingBag, MessageCircle, Share2 } from 'lucide-react';
import { shareProduct } from '../../utils/productLink';
import { centsToBRL, buildWhatsappLink } from '../admin/utils';
import { QtyControl } from './CartUI';
import { groupsOf, groupRule, hasPromo, optionsLabel, unitPrice, validateSelection } from '../../utils/productOptions';

// Preço com "de/por" quando há preço promocional.
export function PriceTag({ product, color, className = '' }) {
  return (
    <span className={`inline-flex items-baseline gap-2 flex-wrap ${className}`}>
      {hasPromo(product) && <s className="text-sm font-normal text-gray-400">{centsToBRL(product.compareAtPrice)}</s>}
      <span style={{ color }}>{centsToBRL(product.price)}</span>
    </span>
  );
}

export const SoldOutBadge = ({ className = '' }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full bg-gray-800 text-white text-xs font-semibold ${className}`}>Esgotado</span>
);

// Detalhe do produto: foto, descrição, variações/adicionais e quantidade.
// Sem carrinho ativo, oferece "Comprar via WhatsApp" com as opções escolhidas.
export default function ProductModal({ product, data, cart, buttonStyle, accentColor, onClose }) {
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState([]);
  const [error, setError] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const groups = groupsOf(product);

  const share = async () => {
    const r = await shareProduct({ slug: data.slug, product, storeName: data.name });
    if (r === 'copied') { setShareMsg('Link copiado!'); setTimeout(() => setShareMsg(''), 2500); }
  };
  const price = unitPrice(product, chosen);

  const toggle = (g, optionId) => {
    setError('');
    const id = String(optionId);
    const inGroup = new Set(g.options.map(o => String(o._id)));
    const max = Math.max(1, Number(g.max) || 1);
    setChosen(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (max === 1) return [...prev.filter(x => !inGroup.has(x)), id]; // escolha única troca
      if (prev.filter(x => inGroup.has(x)).length >= max) return prev; // limite do grupo
      return [...prev, id];
    });
  };

  const addToCart = () => {
    const err = validateSelection(product, chosen);
    if (err) return setError(err);
    cart.add(product._id, qty, chosen);
    onClose();
  };

  const whatsappLink = () => {
    const opts = optionsLabel(product, chosen);
    const msg = `Olá! Tenho interesse em: ${product.name}${opts ? ` (${opts})` : ''} - ${centsToBRL(price)}`;
    return buildWhatsappLink(data.whatsapp, msg);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={product.name}
        className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 z-10 p-2 bg-white/90 rounded-full shadow-md hover:bg-white">
          <X className="w-5 h-5" />
        </button>
        {data.slug && !data._preview && (
          <button onClick={share} data-track="share_product" aria-label="Compartilhar produto" className="absolute top-3 left-3 z-10 flex items-center gap-1 px-3 py-2 bg-white/90 rounded-full shadow-md hover:bg-white text-sm font-medium text-gray-800">
            <Share2 className="w-4 h-4" /> {shareMsg || 'Compartilhar'}
          </button>
        )}

        <div className="overflow-y-auto">
          {product.image ? (
            <div className="aspect-square max-h-80 w-full bg-gray-100 overflow-hidden">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-28 bg-gray-100 flex items-center justify-center"><ImageIcon className="w-12 h-12 text-gray-300" /></div>
          )}

          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 pr-8">{product.name || '(sem nome)'}</h2>
              {product.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{product.description}</p>}
              <div className="mt-2 text-2xl font-bold flex items-center gap-2">
                <PriceTag product={product} color={accentColor} />
                {product.soldOut && <SoldOutBadge />}
              </div>
            </div>

            {!product.soldOut && groups.map(g => {
              const single = Math.max(1, Number(g.max) || 1) === 1;
              return (
                <fieldset key={g._id} className="border rounded-xl">
                  <legend className="sr-only">{g.name}</legend>
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-xl">
                    <span className="font-semibold text-sm text-gray-900">{g.name}</span>
                    <span className={`text-xs ${Number(g.min) > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>{groupRule(g)}</span>
                  </div>
                  {g.options.map(o => {
                    const id = String(o._id);
                    const checked = chosen.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-3 px-3 py-2.5 border-t text-sm cursor-pointer">
                        <input
                          type={single ? 'radio' : 'checkbox'} name={`g-${g._id}`} checked={checked}
                          onChange={() => toggle(g, id)}
                          // Rádio marcado de grupo opcional: clicar de novo desmarca.
                          onClick={() => { if (single && checked && !(Number(g.min) > 0)) toggle(g, id); }}
                          className="w-4 h-4"
                        />
                        <span className="flex-grow text-gray-800">{o.name}</span>
                        {o.price > 0 && <span className="text-gray-600">+ {centsToBRL(o.price)}</span>}
                      </label>
                    );
                  })}
                </fieldset>
              );
            })}
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          </div>
        </div>

        <div className="p-4 border-t">
          {product.soldOut ? (
            <p className="text-center text-sm text-gray-500 py-2">Produto esgotado no momento.</p>
          ) : cart.enabled ? (
            <div className="flex items-center gap-3">
              <QtyControl qty={qty} onChange={(q) => setQty(Math.max(1, Math.min(99, q)))} buttonStyle={buttonStyle} />
              <button onClick={addToCart} className="flex-grow flex items-center justify-center p-3 rounded-xl font-semibold shadow-sm hover:scale-[1.02] transition-all" style={buttonStyle}>
                <ShoppingBag className="w-5 h-5 mr-2" /> Adicionar · {centsToBRL(qty * price)}
              </button>
            </div>
          ) : data.whatsapp ? (
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center p-3 rounded-xl font-medium shadow-sm" style={buttonStyle}>
              <MessageCircle className="w-5 h-5 mr-2" /> Comprar via WhatsApp
            </a>
          ) : (
            <p className="text-sm text-center text-gray-500">WhatsApp do estabelecimento não configurado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
