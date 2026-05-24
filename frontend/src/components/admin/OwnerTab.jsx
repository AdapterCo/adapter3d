import { setDeep, getDeep } from './utils';

export default function OwnerTab({ data, setData }) {
  const setPet = (path, value) => setData({ ...data, pet: setDeep(data.pet || {}, path, value) });
  const petVal = (path, fallback = '') => getDeep(data.pet, path, fallback);

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="font-semibold text-lg border-b pb-2">Tutor (contato público)</h3>
      <p className="text-sm text-gray-500 -mt-2">Esses dados aparecem pra quem ler a tag do seu pet.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
        <input
          type="text" value={petVal('owner.name')}
          onChange={(e) => setPet('owner.name', e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
        <input
          type="text" value={petVal('owner.whatsapp')}
          onChange={(e) => setPet('owner.whatsapp', e.target.value)}
          placeholder="11999999999"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone alternativo</label>
        <input
          type="text" value={petVal('owner.phone')}
          onChange={(e) => setPet('owner.phone', e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
    </div>
  );
}
