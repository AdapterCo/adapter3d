import { useState } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';

const DEFAULT_NAME = 'Nome do Usuário';
const visibleProducts = (d) => (d.products || []).filter(p => p.isVisible !== false && String(p.name || '').trim());

// Passos do "complete seu perfil" por tipo. tab = aba que resolve o passo.
function stepsFor(d) {
  const named = String(d.name || '').trim() && d.name !== DEFAULT_NAME;
  if (d.profileType === 'pet') {
    return [
      { done: Boolean(d.avatar), label: 'Foto do pet', tab: 'basic' },
      { done: Boolean(String(d.pet?.name || '').trim()), label: 'Nome do pet', tab: 'pet' },
      { done: Boolean(d.pet?.owner?.phone || d.pet?.owner?.whatsapp), label: 'Telefone do tutor (para quem encontrar)', tab: 'owner' }
    ];
  }
  if (d.profileType === 'menu' || d.profileType === 'storefront') {
    return [
      { done: Boolean(named), label: 'Nome da loja', tab: 'basic' },
      { done: Boolean(d.avatar), label: 'Logo ou foto', tab: 'basic' },
      { done: Boolean(d.whatsapp), label: 'WhatsApp para receber pedidos', tab: 'contact' },
      { done: visibleProducts(d).length >= 3, label: 'Pelo menos 3 produtos com nome e preço', tab: 'products' },
      { done: visibleProducts(d).some(p => p.image), label: 'Foto nos produtos', tab: 'products' },
      { done: Boolean(d.googleReview?.mapsUrl || d.address), label: 'Endereço e link do Google Maps', tab: 'review' },
      { done: Boolean(d.businessHours?.enabled), label: 'Horário de funcionamento', tab: 'hours' },
      ...(d.subscriptionState?.required ? [{ done: Boolean(d.subscriptionState.active), label: 'Assinatura ativa (perfil no ar)', tab: 'plan' }] : [])
    ];
  }
  return [
    { done: Boolean(named), label: 'Seu nome', tab: 'basic' },
    { done: Boolean(d.avatar), label: 'Foto', tab: 'basic' },
    { done: Boolean(d.whatsapp || d.phone), label: 'WhatsApp ou telefone', tab: 'links' },
    { done: Boolean(d.instagram || d.linkedin || d.facebook || (d.customLinks || []).length), label: 'Uma rede social ou link', tab: 'links' }
  ];
}

// Cartão de primeiros passos no topo do painel. Some sozinho quando tudo está
// feito; o lojista também pode fechar (lembrado neste navegador).
export default function ProfileChecklist({ data, onGo }) {
  const key = `checklist-hidden:${data.id}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  const steps = stepsFor(data);
  const done = steps.filter(s => s.done).length;
  if (hidden || done === steps.length) return null;

  const hide = () => {
    try { localStorage.setItem(key, '1'); } catch { /* modo privado */ }
    setHidden(true);
  };

  return (
    <section className="mx-6 mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4" aria-label="Complete seu perfil">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-blue-900">Complete seu perfil</h2>
          <p className="text-xs text-blue-800">{done} de {steps.length} passos · perfis completos recebem mais visitas e pedidos.</p>
        </div>
        <button onClick={hide} className="p-1 text-blue-700 hover:bg-blue-100 rounded" aria-label="Fechar checklist"><X className="w-4 h-4" /></button>
      </div>
      <div className="h-1.5 bg-blue-100 rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.round((done / steps.length) * 100)}%` }} />
      </div>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
        {steps.map(s => (
          <li key={s.label}>
            <button
              type="button" onClick={() => onGo(s.tab)} disabled={s.done}
              className={`w-full flex items-center gap-2 text-sm text-left px-2 py-1 rounded ${s.done ? 'text-gray-500 line-through' : 'text-blue-900 hover:bg-blue-100'}`}
            >
              {s.done ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
