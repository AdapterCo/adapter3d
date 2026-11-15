// Dados da empresa exibidos nos Termos de Uso e na Política de Privacidade.
// PREENCHA antes de divulgar o serviço. Enquanto houver "[PREENCHER", as
// páginas mostram um aviso de rascunho.
export const COMPANY = {
  brand: 'Adapter Cards',
  legalName: '[PREENCHER: razão social ou nome completo]',
  document: '[PREENCHER: CNPJ ou CPF]',
  email: '[PREENCHER: e-mail de contato/privacidade]',
  city: '[PREENCHER: cidade/UF do foro]',
  updatedAt: '15/11/2026'
};

export const isDraft = Object.values(COMPANY).some(v => String(v).includes('[PREENCHER'));
