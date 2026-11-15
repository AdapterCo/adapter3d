import { useState } from 'react';
import { Trash2, ArrowUp, ArrowDown, ImageIcon, Eye, EyeOff, Sparkles, Ban, ChevronDown, ChevronUp, Plus, GripVertical } from 'lucide-react';
import useDragReorder, { moveItem } from '../../hooks/useDragReorder';
import api from '../../services/api';
import { centsToInput, inputToCents, newObjectId } from './utils';

const MAX_PRODUCTS = 30;

export default function ProductsTab({ data, setData }) {
  const products = data.products || [];
  const categories = data.categories || [];
  const atLimit = products.length >= MAX_PRODUCTS;

  const addProduct = () => {
    if (atLimit) return;
    // _id no cliente mantém a React key estável (sem remount ao salvar) e segue
    // o mesmo padrão das categorias.
    const next = [...products, { _id: newObjectId(), name: '', price: 0, image: '', categoryId: null, order: products.length, isVisible: true }];
    setData({ ...data, products: next });
  };

  const updateProduct = (index, field, value) => {
    const next = products.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setData({ ...data, products: next });
  };

  const drag = useDragReorder((from, to) => setData(prev => ({ ...prev, products: moveItem(prev.products || [], from, to) })));

  const removeProduct = (index) => {
    if (!confirm('Remover este produto?')) return;
    const next = products.filter((_, i) => i !== index);
    setData({ ...data, products: next });
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= products.length) return;
    const next = [...products];
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((p, i) => { p.order = i; });
    setData({ ...data, products: next });
  };

  const handleImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateProduct(index, 'image', res.data.url);
    } catch (err) {
      console.error('Error uploading product image:', err);
      alert('Erro ao enviar imagem do produto.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="font-semibold text-lg">Produtos</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {products.length} / {MAX_PRODUCTS} produtos
          </p>
        </div>
        <button
          onClick={addProduct}
          disabled={atLimit}
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={atLimit ? `Limite de ${MAX_PRODUCTS} produtos atingido` : 'Adicionar produto'}
        >+ Adicionar produto</button>
      </div>

      {products.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          Nenhum produto cadastrado. Adicione até {MAX_PRODUCTS} produtos com foto, nome e preço.
        </p>
      )}

      {products.length > 1 && <p className="text-xs text-gray-500 -mt-3">Arraste pela alça <GripVertical className="inline w-3.5 h-3.5" /> para mudar a ordem no cardápio.</p>}
      <div className="space-y-3" data-drag-list>
        {products.map((p, index) => (
          <div key={p._id || `new-${index}`} {...drag.itemProps(index)} className="bg-gray-50 p-4 rounded-lg border transition-shadow data-[dragging=true]:ring-2 data-[dragging=true]:ring-blue-400 data-[dragging=true]:shadow-lg data-[dragging=true]:relative data-[dragging=true]:z-10">
            <div className="flex gap-4">
              {/* Foto */}
              <label className="cursor-pointer flex-shrink-0">
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden hover:border-blue-500 transition-colors">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <input
                  type="file" className="hidden" accept="image/*"
                  onChange={(e) => handleImageUpload(e, index)}
                />
              </label>

              {/* Campos */}
              <div className="flex-grow space-y-2">
                <input
                  type="text" value={p.name}
                  onChange={(e) => updateProduct(index, 'name', e.target.value)}
                  placeholder="Nome do produto"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex rounded-lg border overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="px-2 py-2 text-gray-500 bg-gray-100 text-sm select-none border-r">R$</span>
                    <input
                      type="text" inputMode="numeric"
                      value={centsToInput(p.price)}
                      onChange={(e) => updateProduct(index, 'price', inputToCents(e.target.value))}
                      className="w-full px-2 py-2 outline-none text-right"
                    />
                  </div>
                  <select
                    value={p.categoryId ? String(p.categoryId) : ''}
                    onChange={(e) => updateProduct(index, 'categoryId', e.target.value || null)}
                    className="w-full px-2 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(c => (
                      <option key={c._id} value={String(c._id)}>{c.name || '(sem nome)'}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => updateProduct(index, 'isVisible', p.isVisible === false ? true : false)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      p.isVisible !== false
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={p.isVisible !== false ? 'Produto visível no perfil público' : 'Produto oculto no perfil público'}
                  >
                    {p.isVisible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{p.isVisible !== false ? 'Visível' : 'Oculto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProduct(index, 'upsell', !p.upsell)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      p.upsell ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                    title="Aparece como sugestão no carrinho (Peça também)"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{p.upsell ? 'Sugerido' : 'Sugerir'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProduct(index, 'soldOut', !p.soldOut)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      p.soldOut ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                    title="Continua aparecendo, mas não pode ser pedido"
                  >
                    <Ban className="w-4 h-4" />
                    <span>{p.soldOut ? 'Esgotado' : 'Disponível'}</span>
                  </button>
                  <div className="flex rounded-lg border overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500" title="Preço antigo, aparece riscado (de/por). Deixe 0,00 para não usar.">
                    <span className="px-2 py-2 text-gray-500 bg-gray-100 text-xs select-none border-r whitespace-nowrap">De R$</span>
                    <input
                      type="text" inputMode="numeric"
                      value={centsToInput(p.compareAtPrice || 0)}
                      onChange={(e) => updateProduct(index, 'compareAtPrice', inputToCents(e.target.value))}
                      className="w-full px-2 py-2 outline-none text-right"
                      aria-label="Preço antigo (de)"
                    />
                  </div>
                </div>
                <textarea
                  value={p.description || ''} maxLength={500} rows={2}
                  onChange={(e) => updateProduct(index, 'description', e.target.value)}
                  placeholder="Descrição (opcional): ingredientes, tamanho, detalhes"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <OptionGroupsEditor groups={p.optionGroups || []} onChange={(g) => updateProduct(index, 'optionGroups', g)} />
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1">
                <button type="button" {...drag.handleProps(index)} className="p-1 text-gray-400 hover:text-gray-700 select-none">
                  <GripVertical className="w-4 h-4" />
                </button>
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                ><ArrowUp className="w-4 h-4" /></button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === products.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                ><ArrowDown className="w-4 h-4" /></button>
                <button
                  onClick={() => removeProduct(index)}
                  className="p-1 text-red-500 hover:bg-red-100 rounded mt-auto"
                ><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Variações e adicionais (ex.: "Tamanho": P/M/G, escolha 1; "Adicionais": até 3).
function OptionGroupsEditor({ groups, onChange }) {
  const [open, setOpen] = useState(groups.length > 0);
  const input = 'px-2 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const setGroup = (gi, patch) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setOption = (gi, oi, patch) => setGroup(gi, { options: groups[gi].options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) });
  const addGroup = (preset) => onChange([...groups, preset === 'size'
    ? { _id: newObjectId(), name: 'Tamanho', min: 1, max: 1, options: [{ _id: newObjectId(), name: '', price: 0 }] }
    : { _id: newObjectId(), name: 'Adicionais', min: 0, max: 3, options: [{ _id: newObjectId(), name: '', price: 0 }] }]);

  return (
    <div className="border rounded-lg bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700">
        <span>Variações e adicionais {groups.length > 0 && <span className="text-gray-400 font-normal">({groups.length})</span>}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-xs text-gray-500">O valor de cada opção é somado ao preço do produto. Use 0,00 para opções sem custo (ex.: sabor).</p>
          {groups.map((g, gi) => (
            <div key={g._id || gi} className="border rounded-lg p-2 space-y-2 bg-gray-50">
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${input} flex-grow min-w-[8rem]`} value={g.name} maxLength={60} placeholder="Nome do grupo (ex.: Tamanho)" onChange={(e) => setGroup(gi, { name: e.target.value })} />
                <label className="text-xs text-gray-600 flex items-center gap-1">
                  <input type="checkbox" checked={Number(g.min) > 0} onChange={(e) => setGroup(gi, { min: e.target.checked ? 1 : 0 })} /> obrigatório
                </label>
                <label className="text-xs text-gray-600 flex items-center gap-1">
                  até
                  <input type="number" min={1} max={20} className={`${input} w-14`} value={g.max || 1} onChange={(e) => setGroup(gi, { max: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
                  {Number(g.max) === 1 ? 'escolha' : 'escolhas'}
                </label>
                <button type="button" onClick={() => onChange(groups.filter((_, i) => i !== gi))} className="p-1 text-red-500 hover:bg-red-100 rounded" aria-label="Remover grupo"><Trash2 className="w-4 h-4" /></button>
              </div>
              {g.options.map((o, oi) => (
                <div key={o._id || oi} className="flex items-center gap-2 pl-2">
                  <input className={`${input} flex-grow min-w-0`} value={o.name} maxLength={60} placeholder="Opção (ex.: Grande)" onChange={(e) => setOption(gi, oi, { name: e.target.value })} />
                  <span className="text-xs text-gray-500 whitespace-nowrap">+ R$</span>
                  <input className={`${input} w-20 text-right`} inputMode="numeric" value={centsToInput(o.price || 0)} onChange={(e) => setOption(gi, oi, { price: inputToCents(e.target.value) })} aria-label="Acréscimo no preço" />
                  <button type="button" onClick={() => setGroup(gi, { options: g.options.filter((_, i) => i !== oi) })} className="p-1 text-gray-400 hover:text-red-500" aria-label="Remover opção"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {g.options.length < 20 && (
                <button type="button" onClick={() => setGroup(gi, { options: [...g.options, { _id: newObjectId(), name: '', price: 0 }] })} className="ml-2 text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> opção</button>
              )}
            </div>
          ))}
          {groups.length < 10 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addGroup('size')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50">+ Tamanho / variação</button>
              <button type="button" onClick={() => addGroup('extras')} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50">+ Adicionais</button>
            </div>
          )}
          <p className="text-xs text-gray-400">Grupos ou opções sem nome são descartados ao salvar.</p>
        </div>
      )}
    </div>
  );
}
