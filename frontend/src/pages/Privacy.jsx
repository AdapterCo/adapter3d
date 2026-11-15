import LegalLayout, { H2, UL } from '../legal/LegalLayout';
import { COMPANY } from '../legal/company';

export default function Privacy() {
  return (
    <LegalLayout title="Política de Privacidade">
      <p>
        Esta política explica quais dados o <strong>{COMPANY.brand}</strong> ({COMPANY.legalName}, {COMPANY.document})
        coleta, por que coleta e como você pode exercer seus direitos, conforme a Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018 — LGPD).
      </p>

      <H2>1. Quem usa o serviço</H2>
      <UL>
        <li><strong>Assinantes</strong>: pessoas e empresas que criam um perfil (cartão digital, cardápio, vitrine ou perfil de pet).</li>
        <li><strong>Visitantes</strong>: quem acessa um perfil público pelo link, QR Code ou tag NFC.</li>
      </UL>

      <H2>2. Dados dos assinantes</H2>
      <UL>
        <li><strong>Conta</strong>: e-mail e senha. A senha é guardada apenas de forma criptografada (hash), nunca em texto.</li>
        <li><strong>Perfil</strong>: as informações que você decide publicar, como nome, fotos, redes sociais, WhatsApp, telefone, chave Pix, endereço, produtos e preços. Esses dados ficam <strong>públicos</strong> no seu perfil, porque essa é a finalidade do serviço.</li>
        <li><strong>Perfil de pet</strong>: dados do animal e do tutor (como o telefone), exibidos publicamente para que quem encontrar o pet possa entrar em contato. Publique apenas o que desejar tornar público.</li>
        <li><strong>Localização do estabelecimento</strong>: quando você informa o link do Google Maps, extraímos as coordenadas para os botões "Como chegar" e "Avaliar no Google".</li>
        <li><strong>Assinatura (cardápio e vitrine)</strong>: nome, e-mail, WhatsApp e endereço de entrega da tag. Os dados de pagamento (como CPF/CNPJ e cartão) são informados <strong>diretamente no Mercado Pago</strong> e <strong>não ficam armazenados em nossos servidores</strong>. Guardamos apenas a situação da assinatura (paga até quando) e os identificadores da cobrança.</li>
      </UL>

      <H2>3. Dados dos visitantes</H2>
      <UL>
        <li><strong>Estatísticas de uso</strong>: registramos visitas e interações com o perfil (por exemplo, cliques em botões, produtos vistos ou adicionados ao carrinho e pedidos montados, com itens e valor), para mostrar relatórios ao assinante. Esses registros usam um identificador aleatório gerado no navegador e <strong>não armazenam endereço IP, nome ou telefone</strong>. São apagados automaticamente após 400 dias.</li>
        <li><strong>Pedidos</strong>: o nome, o endereço de entrega e as observações que você digita no carrinho são enviados <strong>diretamente ao WhatsApp do estabelecimento</strong>; não os armazenamos em nossos servidores. A partir daí, o tratamento desses dados é de responsabilidade do estabelecimento.</li>
        <li><strong>Lista de clientes do estabelecimento (opcional)</strong>: só se você marcar a caixa <em>"Quero receber novidades e promoções"</em> no carrinho, guardamos para aquele estabelecimento o seu nome, o seu WhatsApp, a quantidade e o valor dos pedidos enviados e a data da autorização. A finalidade é o estabelecimento poder enviar novidades e promoções a você. A caixa vem desmarcada e o pedido funciona sem ela. Para sair da lista, peça ao estabelecimento (ele pode remover você pelo painel) ou escreva para <strong>{COMPANY.email}</strong>.</li>
        <li><strong>Armazenamento no seu aparelho</strong>: guardamos no navegador o carrinho, o nome, o endereço e o WhatsApp (se informado) usados no último pedido (para preencher automaticamente da próxima vez) e o identificador aleatório de estatísticas. Você pode apagar esses dados limpando os dados do site no navegador.</li>
      </UL>

      <H2>4. Para que usamos os dados</H2>
      <UL>
        <li>Prestar o serviço: exibir perfis, montar pedidos e gerar relatórios para o assinante.</li>
        <li>Segurança: autenticação, prevenção de abuso e limites de tentativas.</li>
        <li>Comunicação com o assinante: por exemplo, o e-mail de recuperação de senha.</li>
      </UL>
      <p>Não vendemos dados pessoais e não usamos os dados dos visitantes para publicidade.</p>

      <H2>5. Com quem compartilhamos</H2>
      <UL>
        <li><strong>Infraestrutura</strong>: provedores de hospedagem, armazenamento de imagens e envio de e-mail, que processam os dados apenas para operar o serviço.</li>
        <li><strong>Pagamentos</strong>: as assinaturas são cobradas pelo Mercado Pago, que recebe o e-mail do assinante e o valor da assinatura. Os dados de pagamento são digitados diretamente na página do Mercado Pago e nunca passam por nós; o tratamento deles segue a política de privacidade do Mercado Pago.</li>
        <li><strong>Busca de CEP</strong>: o CEP digitado no cadastro é consultado no serviço público ViaCEP para preencher o endereço.</li>
        <li><strong>Serviços de localização</strong>: o link do Google Maps informado pelo assinante é consultado em um serviço externo para gerar o link de avaliação, e as coordenadas são consultadas no OpenStreetMap para sugerir o endereço.</li>
        <li><strong>Aplicativos que você escolhe abrir</strong>: ao tocar em WhatsApp, Google Maps, Waze, Uber, 99, redes sociais ou links do perfil, você passa a usar o serviço daquela empresa, sujeito à política dela.</li>
        <li><strong>Autoridades</strong>: quando exigido por lei ou ordem judicial.</li>
      </UL>

      <H2>6. Por quanto tempo guardamos</H2>
      <UL>
        <li>Dados da conta e do perfil: enquanto a conta existir. Após a exclusão, são removidos da base principal e das cópias de segurança no ciclo de retenção dos backups (até 14 dias).</li>
        <li>Estatísticas de uso: até 400 dias.</li>
      </UL>

      <H2>7. Segurança</H2>
      <p>Usamos conexão criptografada (HTTPS), senhas com hash, controle de acesso e cópias de segurança diárias. Nenhum sistema é totalmente imune a incidentes; se ocorrer algum que gere risco aos titulares, comunicaremos os afetados e a ANPD conforme a lei.</p>

      <H2>8. Seus direitos</H2>
      <p>Você pode solicitar a qualquer momento: confirmação e acesso aos seus dados, correção, exclusão, portabilidade, informações sobre compartilhamento e revogação de consentimento. Assinantes podem editar a maior parte dos dados diretamente no painel. Para os demais pedidos, escreva para <strong>{COMPANY.email}</strong>.</p>

      <H2>9. Crianças</H2>
      <p>O serviço não é direcionado a menores de 18 anos para criação de conta.</p>

      <H2>10. Alterações</H2>
      <p>Podemos atualizar esta política. Mudanças relevantes serão informadas no painel ou por e-mail. A data da última atualização aparece no topo desta página.</p>
    </LegalLayout>
  );
}
