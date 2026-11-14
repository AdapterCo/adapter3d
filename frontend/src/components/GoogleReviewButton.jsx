import { Star } from 'lucide-react';

// Botão público "Avaliar no Google". Só renderiza se o perfil tiver o link
// gerado pela aba "Avaliação Google" do painel.
export default function GoogleReviewButton({ data, buttonStyle, className = '' }) {
  const url = data?.googleReview?.reviewUrl;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank" rel="noopener noreferrer"
      className={`flex items-center justify-center p-4 rounded-xl shadow-sm hover:scale-[1.02] transition-all ${className}`}
      style={buttonStyle}
    >
      <Star className="w-5 h-5 mr-3" fill="currentColor" />
      <span className="font-medium">Avaliar no Google</span>
    </a>
  );
}
