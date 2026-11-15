import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível enviar agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Adapter Cards" className="h-16 w-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Esqueci minha senha</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
            <p className="text-gray-700">{sent}</p>
            <p className="text-sm text-gray-500">Não chegou? Confira a caixa de spam ou tente de novo em alguns minutos.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">Digite o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                placeholder="seu@email.com"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-70">
              {loading ? 'Enviando...' : 'Enviar link'}
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
