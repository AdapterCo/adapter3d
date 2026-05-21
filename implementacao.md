Atualização: Sistema de Login Seguro e URLs Personalizadas
Com base na sua requisição, atualizaremos a arquitetura para garantir segurança e um visual mais profissional para as URLs.

User Review Required
IMPORTANT

Confirme se o novo fluxo de autenticação atende à sua visão:

Tela de Login: Terá duas opções: "Entrar na minha conta" (Email e Senha) e "Ativar nova Tag" (Onde o usuário digita o ID da tag).
Ativação da Tag: Se o ID digitado ainda não pertencer a ninguém, o usuário é levado a uma tela de Cadastro.
Cadastro: O usuário preenche Email, Senha e escolhe a sua URL Personalizada (ex: joaosilva). O sistema verifica se essa URL já está em uso por outra pessoa.
Acesso Público: O cartão do cliente ficará acessível através da URL que ele escolheu (ex: seudominio.com.br/joaosilva).
Open Questions
NOTE

Como a Tag física (cartão com NFC/QR Code) funciona, as pessoas vão acessar o cartão digital lendo o ID. Precisamos de uma rota do tipo seudominio.com.br/tag/cliente001 que redirecione automaticamente para a URL personalizada que o cliente escolheu (ex: seudominio.com.br/joaosilva)?
Qualquer ID digitado na tela de "Ativar nova Tag" será aceito para criar uma conta, ou você terá uma lista de IDs pré-cadastrados (tags que você fabricou e vendeu)?
Proposed Changes
Banco de Dados (Schema User.js)
[MODIFY] backend/models/User.js
Adicionar os campos:
email: String, único e obrigatório.
password: String (será salva com hash usando bcrypt).
slug: String, único e obrigatório (este é o "complemento" da URL).
O campo id continua existindo, mas agora atua como o código vinculativo da "Tag".
Backend
[NEW] / [MODIFY] Controllers e Rotas
POST /api/auth/login: Recebe email e senha, compara o hash com bcrypt e retorna um token de acesso (JWT) e os dados do usuário.
POST /api/auth/validate-tag: Recebe um id de tag. Verifica se já está em uso. Se sim, bloqueia. Se não, permite avançar para o cadastro.
POST /api/auth/register: Recebe id (tag), email, password, e slug. Cria o usuário no banco de dados.
GET /api/users/slug/:slug: Buscará os dados públicos do cartão baseado no slug (complemento) escolhido, em vez do id.
Frontend
[MODIFY] frontend/src/App.jsx
Novas rotas: /register (Cadastro) e ajuste na rota pública para capturar o :slug.
[MODIFY] frontend/src/pages/Login.jsx
A interface será dividida em abas:
Aba "Login": Campos Email e Senha.
Aba "Ativar Tag": Campo para inserir o ID da tag. Após validação, redireciona para a página de /register com o ID na URL ou no estado.
[NEW] frontend/src/pages/Register.jsx
Formulário para finalização do perfil: Recebe Email, Senha e o Slug (URL desejada). O input do slug pode ter um prefixo visual como adapterco.com.br/ para ficar claro para o usuário.
[MODIFY] frontend/src/pages/Admin.jsx
O painel agora buscará os dados pelo JWT/sessão logada.
Adição de uma opção (possivelmente na aba "Informações") mostrando a URL personalizada do usuário e permitindo a alteração do slug (verificando disponibilidade).
Verification Plan
Testes Manuais
Ativação de Tag: Digitar uma Tag não utilizada na tela inicial e ser redirecionado para a criação da conta.
Criação com URL duplicada: Tentar cadastrar um "complemento" de URL que já foi escolhido por outro cliente e confirmar que o sistema bloqueia exibindo erro.
Login Seguro: Deslogar e logar novamente utilizando Email e Senha configurados.
Visualização por Slug: Acessar o cartão digital através do link escolhido (ex: localhost:5173/meu-novo-nome) e confirmar se os dados renderizam corretamente.