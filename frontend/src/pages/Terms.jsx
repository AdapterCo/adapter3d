import { Link } from 'react-router-dom';
import LegalLayout, { H2, UL } from '../legal/LegalLayout';
import { COMPANY } from '../legal/company';

export default function Terms() {
  return (
    <LegalLayout title="Termos de Uso">
      <p>
        Estes termos regulam o uso do <strong>{COMPANY.brand}</strong>, oferecido por {COMPANY.legalName} ({COMPANY.document}).
        Ao criar uma conta ou ativar uma tag, você concorda com estes termos e com a{' '}
        <Link to="/privacidade" className="text-blue-600 underline">Política de Privacidade</Link>.
      </p>

      <H2>1. O serviço</H2>
      <p>
        O {COMPANY.brand} permite criar cartões digitais, cardápios, vitrines e perfis de pet, acessíveis por link,
        QR Code e tags NFC, com recursos como pedidos pelo WhatsApp, botões de avaliação e rota, e estatísticas de acesso.
      </p>

      <H2>2. Conta</H2>
      <UL>
        <li>Você deve ter 18 anos ou mais e fornecer informações verdadeiras.</li>
        <li>Você é responsável por manter sua senha em sigilo e por toda atividade realizada na sua conta.</li>
        <li>Cada tag ativada fica vinculada a uma conta.</li>
      </UL>

      <H2>3. Conteúdo publicado</H2>
      <UL>
        <li>Você é o único responsável pelo conteúdo do seu perfil: textos, fotos, produtos, preços, promoções, links e informações de contato.</li>
        <li>Você declara ter os direitos sobre as imagens e marcas que publicar.</li>
        <li>É proibido publicar conteúdo ilegal, enganoso, ofensivo, que viole direitos de terceiros, que ofereça produtos proibidos ou que tente obter dados ou pagamentos de forma fraudulenta.</li>
        <li>Podemos remover conteúdo ou suspender contas que violem estes termos ou a lei.</li>
      </UL>

      <H2>4. Pedidos e pagamentos entre estabelecimento e cliente</H2>
      <p>
        O carrinho apenas organiza o pedido e o envia ao WhatsApp do estabelecimento. A negociação, o pagamento, a entrega
        e o atendimento acontecem <strong>diretamente entre o estabelecimento e o cliente</strong>. O {COMPANY.brand} não
        intermedia pagamentos e não se responsabiliza por preços, qualidade, entrega, trocas ou devoluções dos produtos anunciados.
      </p>

      <H2>5. Tags NFC e QR Codes</H2>
      <UL>
        <li>As tags e QR Codes usam um endereço permanente vinculado à sua conta, que continua funcionando mesmo se você alterar o link do perfil.</li>
        <li>O funcionamento da leitura depende do aparelho do visitante (NFC ativado ou câmera).</li>
        <li>Gravar ou bloquear tags é feito por sua conta e risco; o bloqueio contra regravação é permanente.</li>
      </UL>

      <H2>6. Planos e pagamento do serviço</H2>
      <UL>
        <li>Alguns recursos podem ser oferecidos em planos pagos, com preços e condições informados no momento da contratação.</li>
        <li>Se um plano pago não for renovado, a conta passa para o plano gratuito: recursos pagos ficam indisponíveis, mas o link, o QR Code e as tags continuam abrindo o perfil.</li>
        <li>Valores pagos não são reembolsáveis após o período contratado ter sido iniciado, salvo quando exigido pelo Código de Defesa do Consumidor.</li>
      </UL>

      <H2>7. Disponibilidade</H2>
      <p>
        Trabalhamos para manter o serviço disponível, mas ele pode passar por manutenções ou falhas. Não garantimos
        funcionamento ininterrupto nem nos responsabilizamos por lucros cessantes decorrentes de indisponibilidade.
      </p>

      <H2>8. Encerramento</H2>
      <p>
        Você pode solicitar a exclusão da sua conta a qualquer momento pelo e-mail {COMPANY.email}. Podemos encerrar ou
        suspender contas em caso de violação destes termos, com aviso prévio sempre que possível.
      </p>

      <H2>9. Alterações</H2>
      <p>Podemos atualizar estes termos. Mudanças relevantes serão comunicadas no painel ou por e-mail.</p>

      <H2>10. Lei aplicável e foro</H2>
      <p>Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de {COMPANY.city}, ressalvados os direitos do consumidor.</p>
    </LegalLayout>
  );
}
