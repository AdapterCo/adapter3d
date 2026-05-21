import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, LogOut, Share2, Copy, ExternalLink, RefreshCw, Eye, X, AlertTriangle } from 'lucide-react';
import QRCode from 'react-qr-code';
import api from '../services/api';
import PublicCard from './PublicCard';

// Set a nested value (e.g. "pet.owner.whatsapp") immutably.
function setDeep(obj, path, value) {
  const keys = path.split('.');
  const next = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] && typeof cur[k] === 'object' ? { ...cur[k] } : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}
function getDeep(obj, path, fallback = '') {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj) ?? fallback;
}

export default function Admin() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    // Check if logged in
    if (!localStorage.getItem('token')) {
      navigate('/');
    } else {
      fetchUserData();
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Format slug
    if (name === 'slug') {
      const formattedSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      setData({ ...data, [name]: formattedSlug });
    } else {
      setData({ ...data, [name]: value });
    }
  };

  const handleThemeChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, theme: { ...data.theme, [name]: value } });
  };

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (fieldName === 'avatar') {
        setData({ ...data, avatar: res.data.url });
      } else if (fieldName === 'backgroundImage') {
        setData({ ...data, theme: { ...data.theme, backgroundImage: res.data.url } });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao fazer upload da imagem.');
    }
  };

  const handleCustomLinkChange = (index, field, value) => {
    const newLinks = [...data.customLinks];
    newLinks[index][field] = value;
    setData({ ...data, customLinks: newLinks });
  };

  const addCustomLink = () => {
    setData({
      ...data,
      customLinks: [...data.customLinks, { title: '', url: '', isActive: true }]
    });
  };

  const removeCustomLink = (index) => {
    const newLinks = [...data.customLinks];
    newLinks.splice(index, 1);
    setData({ ...data, customLinks: newLinks });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Pet profile: keep `name` (used by JWT/login response) in sync with the pet's name.
      const payload = data.profileType === 'pet' && data.pet?.name
        ? { ...data, name: data.pet.name }
        : data;
      await api.put(`/users/${data.id}`, payload);
      alert('Alterações salvas com sucesso!');
      
      // Update local storage user if slug changed
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      localUser.slug = data.slug;
      localStorage.setItem('user', JSON.stringify(localUser));
      
    } catch (error) {
      console.error('Error saving data:', error);
      alert(error.response?.data?.message || 'Erro ao salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando painel...</div>;
  if (!data) return null;

  const isPet = data.profileType === 'pet';
  const tabs = isPet
    ? ['basic', 'pet', 'owner', 'health', 'lost', 'theme']
    : ['basic', 'links', 'theme'];
  const tabLabel = {
    basic: 'Informações',
    links: 'Redes & Contato',
    theme: 'Aparência',
    pet: 'Pet',
    owner: 'Tutor',
    health: 'Saúde',
    lost: '🆘 Modo Perdido'
  };

  const setPet = (path, value) => setData(prev => ({ ...prev, pet: setDeep(prev.pet || {}, path, value) }));
  const petVal = (path, fallback = '') => getDeep(data.pet, path, fallback);

  const publicUrl = `${window.location.origin}/${data.slug}`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Editor Section (agora ocupa toda a largura — preview vai pro modal) */}
      <div className="w-full bg-white min-h-screen overflow-y-auto shadow-xl z-10 flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-20">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Painel de Controle</h1>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center mt-1">
              {window.location.host}/{data.slug} <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreviewModal(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center transition-colors">
              <Eye className="w-5 h-5 mr-1" /> <span className="hidden sm:inline">Preview</span>
            </button>
            <button onClick={() => setShowShareModal(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center transition-colors">
              <Share2 className="w-5 h-5 mr-1" /> <span className="hidden sm:inline">Compartilhar</span>
            </button>
            <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex items-center transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center font-medium transition-colors disabled:opacity-70"
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b px-6 pt-4 space-x-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === tab ? (tab === 'lost' ? 'border-red-600 text-red-600' : 'border-blue-600 text-blue-600') : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tabLabel[tab]}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-6 flex-grow">
          {activeTab === 'basic' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Personalizado (URL)</label>
                <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden bg-gray-50">
                  <span className="px-3 py-2 text-gray-500 bg-gray-100 text-sm flex-shrink-0 select-none border-r">
                    {window.location.host}/
                  </span>
                  <input type="text" name="slug" value={data.slug} onChange={handleChange} className="w-full px-3 py-2 bg-transparent outline-none text-gray-900" />
                </div>
              </div>
              {!isPet && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input type="text" name="name" value={data.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isPet ? 'Foto do Pet' : 'Foto de Perfil'}</label>
                <div className="flex items-center space-x-4">
                  {data.avatar && <img src={data.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" />}
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border">
                    Escolher Imagem
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ... (Links and Theme tabs remain largely the same, I will include them to ensure completeness) ... */}
          {activeTab === 'links' && (
            <div className="space-y-8 max-w-2xl">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Contato Rápido</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
                    <input type="text" name="whatsapp" value={data.whatsapp} onChange={handleChange} placeholder="Ex: 11999999999" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / Fixo</label>
                    <input type="text" name="phone" value={data.phone} onChange={handleChange} placeholder="Ex: 1133334444" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
                    <input type="text" name="pix" value={data.pix} onChange={handleChange} placeholder="Chave Aleatória, CPF, etc" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Redes Sociais</h3>
                {['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin'].map(network => (
                  <div key={network}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{network}</label>
                    <input type="url" name={network} value={data[network]} onChange={handleChange} placeholder={`https://${network}.com/...`} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex justify-between items-center">
                  Links Personalizados
                  <button onClick={addCustomLink} className="text-sm text-blue-600 font-medium">+ Adicionar</button>
                </h3>
                {data.customLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg border">
                    <div className="flex-grow space-y-2">
                      <input type="text" value={link.title} onChange={(e) => handleCustomLinkChange(index, 'title', e.target.value)} placeholder="Título" className="w-full px-3 py-1.5 border rounded text-sm outline-none" />
                      <input type="url" value={link.url} onChange={(e) => handleCustomLinkChange(index, 'url', e.target.value)} placeholder="URL" className="w-full px-3 py-1.5 border rounded text-sm outline-none" />
                    </div>
                    <button onClick={() => removeCustomLink(index)} className="p-2 text-red-500 hover:bg-red-100 rounded mt-1">X</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pet' && isPet && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="font-semibold text-lg border-b pb-2">Dados do Pet</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={petVal('name')} onChange={(e) => setPet('name', e.target.value)}
                       className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Espécie</label>
                  <select value={petVal('species', 'dog')} onChange={(e) => setPet('species', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="dog">Cachorro</option>
                    <option value="cat">Gato</option>
                    <option value="bird">Ave</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raça</label>
                  <input type="text" value={petVal('breed')} onChange={(e) => setPet('breed', e.target.value)}
                         className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                  <input type="date" value={petVal('birthDate') ? String(petVal('birthDate')).slice(0, 10) : ''}
                         onChange={(e) => setPet('birthDate', e.target.value)}
                         className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select value={petVal('gender', '')} onChange={(e) => setPet('gender', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">—</option>
                    <option value="male">Macho</option>
                    <option value="female">Fêmea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                  <input type="text" value={petVal('color')} onChange={(e) => setPet('color', e.target.value)}
                         className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input type="number" step="0.1" value={petVal('weight') ?? ''}
                         onChange={(e) => setPet('weight', e.target.value === '' ? null : parseFloat(e.target.value))}
                         className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Microchip</label>
                <input type="text" value={petVal('microchip')} onChange={(e) => setPet('microchip', e.target.value)}
                       className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={Boolean(petVal('neutered', false))}
                       onChange={(e) => setPet('neutered', e.target.checked)}
                       className="w-4 h-4" />
                Castrado
              </label>
            </div>
          )}

          {activeTab === 'owner' && isPet && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="font-semibold text-lg border-b pb-2">Tutor (contato público)</h3>
              <p className="text-sm text-gray-500 -mt-2">Esses dados aparecem pra quem ler a tag do seu pet.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={petVal('owner.name')} onChange={(e) => setPet('owner.name', e.target.value)}
                       className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
                <input type="text" value={petVal('owner.whatsapp')} onChange={(e) => setPet('owner.whatsapp', e.target.value)}
                       placeholder="11999999999"
                       className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone alternativo</label>
                <input type="text" value={petVal('owner.phone')} onChange={(e) => setPet('owner.phone', e.target.value)}
                       className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          )}

          {activeTab === 'health' && isPet && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="font-semibold text-lg border-b pb-2">Saúde</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
                <textarea value={petVal('allergies')} onChange={(e) => setPet('allergies', e.target.value)} rows={2}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicações de uso contínuo</label>
                <textarea value={petVal('medications')} onChange={(e) => setPet('medications', e.target.value)} rows={2}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condições / doenças crônicas</label>
                <textarea value={petVal('conditions')} onChange={(e) => setPet('conditions', e.target.value)} rows={2}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <h4 className="font-semibold text-gray-800 pt-2">Veterinário</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome / clínica</label>
                <input type="text" value={petVal('vet.name')} onChange={(e) => setPet('vet.name', e.target.value)}
                       className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" value={petVal('vet.phone')} onChange={(e) => setPet('vet.phone', e.target.value)}
                         className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input type="text" value={petVal('vet.address')} onChange={(e) => setPet('vet.address', e.target.value)}
                         className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lost' && isPet && (
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
                <input type="text" value={petVal('lostMode.reward')} onChange={(e) => setPet('lostMode.reward', e.target.value)}
                       placeholder="Ex: R$ 500"
                       className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem pra quem encontrar</label>
                <textarea value={petVal('lostMode.message')} onChange={(e) => setPet('lostMode.message', e.target.value)} rows={3}
                          placeholder="Ex: Estou sumido desde o dia X na região Y. Toma medicação. Por favor entre em contato!"
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              </div>

              <p className="text-xs text-gray-500">Lembre-se de salvar as alterações.</p>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-8 max-w-2xl">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Fundo (Background)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['solid', 'gradient', 'image'].map(type => (
                    <button
                      key={type}
                      onClick={() => setData({ ...data, theme: { ...data.theme, backgroundType: type } })}
                      className={`p-3 rounded-lg border text-sm font-medium capitalize transition-all ${data.theme.backgroundType === type ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'bg-white hover:bg-gray-50 text-gray-600'}`}
                    >
                      {type === 'solid' ? 'Cor Sólida' : type === 'gradient' ? 'Gradiente' : 'Imagem'}
                    </button>
                  ))}
                </div>

                {data.theme.backgroundType === 'solid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Fundo</label>
                    <input type="color" name="backgroundColor" value={data.theme.backgroundColor} onChange={handleThemeChange} className="w-12 h-12 rounded cursor-pointer border-0 p-0" />
                  </div>
                )}
                
                {data.theme.backgroundType === 'gradient' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gradiente CSS</label>
                    <input type="text" name="backgroundGradient" value={data.theme.backgroundGradient} onChange={handleThemeChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" />
                  </div>
                )}

                {data.theme.backgroundType === 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imagem de Fundo</label>
                    {data.theme.backgroundImage && (
                      <div className="w-full h-32 rounded-lg bg-cover bg-center border mb-3" style={{ backgroundImage: `url(${data.theme.backgroundImage})` }}></div>
                    )}
                    <label className="cursor-pointer bg-white hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors border text-center block w-fit">
                      Upload de Imagem
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Cores dos Elementos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Texto</label>
                    <input type="color" name="textColor" value={data.theme.textColor} onChange={handleThemeChange} className="w-12 h-12 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor de Fundo dos Botões</label>
                    <input type="color" name="buttonColor" value={data.theme.buttonColor} onChange={handleThemeChange} className="w-12 h-12 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor do Texto dos Botões</label>
                    <input type="color" name="buttonTextColor" value={data.theme.buttonTextColor} onChange={handleThemeChange} className="w-12 h-12 rounded cursor-pointer border-0 p-0" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal — fullscreen no mobile, mockup de celular centralizado no desktop */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
          {/* Header do modal */}
          <div className="flex justify-between items-center px-4 py-3 bg-gray-800 text-white shadow-lg">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span className="font-medium">Preview do Cartão</span>
            </div>
            <button
              onClick={() => setShowPreviewModal(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Voltar a editar</span>
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-hidden flex justify-center items-center md:p-8">
            {/* Mobile: PublicCard ocupa tudo. Desktop: dentro de mockup de celular */}
            <div className="w-full h-full md:w-[320px] md:h-[650px] md:bg-black md:rounded-[40px] md:border-[8px] md:border-black md:shadow-2xl overflow-hidden relative bg-white">
              <div className="hidden md:block absolute top-0 inset-x-0 h-6 bg-black z-20 rounded-b-xl w-32 mx-auto"></div>
              <div className="w-full h-full overflow-y-auto no-scrollbar bg-white">
                <PublicCard previewData={data} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              Compartilhar Cartão
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">X</button>
            </h3>
            <div className="flex justify-center mb-6 p-4 bg-gray-50 rounded-xl border">
              <QRCode value={publicUrl} size={180} />
            </div>
            <div className="space-y-3">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700">
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir Link
              </a>
              <button onClick={() => { navigator.clipboard.writeText(publicUrl); alert('Link copiado!'); }} className="w-full flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <Copy className="w-4 h-4 mr-2" /> Copiar Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
