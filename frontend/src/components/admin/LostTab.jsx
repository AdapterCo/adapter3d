import { AlertTriangle } from 'lucide-react';
import { setDeep, getDeep } from './utils';

export default function LostTab({ data, setData }) {
  const setPet = (path, value) => setData({ ...data, pet: setDeep(data.pet || {}, path, value) });
  const petVal = (path, fallback = '') => getDeep(data.pet, path, fallback);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-700">Modo Perdido</h3>
          <p className="text-sm text-red-700/90">
            Quando ativado, o link público do seu pet vira um alerta vermelho com recompensa e botões grandes pra contato. Use só quando o pet realmente sumir.
          </p>
        </div>
      </div>

      <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${petVal('lostMode.active') ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <span className="font-medium text-gray-800">
          {petVal('lostMode.active') ? '🆘 Modo perdido ATIVO' : 'Modo perdido desligado'}
        </span>
        <input
          type="checkbox"
          checked={Boolean(petVal('lostMode.active'))}
          onChange={(e) => setPet('lostMode.active', e.target.checked)}
          className="w-5 h-5"
        />
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Recompensa (opcional)</label>
        <input
          type="text" value={petVal('lostMode.reward')}
          onChange={(e) => setPet('lostMode.reward', e.target.value)}
          placeholder="Ex: R$ 500"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem pra quem encontrar</label>
        <textarea
          value={petVal('lostMode.message')}
          onChange={(e) => setPet('lostMode.message', e.target.value)} rows={3}
          placeholder="Ex: Estou sumido desde o dia X na região Y. Toma medicação. Por favor entre em contato!"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
        />
      </div>

      <p className="text-xs text-gray-500">Lembre-se de salvar as alterações.</p>
    </div>
  );
}
