// Dados da empresa exibidos nos Termos de Uso e na Política de Privacidade.
// PREENCHA antes de divulgar o serviço. Enquanto houver "[PREENCHER", as
// páginas mostram um aviso de rascunho.
export const COMPANY = {
  brand: 'Adapter Cards',
  legalName: 'Daniel Mesquita dos Santos',
  document: '09397729900',
  email: 'contato@adapterco.com.br',
  city: 'Rio de Janeiro/RJ',
  updatedAt: '15/11/2026'
};

export const isDraft = Object.values(COMPANY).some(v => String(v).includes('[PREENCHER'));
