export default function ContactTab({ data, setData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };
  const setOrder = (field) => (e) => setData(prev => ({ ...prev, orderSettings: { ...(prev.orderSettings || {}), [field]: e.target.value } }));
  const inputClass = 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="font-semibold text-lg border-b pb-2">Contato</h3>
      <p className="text-sm text-gray-500 -mt-2">
        É neste WhatsApp que chegam os pedidos do carrinho.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
        <input
          type="text" name="whatsapp" value={data.whatsapp} onChange={handleChange}
          placeholder="Ex: 11999999999"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">Sem WhatsApp, o carrinho e os botões de pedido não aparecem.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone alternativo (opcional)</label>
        <input
          type="text" name="phone" value={data.phone} onChange={handleChange}
          placeholder="Ex: 1133334444"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="border-t pt-5 space-y-4">
        <div>
          <h4 className="font-semibold">Pix com valor do pedido</h4>
          <p className="text-sm text-gray-500">
            Quando o cliente escolhe Pix no carrinho, ele recebe o QR Code e o <strong>Pix copia e cola já com o valor</strong> do pedido
            e o número do pedido, para você conferir o pagamento.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
          <input type="text" name="pix" value={data.pix || ''} onChange={handleChange} maxLength={77}
            placeholder="CPF/CNPJ, e-mail, chave aleatória ou +5521999998888" className={inputClass} />
          <p className="text-xs text-gray-500 mt-1">Celular como chave: digite com <strong>+55</strong> e DDD.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do recebedor</label>
            <input type="text" value={data.orderSettings?.pixName || ''} onChange={setOrder('pixName')} maxLength={25}
              placeholder={String(data.name || '').slice(0, 25)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input type="text" value={data.orderSettings?.pixCity || ''} onChange={setOrder('pixCity')} maxLength={15}
              placeholder="Ex: Rio de Janeiro" className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-500">Confira se o nome é o mesmo da conta que recebe o Pix. Clique em <strong>Salvar</strong> no topo.</p>
      </div>
    </div>
  );
}
