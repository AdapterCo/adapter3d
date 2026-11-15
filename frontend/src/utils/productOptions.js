// Variações e adicionais do produto (ex.: "Tamanho": P/M/G; "Adicionais": bacon,
// cheddar). Cada grupo tem min/max de escolhas; cada opção pode somar ao preço.
// Preços em CENTAVOS. O carrinho guarda só os ids das opções escolhidas.

export const groupsOf = (product) => (product?.optionGroups || []).filter(g => (g.options || []).length > 0);
export const hasOptions = (product) => groupsOf(product).length > 0;

// Chave da linha do carrinho: o mesmo produto com opções diferentes vira outra linha.
// Sem opções, a chave é o próprio id (compatível com carrinhos já salvos).
export const lineKey = (productId, optionIds = []) => (
  optionIds.length ? `${productId}|${[...optionIds].map(String).sort().join(',')}` : String(productId)
);

// Opções escolhidas que ainda existem no produto, na ordem do cadastro.
export function selectedOptions(product, optionIds = []) {
  const wanted = new Set((optionIds || []).map(String));
  const out = [];
  for (const g of groupsOf(product)) {
    for (const o of g.options) if (wanted.has(String(o._id))) out.push({ group: g, option: o });
  }
  return out;
}

export const unitPrice = (product, optionIds = []) => (product?.price || 0)
  + selectedOptions(product, optionIds).reduce((s, { option }) => s + (option.price || 0), 0);

// "Grande, Bacon, Cheddar"
export const optionsLabel = (product, optionIds = []) => selectedOptions(product, optionIds)
  .map(({ option }) => option.name).join(', ');

export const groupRule = (g) => {
  const min = Number(g.min) || 0;
  const max = Math.max(1, Number(g.max) || 1);
  if (min > 0 && min === max) return max === 1 ? 'Escolha 1' : `Escolha ${max}`;
  if (min > 0) return `Escolha de ${min} a ${max}`;
  return max === 1 ? 'Opcional' : `Opcional · até ${max}`;
};

// Mensagem de erro ou null se a escolha respeita min/max de todos os grupos.
export function validateSelection(product, optionIds = []) {
  const wanted = new Set((optionIds || []).map(String));
  for (const g of groupsOf(product)) {
    const n = g.options.filter(o => wanted.has(String(o._id))).length;
    const min = Number(g.min) || 0;
    const max = Math.max(1, Number(g.max) || 1);
    if (n < min) return `Escolha ${min === 1 ? 'uma opção' : `${min} opções`} em "${g.name}".`;
    if (n > max) return `Escolha no máximo ${max} em "${g.name}".`;
  }
  return null;
}

// Preço "de/por": só mostra o riscado quando é maior que o preço atual.
export const hasPromo = (p) => Number(p?.compareAtPrice) > Number(p?.price || 0);
