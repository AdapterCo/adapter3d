import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function CategoriesTab({ data, setData }) {
  const categories = data.categories || [];

  const addCategory = () => {
    const next = [...categories, { name: '', order: categories.length }];
    setData({ ...data, categories: next });
  };

  const updateCategory = (index, field, value) => {
    const next = categories.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    setData({ ...data, categories: next });
  };

  const removeCategory = (index) => {
    const cat = categories[index];
    const orphanedCount = (data.products || []).filter(p => p.categoryId && String(p.categoryId) === String(cat._id)).length;
    if (orphanedCount > 0) {
      if (!confirm(`Essa categoria tem ${orphanedCount} produto(s) vinculado(s). Eles vão ficar "Sem categoria". Continuar?`)) return;
    }
    // Limpa categoryId dos produtos que referenciavam essa categoria
    const cleanedProducts = (data.products || []).map(p => (
      p.categoryId && String(p.categoryId) === String(cat._id) ? { ...p, categoryId: null } : p
    ));
    const next = categories.filter((_, i) => i !== index);
    setData({ ...data, categories: next, products: cleanedProducts });
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    // Atualiza campo order pra refletir nova posição
    next.forEach((c, i) => { c.order = i; });
    setData({ ...data, categories: next });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-semibold text-lg">Categorias</h3>
        <button
          onClick={addCategory}
          className="text-sm text-blue-600 font-medium hover:text-blue-700"
        >+ Adicionar categoria</button>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          Nenhuma categoria cadastrada. Categorias ajudam a organizar os produtos (ex: "Lanches", "Bebidas", "Sobremesas").
        </p>
      )}

      <div className="space-y-2">
        {categories.map((cat, index) => (
          <div key={cat._id || `new-${index}`} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
              ><ArrowUp className="w-4 h-4" /></button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === categories.length - 1}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
              ><ArrowDown className="w-4 h-4" /></button>
            </div>
            <input
              type="text" value={cat.name}
              onChange={(e) => updateCategory(index, 'name', e.target.value)}
              placeholder="Nome da categoria"
              className="flex-grow px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => removeCategory(index)}
              className="p-2 text-red-500 hover:bg-red-100 rounded"
            ><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
