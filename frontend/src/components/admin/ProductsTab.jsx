import { Trash2, ArrowUp, ArrowDown, ImageIcon } from 'lucide-react';
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
    const next = [...products, { _id: newObjectId(), name: '', price: 0, image: '', categoryId: null, order: products.length }];
    setData({ ...data, products: next });
  };

  const updateProduct = (index, field, value) => {
    const next = products.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setData({ ...data, products: next });
  };

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

      <div className="space-y-3">
        {products.map((p, index) => (
          <div key={p._id || `new-${index}`} className="bg-gray-50 p-4 rounded-lg border">
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
                <div className="grid grid-cols-2 gap-2">
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
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1">
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
