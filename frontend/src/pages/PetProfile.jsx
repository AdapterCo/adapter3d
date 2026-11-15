import { useState } from 'react';
import { AlertTriangle, MessageCircle, Phone, MapPin, Stethoscope, Share2, ChevronDown, ChevronUp, PawPrint } from 'lucide-react';
import { buildWhatsappLink } from '../components/admin/utils';

const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', bird: 'Ave', other: 'Pet' };

function ageFromBirth(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const years = diff / (365.25 * 24 * 3600 * 1000);
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  const y = Math.floor(years);
  return `${y} ${y === 1 ? 'ano' : 'anos'}`;
}

export default function PetProfile({ data }) {
  const [healthOpen, setHealthOpen] = useState(false);
  const pet = data.pet || {};
  const owner = pet.owner || {};
  const vet = pet.vet || {};
  const lost = pet.lostMode || {};
  const isLost = Boolean(lost.active);

  const photo = data.avatar;
  const age = ageFromBirth(pet.birthDate);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `Perfil de ${pet.name || 'pet'}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado!');
    }
  };

  // ===== LOST MODE TAKEOVER =====
  if (isLost) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-red-600 to-red-700 text-white flex flex-col items-center px-5 py-8">
        <div className="w-full max-w-md flex flex-col items-center">

          <div className="flex items-center gap-2 bg-yellow-300 text-red-800 px-4 py-2 rounded-full font-extrabold uppercase tracking-wider text-sm shadow-lg animate-pulse">
            <AlertTriangle className="w-5 h-5" /> Estou perdido!
          </div>

          <div className="mt-6 w-44 h-44 rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-white flex items-center justify-center">
            {photo ? (
              <img src={photo} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <PawPrint className="w-20 h-20 text-red-300" />
            )}
          </div>

          <h1 className="mt-5 text-4xl font-extrabold text-center drop-shadow">{pet.name || 'Pet'}</h1>
          <p className="text-white/90 text-center mt-1">
            {SPECIES_LABEL[pet.species] || 'Pet'}{pet.breed ? ` • ${pet.breed}` : ''}{age ? ` • ${age}` : ''}
          </p>

          {lost.reward && (
            <div className="mt-6 w-full bg-yellow-300 text-red-800 rounded-2xl p-5 text-center shadow-xl">
              <div className="text-xs uppercase tracking-widest font-bold opacity-80">Recompensa</div>
              <div className="text-3xl font-extrabold mt-1">{lost.reward}</div>
            </div>
          )}

          {lost.message && (
            <p className="mt-5 text-center text-white/95 bg-white/10 rounded-xl px-4 py-3 text-sm leading-relaxed">
              {lost.message}
            </p>
          )}

          <div className="mt-7 w-full space-y-3">
            {owner.whatsapp && (
              <a href={buildWhatsappLink(owner.whatsapp)} target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-center p-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg shadow-lg transition-all">
                <MessageCircle className="w-6 h-6 mr-3" />
                Avisar o tutor (WhatsApp)
              </a>
            )}
            {(owner.phone || owner.whatsapp) && (
              <a href={`tel:${owner.phone || owner.whatsapp}`}
                 className="flex items-center justify-center p-4 rounded-2xl bg-white text-red-700 font-bold text-lg shadow-lg hover:bg-red-50 transition-all">
                <Phone className="w-6 h-6 mr-3" />
                Ligar pro tutor
              </a>
            )}
          </div>

          {owner.name && (
            <p className="mt-5 text-white/80 text-sm">Tutor: <strong>{owner.name}</strong></p>
          )}

          <button data-track="share" onClick={handleShare} className="mt-6 text-white/80 underline text-sm">
            Compartilhar este alerta
          </button>
        </div>
      </div>
    );
  }

  // ===== NORMAL MODE =====
  const { theme = {} } = data;
  const backgroundStyle = {
    background: theme.backgroundType === 'gradient' ? theme.backgroundGradient
              : theme.backgroundType === 'image' && theme.backgroundImage ? `url(${theme.backgroundImage}) center/cover no-repeat`
              : theme.backgroundColor
  };
  const textStyle = { color: theme.textColor };
  const buttonStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor };

  const hasHealth = pet.microchip || pet.neutered || pet.allergies || pet.medications || pet.conditions
                    || vet.name || vet.phone || vet.address;

  return (
    <div className="min-h-screen relative flex justify-center w-full" style={backgroundStyle}>
      <div className="max-w-md w-full px-6 py-12 flex flex-col items-center">

        <div className="flex justify-end w-full mb-6 relative z-10">
          <button data-track="share" onClick={handleShare}
                  className="p-2 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/20 transition-all"
                  style={textStyle}>
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full border-4 shadow-lg overflow-hidden mb-4 bg-white flex items-center justify-center"
               style={{ borderColor: theme.buttonColor }}>
            {photo ? (
              <img src={photo} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <PawPrint className="w-14 h-14 text-gray-300" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-center" style={textStyle}>{pet.name || 'Pet'}</h1>
          <p className="text-sm mt-1 opacity-80" style={textStyle}>
            {SPECIES_LABEL[pet.species] || 'Pet'}{pet.breed ? ` • ${pet.breed}` : ''}{age ? ` • ${age}` : ''}
          </p>
        </div>

        <div className="w-full space-y-4 relative z-10">
          {owner.whatsapp && (
            <a href={buildWhatsappLink(owner.whatsapp)} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <MessageCircle className="w-5 h-5 mr-3" />
              <span className="font-medium">WhatsApp do Tutor</span>
            </a>
          )}

          {(owner.phone || owner.whatsapp) && (
            <a href={`tel:${owner.phone || owner.whatsapp}`}
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <Phone className="w-5 h-5 mr-3" />
              <span className="font-medium">Ligar pro Tutor</span>
            </a>
          )}

          {hasHealth && (
            <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor }}>
              <button
                onClick={() => setHealthOpen(o => !o)}
                className="w-full flex items-center justify-between p-4 font-medium"
              >
                <span className="flex items-center">
                  <Stethoscope className="w-5 h-5 mr-3" /> Informações de saúde
                </span>
                {healthOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {healthOpen && (
                <div className="bg-white/95 text-gray-800 px-5 py-4 text-sm space-y-2">
                  {pet.microchip && <div><strong>Microchip:</strong> {pet.microchip}</div>}
                  {typeof pet.neutered === 'boolean' && <div><strong>Castrado:</strong> {pet.neutered ? 'Sim' : 'Não'}</div>}
                  {pet.color && <div><strong>Cor:</strong> {pet.color}</div>}
                  {pet.weight && <div><strong>Peso:</strong> {pet.weight} kg</div>}
                  {pet.allergies && <div><strong>Alergias:</strong> {pet.allergies}</div>}
                  {pet.medications && <div><strong>Medicações:</strong> {pet.medications}</div>}
                  {pet.conditions && <div><strong>Condições:</strong> {pet.conditions}</div>}
                  {(vet.name || vet.phone || vet.address) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="font-semibold mb-1">Veterinário</div>
                      {vet.name && <div>{vet.name}</div>}
                      {vet.phone && (
                        <div className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1" /> {vet.phone}</div>
                      )}
                      {vet.address && (
                        <div className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {vet.address}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {owner.name && (
            <div className="text-center text-sm opacity-80 mt-2" style={textStyle}>
              Tutor: <strong>{owner.name}</strong>
            </div>
          )}
        </div>

        <div className="mt-12 opacity-60 text-sm font-medium" style={textStyle}>
          Criado com Adapter Cards · <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline">Privacidade</a>
        </div>
      </div>
    </div>
  );
}
