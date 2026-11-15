import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const MIN_LENGTH = 8;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) return setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setDone(res.data.message);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Adapter Cards" className="h-16 w-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Criar nova senha</h1>
        </div>

        {!token ? (
          <div className="text-center space-y-3">
            <p className="text-gray-700">Este link está incompleto ou expirou.</p>
            <Link to="/esqueci-senha" className="text-blue-600 hover:underline">Pedir um novo link</Link>
          </div>
        ) : done ? (
          <div className="text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
            <p className="text-gray-700">{done}</p>
            <p className="text-sm text-gray-500">Levando você para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_LENGTH} autoFocus
                placeholder="Nova senha (mín. 8 caracteres)" className={inputClass} />
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={MIN_LENGTH}
                placeholder="Repita a nova senha" className={inputClass} />
            </div>
            {error && (
              <p className="text-sm text-red-600">
                {error}{' '}
                {error.includes('expirado') && <Link to="/esqueci-senha" className="underline">Pedir novo link</Link>}
              </p>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-70">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        <Link to="/" className="mt-6 flex items-center justify-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>
      </div>
    </div>
  );
}
