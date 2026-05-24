export default function ContactTab({ data, setData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="font-semibold text-lg border-b pb-2">Contato</h3>
      <p className="text-sm text-gray-500 -mt-2">
        O WhatsApp aqui é usado pelo botão "Comprar via WhatsApp" em cada produto da vitrine.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
        <input
          type="text" name="whatsapp" value={data.whatsapp} onChange={handleChange}
          placeholder="Ex: 11999999999"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">Sem o botão funcional se o WhatsApp não for preenchido.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone alternativo (opcional)</label>
        <input
          type="text" name="phone" value={data.phone} onChange={handleChange}
          placeholder="Ex: 1133334444"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
    </div>
  );
}
