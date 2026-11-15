import { Trash2, ArrowUp, ArrowDown, Eye, EyeOff, GripVertical } from 'lucide-react';
import useDragReorder, { moveItem } from '../../hooks/useDragReorder';
import { newObjectId } from './utils';

export default function CategoriesTab({ data, setData }) {
  const categories = data.categories || [];

  const addCategory = () => {
    // _id gerado no cliente pra que produtos possam referenciar essa categoria
    // antes do primeiro save.
    const next = [...categories, { _id: newObjectId(), name: '', order: categories.length, isVisible: true }];
    setData({ ...data, categories: next });
  };

  const updateCategory = (index, field, value) => {
    const next = categories.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    setData({ ...data, categories: next });
  };

  const drag = useDragReorder((from, to) => setData(prev => ({ ...prev, categories: moveItem(prev.categories || [], from, to) })));

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

      <div className="space-y-2" data-drag-list>
        {categories.map((cat, index) => (
          <div key={cat._id || `new-${index}`} {...drag.itemProps(index)} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border transition-shadow data-[dragging=true]:ring-2 data-[dragging=true]:ring-blue-400 data-[dragging=true]:shadow-lg data-[dragging=true]:relative data-[dragging=true]:z-10">
            <button type="button" {...drag.handleProps(index)} className="p-1 text-gray-400 hover:text-gray-700 select-none">
              <GripVertical className="w-5 h-5" />
            </button>
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
              type="button"
              onClick={() => updateCategory(index, 'isVisible', cat.isVisible === false ? true : false)}
              className={`p-2 border rounded-lg transition-all ${
                cat.isVisible !== false
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
              }`}
              title={cat.isVisible !== false ? 'Categoria visível no perfil público' : 'Categoria oculta no perfil público'}
            >
              {cat.isVisible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
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
