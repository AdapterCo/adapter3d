import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import RegisterPet from './RegisterPet';

export default function Register() {
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    password: '',
    slug: ''
  });
  const [profileType, setProfileType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If we came from Login page with a tagId, pre-fill it
    if (location.state && location.state.tagId) {
      setFormData(prev => ({ ...prev, id: location.state.tagId }));
      setProfileType(location.state.profileType || 'business');
    } else {
      // If accessed directly without a tag, redirect back to login
      navigate('/');
    }
  }, [location, navigate]);

  // Pet tags use a dedicated form (name, species, owner contact).
  if (profileType === 'pet' && formData.id) {
    return <RegisterPet tagId={formData.id} />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Format slug (lowercase, no spaces, no special chars except hyphen)
    if (name === 'slug') {
      const formattedSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      setFormData({ ...formData, [name]: formattedSlug });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.slug || !formData.email || !formData.password) {
      setError('Preencha todos os campos.');
      return;
    }
    if (formData.password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        ...formData,
        profileType: profileType || 'business'
      });
      // Save token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to Admin
      navigate('/admin');
    } catch (err) {
      console.error('Register error:', err);
      setError(err.response?.data?.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 flex items-center"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-3 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finalizar Cadastro</h1>
          <p className="text-gray-500 text-center mt-2 text-sm">
            Tag Ativada: <strong>{formData.id}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personalize seu Link
            </label>
            <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden bg-gray-50">
              <span className="px-3 py-3 text-gray-500 bg-gray-100 text-sm flex-shrink-0 select-none border-r">
                adapterco.com.br/
              </span>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="seunome"
                className="w-full px-3 py-3 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Apenas letras, números e traços. Não pode ser alterado depois facilmente.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all disabled:opacity-70 flex justify-center items-center mt-4"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Criar Perfil'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
