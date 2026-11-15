// Aceite obrigatório dos Termos de Uso e da Política de Privacidade no
// cadastro. `required` faz o próprio navegador bloquear o envio sem o aceite.
export default function TermsCheckbox() {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-600 mt-2">
      <input type="checkbox" required className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>
        Li e aceito os{' '}
        <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Termos de Uso</a>
        {' '}e a{' '}
        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Política de Privacidade</a>.
      </span>
    </label>
  );
}
