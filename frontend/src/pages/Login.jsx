import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, Tag } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // If we arrived from TagRedirect with an unactivated tag, open the "Ativar Tag" tab pre-filled.
  const incomingTagId = location.state?.tagId || '';
  const [activeTab, setActiveTab] = useState(incomingTagId ? 'tag' : 'login');

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Tag Form State
  const [tagId, setTagId] = useState(incomingTagId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(incomingTagId ? 'Esta Tag ainda não está ativada. Conclua o cadastro abaixo.' : '');

  useEffect(() => {
    if (incomingTagId) {
      // Clear router state so a manual refresh doesn't keep showing the message.
      window.history.replaceState({}, document.title);
    }
  }, [incomingTagId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email: email.trim(), password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Erro ao acessar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateTag = async (e) => {
    e.preventDefault();
    if (!tagId.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/validate-tag', { id: tagId.trim() });
      if (response.data.valid) {
        // Repassa profileType pro Register decidir qual formulário renderizar.
        navigate('/register', {
          state: { tagId: tagId.trim(), profileType: response.data.profileType || 'business' }
        });
      }
    } catch (err) {
      console.error('Validate tag error:', err);
      setError(err.response?.data?.message || 'Erro ao validar a Tag.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        
        {/* Header */}
        <div className="p-8 pb-6 flex flex-col items-center">
          <img src="/logo.png" alt="Adapter Cards" className="h-20 w-auto" />
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 text-sm font-medium flex justify-center items-center transition-colors ${activeTab === 'login' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Entrar
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium flex justify-center items-center transition-colors ${activeTab === 'tag' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => { setActiveTab('tag'); setError(''); }}
          >
            <Tag className="w-4 h-4 mr-2" />
            Ativar Nova Tag
          </button>
        </div>

        <div className="p-8 pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
                <div className="text-right mt-1">
                  <Link to="/esqueci-senha" className="text-sm text-blue-600 hover:underline">Esqueci minha senha</Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all disabled:opacity-70 flex justify-center items-center"
              >
                {loading ? 'Entrando...' : 'Entrar no Painel'}
              </button>
            </form>
          )}

          {/* Validate Tag Form */}
          {activeTab === 'tag' && (
            <form onSubmit={handleValidateTag} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID da Tag
                </label>
                <input
                  type="text"
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  placeholder="Ex: cliente001"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Insira o código único da sua Tag para iniciar a criação do seu perfil.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white rounded-lg py-3 font-medium hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-all disabled:opacity-70 flex justify-center items-center"
              >
                {loading ? 'Validando...' : 'Continuar para Cadastro'}
              </button>
            </form>
          )}
        </div>
        <div className="px-8 pb-6 text-center text-xs text-gray-400 space-x-3">
          <Link to="/termos" className="hover:underline">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:underline">Privacidade</Link>
        </div>
      </div>
    </div>
  );
}
