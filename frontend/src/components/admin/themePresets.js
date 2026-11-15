// Temas prontos por segmento. Cada um define fundo, texto e botões; a foto de
// fundo (se houver) fica guardada e volta se o lojista escolher "Imagem" de novo.
const solid = (backgroundColor, textColor, buttonColor, buttonTextColor = '#ffffff') =>
  ({ backgroundType: 'solid', backgroundColor, textColor, buttonColor, buttonTextColor });
const gradient = (from, to, textColor, buttonColor, buttonTextColor = '#ffffff') =>
  ({ backgroundType: 'gradient', backgroundGradient: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`, textColor, buttonColor, buttonTextColor });

export const THEME_PRESETS = {
  menu: [
    { id: 'lanchonete', name: 'Lanchonete', emoji: '🍟', theme: gradient('#dc2626', '#f97316', '#ffffff', '#facc15', '#1f2937') },
    { id: 'hamburgueria', name: 'Hamburgueria', emoji: '🍔', theme: solid('#1c1917', '#fafaf9', '#f59e0b', '#1c1917') },
    { id: 'pizzaria', name: 'Pizzaria', emoji: '🍕', theme: gradient('#7f1d1d', '#b91c1c', '#ffffff', '#16a34a') },
    { id: 'acai', name: 'Açaí', emoji: '🍇', theme: gradient('#4c1d95', '#7e22ce', '#ffffff', '#ec4899') },
    { id: 'cafeteria', name: 'Cafeteria', emoji: '☕', theme: solid('#f5ebe0', '#3e2723', '#6f4e37') },
    { id: 'japones', name: 'Japonês', emoji: '🍣', theme: solid('#111827', '#f9fafb', '#dc2626') },
    { id: 'doceria', name: 'Doceria', emoji: '🧁', theme: gradient('#fce7f3', '#fbcfe8', '#831843', '#db2777') },
    { id: 'saudavel', name: 'Saudável', emoji: '🥗', theme: solid('#ecfdf5', '#064e3b', '#059669') }
  ],
  storefront: [
    { id: 'moda', name: 'Moda', emoji: '👗', theme: solid('#fafaf9', '#1c1917', '#1c1917') },
    { id: 'beleza', name: 'Beleza', emoji: '💄', theme: gradient('#fdf2f8', '#fae8ff', '#701a75', '#a21caf') },
    { id: 'petshop', name: 'Petshop', emoji: '🐾', theme: gradient('#e0f2fe', '#fef9c3', '#0c4a6e', '#0284c7') },
    { id: 'eletronicos', name: 'Eletrônicos', emoji: '🎧', theme: gradient('#0f172a', '#1e3a8a', '#f8fafc', '#22d3ee', '#0f172a') },
    { id: 'artesanato', name: 'Artesanato', emoji: '🧶', theme: solid('#fef3c7', '#78350f', '#b45309') },
    { id: 'infantil', name: 'Infantil', emoji: '🧸', theme: gradient('#dbeafe', '#fce7f3', '#1e3a8a', '#f43f5e') }
  ],
  business: [
    { id: 'profissional', name: 'Profissional', emoji: '💼', theme: solid('#f8fafc', '#0f172a', '#1e40af') },
    { id: 'elegante', name: 'Elegante', emoji: '✨', theme: solid('#0a0a0a', '#fafafa', '#d4af37', '#0a0a0a') },
    { id: 'saude', name: 'Saúde', emoji: '🩺', theme: solid('#f0fdfa', '#134e4a', '#0d9488') },
    { id: 'criativo', name: 'Criativo', emoji: '🎨', theme: gradient('#f97316', '#db2777', '#ffffff', '#ffffff', '#db2777') },
    { id: 'oceano', name: 'Oceano', emoji: '🌊', theme: gradient('#4facfe', '#00f2fe', '#0f172a', '#0f172a') },
    { id: 'minimalista', name: 'Minimalista', emoji: '⚪', theme: solid('#ffffff', '#171717', '#171717') },
    { id: 'natureza', name: 'Natureza', emoji: '🌿', theme: gradient('#ecfccb', '#d9f99d', '#365314', '#4d7c0f') },
    { id: 'noturno', name: 'Noturno', emoji: '🌙', theme: gradient('#1e1b4b', '#312e81', '#e0e7ff', '#818cf8', '#1e1b4b') }
  ],
  pet: [
    { id: 'aventureiro', name: 'Aventureiro', emoji: '🦴', theme: gradient('#fef3c7', '#fde68a', '#78350f', '#ea580c') },
    { id: 'ceu', name: 'Céu', emoji: '☁️', theme: gradient('#e0f2fe', '#bae6fd', '#0c4a6e', '#0284c7') },
    { id: 'rosa', name: 'Rosa', emoji: '🎀', theme: solid('#fce7f3', '#831843', '#db2777') },
    { id: 'floresta', name: 'Floresta', emoji: '🌿', theme: solid('#ecfdf5', '#14532d', '#16a34a') }
  ]
};

export const presetsFor = (profileType) => THEME_PRESETS[profileType] || THEME_PRESETS.business;

// Fundo CSS de um tema (para a miniatura).
export const previewBackground = (t) => (t.backgroundType === 'gradient' ? t.backgroundGradient : t.backgroundColor);

// O tema atual é igual a este preset?
export const isPresetActive = (current, preset) => Object.entries(preset)
  .every(([k, v]) => String(current?.[k] || '').toLowerCase() === String(v).toLowerCase());
