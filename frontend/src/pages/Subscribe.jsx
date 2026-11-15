import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UtensilsCrossed, ShoppingBag, CheckCircle2, ExternalLink, Truck } from 'lucide-react';
import api from '../services/api';
import TermsCheckbox from '../components/TermsCheckbox';

const TYPES = [
  { value: 'menu', label: 'Cardápio digital', icon: UtensilsCrossed, desc: 'Para restaurantes, lanchonetes, açaí, food trucks. Pedidos pelo WhatsApp.' },
  { value: 'storefront', label: 'Vitrine digital', icon: ShoppingBag, desc: 'Para lojas e produtos. Catálogo com carrinho e pedidos pelo WhatsApp.' }
];

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function maskPhone(v) {
  const d = onlyDigits(v).slice(0, 11);
  return d.length > 10 ? d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3') : d.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
}
const maskCep = (v) => onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
const toSlug = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 32);

export default function Subscribe() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [prices, setPrices] = useState(null);
  const [type, setType] = useState(params.get('tipo') === 'vitrine' || params.get('tipo') === 'storefront' ? 'storefront' : 'menu');
  const [f, setF] = useState({ name: '', slug: '', email: '', password: '', phone: '' });
  const [addr, setAddr] = useState({ postalCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { invoiceUrl }

  useEffect(() => {
    api.get('/billing/prices').then(r => setPrices(r.data)).catch(() => setPrices({ available: false }));
  }, []);

  const set = (k) => (e) => {
    let v = e.target.value;
    if (k === 'phone') v = maskPhone(v);
    if (k === 'slug') { v = toSlug(v); setSlugTouched(true); }
    setF(prev => ({ ...prev, [k]: v, ...(k === 'name' && !slugTouched ? { slug: toSlug(v) } : {}) }));
  };
  const setA = (k) => (e) => {
    const v = k === 'postalCode' ? maskCep(e.target.value) : k === 'state' ? e.target.value.toUpperCase().slice(0, 2) : e.target.value;
    setAddr(prev => ({ ...prev, [k]: v }));
    // Busca o endereço assim que o CEP estiver completo.
    if (k === 'postalCode' && onlyDigits(v).length === 8) lookupCep(onlyDigits(v));
  };

  // Preenche o endereço pelo CEP (ViaCEP). Falhou? O cliente digita.
  const lookupCep = async (cep) => {
    if (!cep || cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setAddr(prev => ({ ...prev, street: d.logradouro || prev.street, district: d.bairro || prev.district, city: d.localidade || prev.city, state: d.uf || prev.state }));
      }
    } catch { /* digita manualmente */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setLoading(true);
    try {
      const res = await api.post('/billing/signup', {
        profileType: type,
        name: f.name.trim(),
        slug: f.slug,
        email: f.email.trim(),
        password: f.password,
        phone: onlyDigits(f.phone),
        shipping: { ...addr, postalCode: onlyDigits(addr.postalCode) },
        acceptTerms: true // o formulário só envia com o checkbox marcado
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setDone({ invoiceUrl: res.data.invoiceUrl });
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível concluir. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 mx-auto text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">Conta criada!</h1>
          <p className="text-gray-600">Falta só pagar a primeira mensalidade. Assim que o pagamento for confirmado, seu {type === 'menu' ? 'cardápio' : 'vitrine'} entra no ar automaticamente.</p>
          {done.invoiceUrl ? (
            <a href={done.invoiceUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
              <ExternalLink className="w-5 h-5" /> Pagar agora no Mercado Pago
            </a>
          ) : (
            <p className="text-sm text-amber-700">A fatura está sendo gerada. Você encontra o botão de pagamento no painel, na aba Plano.</p>
          )}
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><Truck className="w-4 h-4" /> Sua tag será enviada para o endereço informado.</p>
          <button onClick={() => navigate('/admin')} className="w-full py-3 border rounded-lg font-medium text-gray-700 hover:bg-gray-50">
            Ir para o painel e montar meu {type === 'menu' ? 'cardápio' : 'vitrine'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl mx-auto p-6 sm:p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Adapter Cards" className="h-14 w-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 text-center">Assine e comece hoje</h1>
          <p className="text-gray-600 text-sm text-center mt-1">Seu link funciona na hora. A tag NFC chega depois no seu endereço.</p>
        </div>

        {prices && prices.available === false && (
          <p className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">As assinaturas estão indisponíveis no momento. Tente novamente mais tarde.</p>
        )}

        <form onSubmit={submit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-3">
            {TYPES.map(t => (
              <button type="button" key={t.value} onClick={() => setType(t.value)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${type === t.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <t.icon className={`w-6 h-6 mb-2 ${type === t.value ? 'text-blue-600' : 'text-gray-500'}`} />
                <p className="font-semibold text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                {prices?.[t.value] && <p className="mt-2 font-bold text-gray-900">{brl(prices[t.value])}<span className="text-xs font-normal text-gray-500">/mês</span></p>}
              </button>
            ))}
          </div>

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-800">Seu estabelecimento</h2>
            <div>
              <label className={label}>Nome do estabelecimento</label>
              <input className={input} value={f.name} onChange={set('name')} required maxLength={80} placeholder="Ex: Lanchonete do João" />
            </div>
            <div>
              <label className={label}>Seu link</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm border-r whitespace-nowrap">{window.location.host}/</span>
                <input className="w-full px-3 py-2.5 outline-none" value={f.slug} onChange={set('slug')} required minLength={3} placeholder="lanchonete-do-joao" />
              </div>
            </div>
            <div>
              <label className={label}>WhatsApp (recebe os pedidos)</label>
              <input className={input} value={f.phone} onChange={set('phone')} required inputMode="tel" placeholder="(21) 99999-9999" />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-800">Acesso ao painel</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>E-mail</label>
                <input type="email" className={input} value={f.email} onChange={set('email')} required placeholder="voce@email.com" />
              </div>
              <div>
                <label className={label}>Senha</label>
                <input type="password" className={input} value={f.password} onChange={set('password')} required minLength={8} placeholder="Mínimo 8 caracteres" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Truck className="w-4 h-4" /> Endereço para envio da tag</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={label}>CEP</label>
                <input className={input} value={addr.postalCode} onChange={setA('postalCode')} required inputMode="numeric" placeholder="00000-000" />
              </div>
              <div className="col-span-2">
                <label className={label}>Rua</label>
                <input className={input} value={addr.street} onChange={setA('street')} required maxLength={120} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Número</label>
                <input className={input} value={addr.number} onChange={setA('number')} required maxLength={20} />
              </div>
              <div className="col-span-2">
                <label className={label}>Complemento</label>
                <input className={input} value={addr.complement} onChange={setA('complement')} maxLength={80} placeholder="Opcional" />
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-6 sm:col-span-2">
                <label className={label}>Bairro</label>
                <input className={input} value={addr.district} onChange={setA('district')} required maxLength={80} />
              </div>
              <div className="col-span-4 sm:col-span-3">
                <label className={label}>Cidade</label>
                <input className={input} value={addr.city} onChange={setA('city')} required maxLength={80} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={label}>UF</label>
                <input className={input} value={addr.state} onChange={setA('state')} required maxLength={2} placeholder="RJ" />
              </div>
            </div>
          </section>

          <TermsCheckbox />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading || prices?.available === false}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-60">
            {loading ? 'Criando sua conta...' : `Criar conta e pagar ${prices?.[type] ? brl(prices[type]) + '/mês' : ''}`}
          </button>
          <p className="text-xs text-gray-500 text-center">Renovação mensal automática. Cancele quando quiser pelo painel.</p>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">Já tem conta? <Link to="/" className="text-blue-600 hover:underline">Entrar</Link></p>
      </div>
    </div>
  );
}
