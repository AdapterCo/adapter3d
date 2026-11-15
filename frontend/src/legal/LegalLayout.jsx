import { Link } from 'react-router-dom';
import { COMPANY, isDraft } from './company';

export default function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border p-6 sm:p-10 text-gray-800 leading-relaxed">
        <Link to="/" className="inline-block mb-6">
          <img src="/logo.png" alt={COMPANY.brand} className="h-12 w-auto" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">Última atualização: {COMPANY.updatedAt}</p>
        {isDraft && (
          <p className="mt-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
            Rascunho: dados da empresa ainda não preenchidos.
          </p>
        )}
        <div className="mt-6 space-y-5">{children}</div>
        <div className="mt-10 pt-6 border-t text-sm text-gray-500 flex flex-wrap gap-4">
          <Link to="/termos" className="hover:underline">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link>
          <span>Contato: {COMPANY.email}</span>
        </div>
      </article>
    </div>
  );
}

export function H2({ children }) {
  return <h2 className="text-lg font-semibold text-gray-900 pt-2">{children}</h2>;
}

export function UL({ children }) {
  return <ul className="list-disc pl-6 space-y-1">{children}</ul>;
}
