export default function LinksTab({ data, setData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const handleCustomLinkChange = (index, field, value) => {
    const newLinks = [...data.customLinks];
    newLinks[index][field] = value;
    setData({ ...data, customLinks: newLinks });
  };

  const addCustomLink = () => {
    setData({
      ...data,
      customLinks: [...data.customLinks, { title: '', url: '', isActive: true }]
    });
  };

  const removeCustomLink = (index) => {
    const newLinks = [...data.customLinks];
    newLinks.splice(index, 1);
    setData({ ...data, customLinks: newLinks });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Contato Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
            <input
              type="text" name="whatsapp" value={data.whatsapp} onChange={handleChange}
              placeholder="Ex: 11999999999"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / Fixo</label>
            <input
              type="text" name="phone" value={data.phone} onChange={handleChange}
              placeholder="Ex: 1133334444"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
            <input
              type="text" name="pix" value={data.pix} onChange={handleChange}
              placeholder="Chave Aleatória, CPF, etc"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Redes Sociais</h3>
        {['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin'].map(network => (
          <div key={network}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{network}</label>
            <input
              type="url" name={network} value={data[network]} onChange={handleChange}
              placeholder={`https://${network}.com/...`}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2 flex justify-between items-center">
          Links Personalizados
          <button onClick={addCustomLink} className="text-sm text-blue-600 font-medium">+ Adicionar</button>
        </h3>
        {data.customLinks.map((link, index) => (
          <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg border">
            <div className="flex-grow space-y-2">
              <input
                type="text" value={link.title}
                onChange={(e) => handleCustomLinkChange(index, 'title', e.target.value)}
                placeholder="Título"
                className="w-full px-3 py-1.5 border rounded text-sm outline-none"
              />
              <input
                type="url" value={link.url}
                onChange={(e) => handleCustomLinkChange(index, 'url', e.target.value)}
                placeholder="URL"
                className="w-full px-3 py-1.5 border rounded text-sm outline-none"
              />
            </div>
            <button
              onClick={() => removeCustomLink(index)}
              className="p-2 text-red-500 hover:bg-red-100 rounded mt-1"
            >X</button>
          </div>
        ))}
      </div>
    </div>
  );
}
