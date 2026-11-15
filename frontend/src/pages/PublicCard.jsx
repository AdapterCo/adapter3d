import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { track, trackClick } from '../services/track';
import { Share2, Link as LinkIcon, Phone, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { buildWhatsappLink } from '../components/admin/utils';
import PetProfile from './PetProfile';
import MenuProfile from './MenuProfile';
import StorefrontProfile from './StorefrontProfile';
import GoogleReviewButton from '../components/GoogleReviewButton';
import DirectionsButton from '../components/DirectionsButton';

// Brand icons (lucide-react 1.16 doesn't ship these — inline SVGs keep the build working)
const Instagram = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);
const Facebook = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);
const Youtube = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);
const Linkedin = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);
const TikTokIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.35-2.91 5.67-1.78 1.35-4.14 1.76-6.28 1.1-2.12-.66-3.83-2.19-4.66-4.21-.83-2.02-.75-4.38.22-6.33 1.05-2.13 3.12-3.66 5.48-4.07v4.06c-1.33.22-2.58 1.05-3.18 2.25-.56 1.13-.53 2.51.1 3.59.62 1.05 1.83 1.69 3.06 1.72 1.25.04 2.52-.45 3.29-1.42.75-.95 1.14-2.19 1.13-3.4V.02h2.44z" />
  </svg>
);

// Logo oficial PIX (simple-icons) — diamante com X interno, instantly recognizable
const PixIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36zM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559zM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737c1.422 1.422 1.422 3.73 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156Z" />
  </svg>
);

export default function PublicCard({ previewData }) {
  const { slug } = useParams();
  // _preview: o painel mostra o perfil sem contar visitas/cliques.
  const [data, setData] = useState(previewData ? { ...previewData, _preview: true } : null);
  const [loading, setLoading] = useState(!previewData);
  const [copiedPix, setCopiedPix] = useState(false);
  const fromTag = useLocation().state?.fromTag === true;
  const visitSent = useRef(false);

  // Uma visita por carregamento da página (o ref evita duplicar no StrictMode).
  useEffect(() => {
    if (!data || data._preview || visitSent.current) return;
    visitSent.current = true;
    track(data, 'visit', { source: fromTag ? 'tag' : 'link' });
  }, [data, fromTag]);

  const onClickCapture = (e) => trackClick(e, data);

  useEffect(() => {
    if (previewData) {
      setData({ ...previewData, _preview: true });
    } else {
      const fetchData = async () => {
        try {
          // In preview mode we don't fetch. In public view we fetch by slug.
          const response = await api.get(`/users/slug/${slug}`);
          // Aberto por um slug antigo: troca a URL na barra para o slug atual
          // (sem recarregar), para o visitante compartilhar o endereço certo.
          if (response.data?.slug && response.data.slug !== slug) {
            window.history.replaceState(window.history.state, '', `/${response.data.slug}`);
          }
          setData(response.data);
        } catch (error) {
          console.error("Error fetching data", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [slug, previewData]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center">Perfil não encontrado.</div>;
  }

  // Variantes por profileType — cada uma tem layout próprio.
  if (data.profileType === 'pet') {
    return <div className="contents" onClickCapture={onClickCapture}><PetProfile data={data} /></div>;
  }
  if (data.profileType === 'menu') {
    return <div className="contents" onClickCapture={onClickCapture}><MenuProfile data={data} /></div>;
  }
  if (data.profileType === 'storefront') {
    return <div className="contents" onClickCapture={onClickCapture}><StorefrontProfile data={data} /></div>;
  }

  const { theme } = data;

  const backgroundStyle = {
    background: theme.backgroundType === 'gradient' ? theme.backgroundGradient 
                : theme.backgroundType === 'image' && theme.backgroundImage ? `url(${theme.backgroundImage}) center/cover no-repeat`
                : theme.backgroundColor
  };

  const textStyle = { color: theme.textColor };
  const buttonStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Cartão de ${data.name}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  const copyPix = () => {
    navigator.clipboard.writeText(data.pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="min-h-screen relative flex justify-center w-full" style={backgroundStyle} onClickCapture={onClickCapture}>
      <div className="max-w-md w-full px-6 py-12 flex flex-col items-center">

        {/* Header */}
        <div className="flex justify-end w-full mb-6 relative z-10">
          <button
            data-track="share" onClick={handleShare}
            className="p-2 rounded-full bg-black/10 backdrop-blur-sm hover:bg-black/20 transition-all"
            style={textStyle}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Profile */}
        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="w-28 h-28 rounded-full border-4 shadow-lg overflow-hidden mb-4 bg-white flex items-center justify-center" style={{ borderColor: theme.buttonColor }}>
            {data.avatar ? (
              <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-gray-300">{data.name.charAt(0)}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-center" style={textStyle}>{data.name}</h1>
        </div>

        {/* Links */}
        <div className="w-full space-y-4 relative z-10">

          {data.whatsapp && (
            <a href={buildWhatsappLink(data.whatsapp)} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <MessageCircle className="w-5 h-5 mr-3" />
              <span className="font-medium">WhatsApp</span>
            </a>
          )}

          {data.phone && (
            <a href={`tel:${data.phone}`}
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <Phone className="w-5 h-5 mr-3" />
              <span className="font-medium">Ligar Agora</span>
            </a>
          )}

          <GoogleReviewButton data={data} buttonStyle={buttonStyle} />
          <DirectionsButton data={data} buttonStyle={buttonStyle} />

          {data.pix && (
            <button onClick={copyPix} data-track="pix"
               className="w-full flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all relative overflow-hidden"
               style={buttonStyle}>
              <PixIcon className="w-5 h-5 mr-3" />
              <span className="font-medium">{copiedPix ? 'Chave Copiada!' : 'Copiar Chave Pix'}</span>
            </button>
          )}

          {data.instagram && (
            <a href={data.instagram} target="_blank" rel="noopener noreferrer" 
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <Instagram className="w-5 h-5 mr-3" />
              <span className="font-medium">Instagram</span>
            </a>
          )}

          {data.facebook && (
            <a href={data.facebook} target="_blank" rel="noopener noreferrer" 
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <Facebook className="w-5 h-5 mr-3" />
              <span className="font-medium">Facebook</span>
            </a>
          )}

          {data.tiktok && (
            <a href={data.tiktok} target="_blank" rel="noopener noreferrer" 
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <TikTokIcon className="w-5 h-5 mr-3" />
              <span className="font-medium">TikTok</span>
            </a>
          )}

          {data.youtube && (
            <a href={data.youtube} target="_blank" rel="noopener noreferrer" 
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <Youtube className="w-5 h-5 mr-3" />
              <span className="font-medium">YouTube</span>
            </a>
          )}

          {data.linkedin && (
            <a href={data.linkedin} target="_blank" rel="noopener noreferrer" 
               className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
               style={buttonStyle}>
              <Linkedin className="w-5 h-5 mr-3" />
              <span className="font-medium">LinkedIn</span>
            </a>
          )}

          {data.customLinks && data.customLinks.map((link, index) => (
            link.isActive && link.title && link.url && (
              <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" 
                 className="flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
                 style={buttonStyle}>
                <LinkIcon className="w-5 h-5 mr-3" />
                <span className="font-medium">{link.title}</span>
              </a>
            )
          ))}
        </div>
        
        {/* Footer */}
        <div className="mt-12 opacity-60 text-sm font-medium" style={textStyle}>
          Criado com Adapter Cards · <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline">Privacidade</a>
        </div>
      </div>
    </div>
  );
}
