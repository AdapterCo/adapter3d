import { setDeep, getDeep } from './utils';

export default function HealthTab({ data, setData }) {
  const setPet = (path, value) => setData({ ...data, pet: setDeep(data.pet || {}, path, value) });
  const petVal = (path, fallback = '') => getDeep(data.pet, path, fallback);

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="font-semibold text-lg border-b pb-2">Saúde</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
        <textarea
          value={petVal('allergies')} onChange={(e) => setPet('allergies', e.target.value)} rows={2}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Medicações de uso contínuo</label>
        <textarea
          value={petVal('medications')} onChange={(e) => setPet('medications', e.target.value)} rows={2}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Condições / doenças crônicas</label>
        <textarea
          value={petVal('conditions')} onChange={(e) => setPet('conditions', e.target.value)} rows={2}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <h4 className="font-semibold text-gray-800 pt-2">Veterinário</h4>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome / clínica</label>
        <input
          type="text" value={petVal('vet.name')}
          onChange={(e) => setPet('vet.name', e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input
            type="text" value={petVal('vet.phone')}
            onChange={(e) => setPet('vet.phone', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input
            type="text" value={petVal('vet.address')}
            onChange={(e) => setPet('vet.address', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
