import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, LogOut, Share2, Copy, ExternalLink, RefreshCw, Eye, X, Nfc } from 'lucide-react';
import QRCode from 'react-qr-code';
import api from '../services/api';
import PublicCard from './PublicCard';
import NfcWriter from '../components/admin/NfcWriter';

import BasicTab from '../components/admin/BasicTab';
import LinksTab from '../components/admin/LinksTab';
import ThemeTab from '../components/admin/ThemeTab';
import PetTab from '../components/admin/PetTab';
import OwnerTab from '../components/admin/OwnerTab';
import HealthTab from '../components/admin/HealthTab';
import LostTab from '../components/admin/LostTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import ProductsTab from '../components/admin/ProductsTab';
import ContactTab from '../components/admin/ContactTab';
import ReviewTab from '../components/admin/ReviewTab';
import OrdersTab from '../components/admin/OrdersTab';
import StatsTab from '../components/admin/StatsTab';
import PlanTab from '../components/admin/PlanTab';

const TABS_BY_TYPE = {
  business: ['basic', 'stats', 'links', 'review', 'theme'],
  pet: ['basic', 'stats', 'pet', 'owner', 'health', 'lost', 'theme'],
  menu: ['basic', 'stats', 'plan', 'categories', 'products', 'orders', 'contact', 'review', 'theme'],
  storefront: ['basic', 'stats', 'plan', 'categories', 'products', 'orders', 'contact', 'review', 'theme']
};

const TAB_LABEL = {
  basic: 'Informações',
  links: 'Redes & Contato',
  theme: 'Aparência',
  pet: 'Pet',
  owner: 'Tutor',
  health: 'Saúde',
  lost: '🆘 Modo Perdido',
  categories: 'Categorias',
  products: 'Produtos',
  contact: 'Contato',
  review: '📍 Google Maps',
  orders: '🛒 Pedidos',
  stats: '📊 Estatísticas',
  plan: '💳 Plano'
};

const TAB_COMPONENT = {
  basic: BasicTab,
  links: LinksTab,
  theme: ThemeTab,
  pet: PetTab,
  owner: OwnerTab,
  health: HealthTab,
  lost: LostTab,
  categories: CategoriesTab,
  products: ProductsTab,
  contact: ContactTab,
  review: ReviewTab,
  orders: OrdersTab,
  stats: StatsTab,
  plan: PlanTab
};

export default function Admin() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showNfc, setShowNfc] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (!localStorage.getItem('token')) {
      navigate('/');
    } else {
      fetchUserData();
    }
  }, [navigate]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      // Pet: mantém `name` (usado pelo JWT/login) sincronizado com nome do pet.
      const payload = data.profileType === 'pet' && data.pet?.name
        ? { ...data, name: data.pet.name }
        : data;
      await api.put(`/users/${data.id}`, payload);
      alert('Alterações salvas com sucesso!');

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

  const tabs = TABS_BY_TYPE[data.profileType] || TABS_BY_TYPE.business;
  const ActiveTabComponent = TAB_COMPONENT[activeTab] || BasicTab;
  const publicUrl = `${window.location.origin}/${data.slug}`;
  // Endereço fixo da tag: é ele que vai no chip NFC e nos QRs impressos.
  // /tag/:id redireciona para o slug atual, então trocar o link do perfil
  // não quebra nada que já foi gravado ou impresso.
  const permanentUrl = `${window.location.origin}/tag/${encodeURIComponent(data.id)}`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
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
            <button onClick={() => setShowNfc(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center transition-colors" title="Gravar tag NFC">
              <Nfc className="w-5 h-5 mr-1" /> <span className="hidden sm:inline">Gravar tag</span>
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

        {/* Aviso de assinatura (cardápio/vitrine): perfil fora do ar */}
        {data.subscriptionState?.required && !data.subscriptionState.active && (
          <div className={`mx-6 mt-4 rounded-lg border p-3 text-sm flex flex-wrap items-center justify-between gap-2 ${data.subscriptionState.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <span>
              {data.subscriptionState.status === 'pending'
                ? 'Seu perfil entra no ar assim que o primeiro pagamento for confirmado. Você já pode montar tudo por aqui.'
                : 'Seu perfil está fora do ar: a assinatura não está paga.'}
            </span>
            <button onClick={() => setActiveTab('plan')} className="px-3 py-1.5 rounded-md bg-white border font-medium hover:bg-gray-50">
              Ver plano e pagar
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b px-6 pt-4 space-x-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === tab ? (tab === 'lost' ? 'border-red-600 text-red-600' : 'border-blue-600 text-blue-600') : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-6 flex-grow">
          <ActiveTabComponent
            data={data}
            setData={setData}
            onImageUpload={handleImageUpload}
          />
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
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

          <div className="flex-1 overflow-hidden flex justify-center items-center md:p-8">
            <div className="w-full h-full md:w-[320px] md:h-[650px] md:bg-black md:rounded-[40px] md:border-[8px] md:border-black md:shadow-2xl overflow-hidden relative bg-white">
              <div className="hidden md:block absolute top-0 inset-x-0 h-6 bg-black z-20 rounded-b-xl w-32 mx-auto"></div>
              <div className="w-full h-full overflow-y-auto no-scrollbar bg-white">
                <PublicCard previewData={data} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showNfc && <NfcWriter url={permanentUrl} onClose={() => setShowNfc(false)} />}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              Compartilhar Cartão
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">X</button>
            </h3>
            <div className="flex justify-center mb-2 p-4 bg-gray-50 rounded-xl border">
              <QRCode value={permanentUrl} size={180} />
            </div>
            <p className="text-xs text-gray-500 text-center mb-5">
              QR permanente: pode imprimir em placas e cartões. Continua funcionando mesmo se você mudar o link do perfil.
            </p>
            <div className="space-y-3">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700">
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir Link
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); alert('Link copiado!'); }}
                className="w-full flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar link para compartilhar
              </button>
              <button
                onClick={() => { setShowShareModal(false); setShowNfc(true); }}
                className="w-full flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                <Nfc className="w-4 h-4 mr-2" /> Gravar tag NFC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
