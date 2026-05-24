export default function BasicTab({ data, setData, onImageUpload }) {
  const isPet = data.profileType === 'pet';
  const isFixedSlug = isPet;
  const avatarLabel = isPet
    ? 'Foto do Pet'
    : data.profileType === 'menu' || data.profileType === 'storefront'
      ? 'Logo do Estabelecimento'
      : 'Foto de Perfil';

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'slug') {
      const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      setData({ ...data, [name]: formatted });
    } else {
      setData({ ...data, [name]: value });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isFixedSlug ? 'Link Público (fixo)' : 'Link Personalizado (URL)'}
        </label>
        {isFixedSlug ? (
          <>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-gray-100">
              <span className="px-3 py-2 text-gray-500 bg-gray-100 text-sm flex-shrink-0 select-none border-r">
                {window.location.host}/
              </span>
              <div className="w-full px-3 py-2 text-gray-700 font-mono text-sm">
                {data.slug}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Link fixo, gravado no QR da peça. Não pode ser alterado.
            </p>
          </>
        ) : (
          <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden bg-gray-50">
            <span className="px-3 py-2 text-gray-500 bg-gray-100 text-sm flex-shrink-0 select-none border-r">
              {window.location.host}/
            </span>
            <input
              type="text" name="slug" value={data.slug} onChange={handleChange}
              className="w-full px-3 py-2 bg-transparent outline-none text-gray-900"
            />
          </div>
        )}
      </div>

      {!isPet && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {data.profileType === 'menu' || data.profileType === 'storefront' ? 'Nome do Estabelecimento' : 'Nome Completo'}
          </label>
          <input
            type="text" name="name" value={data.name} onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{avatarLabel}</label>
        <div className="flex items-center space-x-4">
          {data.avatar && (
            <img src={data.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" />
          )}
          <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border">
            Escolher Imagem
            <input
              type="file" className="hidden" accept="image/*"
              onChange={(e) => onImageUpload(e, 'avatar')}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
