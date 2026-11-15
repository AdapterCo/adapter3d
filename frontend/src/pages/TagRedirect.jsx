import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function TagRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkTag = async () => {
      try {
        // We'll create a new endpoint or use an existing one to find slug by tag ID
        const response = await api.get(`/users/tag/${id}`);
        if (response.data && response.data.slug) {
          // fromTag: a visita conta como leitura da tag (NFC/QR) nas estatísticas.
          navigate(`/${response.data.slug}`, { replace: true, state: { fromTag: true } });
        } else {
          setError(true);
        }
      } catch (err) {
        // If not found, it might be unactivated. Redirect to login to activate.
        console.log("Tag not active or not found");
        navigate('/', { state: { tagId: id } }); // Optional: could prefill login tab if we adjust Login.jsx
      }
    };
    checkTag();
  }, [id, navigate]);

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Erro: Tag não encontrada.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      Redirecionando...
    </div>
  );
}
