import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const SPECIES = [
  { value: 'dog', label: 'Cachorro' },
  { value: 'cat', label: 'Gato' },
  { value: 'bird', label: 'Ave' },
  { value: 'other', label: 'Outro' }
];

export default function RegisterPet({ tagId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    pet: {
      name: '',
      species: 'dog',
      breed: '',
      owner: { name: '', whatsapp: '' }
    }
  });

  const handlePet = (field, value) => {
    setForm(prev => ({ ...prev, pet: { ...prev.pet, [field]: value } }));
  };
  const handleOwner = (field, value) => {
    setForm(prev => ({
      ...prev,
      pet: { ...prev.pet, owner: { ...prev.pet.owner, [field]: value } }
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.pet.name.trim()) return setError('Informe o nome do pet.');
    if (!form.pet.owner.whatsapp.trim()) return setError('Informe o WhatsApp do tutor (essencial pra te avisarem se o pet for encontrado).');
    if (!form.email || !form.password) return setError('Preencha email e senha.');

    setLoading(true);
    try {
      // Slug do pet = tagId. URL é fixa, gravada no QR da peça.
      const payload = {
        id: tagId,
        email: form.email,
        password: form.password,
        slug: tagId,
        profileType: 'pet',
        pet: form.pet
      };
      const res = await api.post('/auth/register', payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/admin');
    } catch (err) {
      console.error('Register pet error:', err);
      setError(err.response?.data?.message || 'Erro ao criar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 flex items-center"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="bg-orange-100 p-3 rounded-full mb-4">
            <PawPrint className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastrar Pet</h1>
          <p className="text-gray-500 text-center mt-2 text-sm">
            Tag ativada: <strong>{tagId}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sobre o pet</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do pet</label>
              <input
                type="text" value={form.pet.name}
                onChange={(e) => handlePet('name', e.target.value)}
                placeholder="Ex: Rex"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Espécie</label>
                <select
                  value={form.pet.species}
                  onChange={(e) => handlePet('species', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                >
                  {SPECIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raça</label>
                <input
                  type="text" value={form.pet.breed}
                  onChange={(e) => handlePet('breed', e.target.value)}
                  placeholder="Ex: Bulldog"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tutor (contato público)</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
              <input
                type="text" value={form.pet.owner.name}
                onChange={(e) => handleOwner('name', e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
              <input
                type="text" value={form.pet.owner.whatsapp}
                onChange={(e) => handleOwner('whatsapp', e.target.value)}
                placeholder="Ex: 11999999999"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Aparece pra quem ler a tag do seu pet.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Acesso ao painel</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link do pet</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-gray-100">
                <span className="px-3 py-2 text-gray-500 bg-gray-100 text-sm flex-shrink-0 select-none border-r">
                  adapterco.com.br/
                </span>
                <div className="w-full px-3 py-2 text-gray-700 font-mono text-sm">
                  {tagId}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Link fixo, gravado no QR da sua peça.
              </p>
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white rounded-lg py-3 font-medium hover:bg-orange-700 focus:ring-4 focus:ring-orange-300 transition-all disabled:opacity-70"
          >
            {loading ? 'Criando perfil...' : 'Criar Perfil do Pet'}
          </button>
        </form>
      </div>
    </div>
  );
}
