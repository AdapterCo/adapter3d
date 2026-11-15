import { presetsFor, previewBackground, isPresetActive } from './themePresets';

export default function ThemeTab({ data, setData, onImageUpload }) {
  const handleThemeChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, theme: { ...data.theme, [name]: value } });
  };

  const presets = presetsFor(data.profileType);
  const applyPreset = (preset) => setData({ ...data, theme: { ...data.theme, ...preset.theme } });

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="space-y-3">
        <div className="border-b pb-2">
          <h3 className="font-semibold text-lg">Temas prontos</h3>
          <p className="text-xs text-gray-500">Escolha um tema e clique em Salvar. Depois dá para ajustar as cores abaixo.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {presets.map(p => {
            const active = isPresetActive(data.theme, p.theme);
            return (
              <button
                key={p.id} type="button" onClick={() => applyPreset(p)} aria-pressed={active}
                className={`rounded-xl overflow-hidden border text-left transition-all hover:shadow-md ${active ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}`}
              >
                <div className="h-20 p-3 flex flex-col justify-between" style={{ background: previewBackground(p.theme) }}>
                  <span className="text-sm font-bold truncate" style={{ color: p.theme.textColor }}>{p.emoji} {p.name}</span>
                  <span className="self-start px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: p.theme.buttonColor, color: p.theme.buttonTextColor }}>{data.profileType === 'menu' || data.profileType === 'storefront' ? 'Pedir' : 'Contato'}</span>
                </div>
                <div className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-white flex items-center justify-between">
                  {p.name}{active && <span className="text-blue-600">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Fundo (Background)</h3>
        <div className="grid grid-cols-3 gap-3">
          {['solid', 'gradient', 'image'].map(type => (
            <button
              key={type}
              onClick={() => setData({ ...data, theme: { ...data.theme, backgroundType: type } })}
              className={`p-3 rounded-lg border text-sm font-medium capitalize transition-all ${data.theme.backgroundType === type ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'bg-white hover:bg-gray-50 text-gray-600'}`}
            >
              {type === 'solid' ? 'Cor Sólida' : type === 'gradient' ? 'Gradiente' : 'Imagem'}
            </button>
          ))}
        </div>

        {data.theme.backgroundType === 'solid' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Fundo</label>
            <input
              type="color" name="backgroundColor" value={data.theme.backgroundColor}
              onChange={handleThemeChange}
              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
            />
          </div>
        )}

        {data.theme.backgroundType === 'gradient' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gradiente CSS</label>
            <input
              type="text" name="backgroundGradient" value={data.theme.backgroundGradient}
              onChange={handleThemeChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            />
          </div>
        )}

        {data.theme.backgroundType === 'image' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagem de Fundo</label>
            {data.theme.backgroundImage && (
              <div
                className="w-full h-32 rounded-lg bg-cover bg-center border mb-3"
                style={{ backgroundImage: `url(${data.theme.backgroundImage})` }}
              ></div>
            )}
            <label className="cursor-pointer bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors border text-center block w-fit">
              Upload de Imagem
              <input
                type="file" className="hidden" accept="image/*"
                onChange={(e) => onImageUpload(e, 'backgroundImage')}
              />
            </label>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Cores dos Elementos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Texto</label>
            <input
              type="color" name="textColor" value={data.theme.textColor}
              onChange={handleThemeChange}
              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor de Fundo dos Botões</label>
            <input
              type="color" name="buttonColor" value={data.theme.buttonColor}
              onChange={handleThemeChange}
              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Texto dos Botões</label>
            <input
              type="color" name="buttonTextColor" value={data.theme.buttonTextColor}
              onChange={handleThemeChange}
              className="w-12 h-12 rounded cursor-pointer border-0 p-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
