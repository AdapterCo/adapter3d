import { setDeep, getDeep } from './utils';

export default function PetTab({ data, setData }) {
  const setPet = (path, value) => setData({ ...data, pet: setDeep(data.pet || {}, path, value) });
  const petVal = (path, fallback = '') => getDeep(data.pet, path, fallback);

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="font-semibold text-lg border-b pb-2">Dados do Pet</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
        <input
          type="text" value={petVal('name')}
          onChange={(e) => setPet('name', e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Espécie</label>
          <select
            value={petVal('species', 'dog')}
            onChange={(e) => setPet('species', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="dog">Cachorro</option>
            <option value="cat">Gato</option>
            <option value="bird">Ave</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Raça</label>
          <input
            type="text" value={petVal('breed')}
            onChange={(e) => setPet('breed', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
          <input
            type="date"
            value={petVal('birthDate') ? String(petVal('birthDate')).slice(0, 10) : ''}
            onChange={(e) => setPet('birthDate', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
          <select
            value={petVal('gender', '')}
            onChange={(e) => setPet('gender', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">—</option>
            <option value="male">Macho</option>
            <option value="female">Fêmea</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
          <input
            type="text" value={petVal('color')}
            onChange={(e) => setPet('color', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
          <input
            type="number" step="0.1" value={petVal('weight') ?? ''}
            onChange={(e) => setPet('weight', e.target.value === '' ? null : parseFloat(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Microchip</label>
        <input
          type="text" value={petVal('microchip')}
          onChange={(e) => setPet('microchip', e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox" checked={Boolean(petVal('neutered', false))}
          onChange={(e) => setPet('neutered', e.target.checked)}
          className="w-4 h-4"
        />
        Castrado
      </label>
    </div>
  );
}
