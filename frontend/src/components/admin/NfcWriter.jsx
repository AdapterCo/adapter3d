import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Nfc, X, CheckCircle2, AlertTriangle, Copy, Smartphone, Lock, RefreshCw, ShieldCheck } from 'lucide-react';

// Web NFC só existe no Chrome para Android (em HTTPS). iPhone não permite que
// sites gravem NFC: lá orientamos o uso de um app gratuito.
//
// Bloqueio pelo navegador (NDEFReader.makeReadOnly): em teste, a versão
// anterior travou o serviço de NFC do Android. Suspeita principal: operações
// empilhadas (abortar um makeReadOnly em andamento e disparar outro) e
// regravação logo após um bloqueio incerto. Esta versão:
//   - nunca inicia o bloqueio se já houver operação NFC ativa;
//   - não oferece nova tentativa automática após resultado incerto;
//   - não regrava a tag para "verificar" o bloqueio.
// Fica atrás da chave ?nfclock=1 até ser validada em aparelhos reais.
function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const hasWebNfc = typeof window !== 'undefined' && 'NDEFReader' in window;
  const canLock = hasWebNfc && 'makeReadOnly' in window.NDEFReader.prototype;
  const lockEnabled = new URLSearchParams(window.location.search).get('nfclock') === '1';
  return { isIOS, isAndroid, hasWebNfc, canLock, lockEnabled };
}

// Erros "de conexão": o Chrome perdeu contato com a tag. Muitas vezes a
// gravação já tinha terminado — por isso conferimos lendo a tag.
const isTransient = (err) => err?.name === 'NetworkError' || err?.name === 'NotReadableError';

function errorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Permissão de NFC negada. Toque no cadeado ao lado do endereço do site, permita "Dispositivos NFC" e tente de novo.';
    case 'NotSupportedError':
      return 'O NFC do celular está desligado ou a tag não é compatível. Ative o NFC nas configurações e tente de novo.';
    case 'InvalidStateError':
      return 'Esta tag está bloqueada contra gravação e não pode ser alterada.';
    default:
      return 'Não foi possível concluir. Afaste a tag, encoste de novo e segure por 2 segundos.';
  }
}

function readUrlFromEvent(event) {
  for (const record of event.message?.records || []) {
    if (record.recordType === 'url' || record.recordType === 'absolute-url') {
      try { return new TextDecoder().decode(record.data); } catch { /* ignore */ }
    }
  }
  return null;
}

const VERIFY_TIMEOUT_MS = 20000;

function Waiting({ title, hint, onCancel }) {
  return (
    <div className="text-center space-y-3 py-4">
      <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
        <Nfc className="w-10 h-10 text-blue-600" />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-gray-600">{hint}</p>
      <button onClick={onCancel} className="text-sm text-gray-500 underline">Cancelar</button>
    </div>
  );
}

// Passo a passo do NFC Tools: bloqueio alternativo e conferência externa.
function NfcToolsSteps({ verifyOnly = false }) {
  return (
    <ol className="list-decimal list-inside space-y-1">
      <li>Instale o <strong>NFC Tools</strong> (grátis na Play Store ou App Store).</li>
      {!verifyOnly && <li>Na aba <strong>Outros</strong> (Other), toque em <strong>Bloquear tag</strong> (Lock tag) e encoste a tag uma vez.</li>}
      <li>Na aba <strong>Ler</strong>, encoste a tag e confira se aparece <strong>Gravável: Não</strong>.</li>
    </ol>
  );
}

function LockWithNfcTools() {
  return (
    <details className="border rounded-lg p-3 text-sm text-gray-700">
      <summary className="cursor-pointer font-medium flex items-center gap-1"><Lock className="w-4 h-4" /> Quer bloquear a tag contra regravação?</summary>
      <div className="mt-2 space-y-2">
        <p>Impede que alguém grave um link falso na tag (útil em placas de mesa e balcão). <strong>É definitivo</strong> e só funciona com chips NTAG213, 215 ou 216 originais.</p>
        <NfcToolsSteps />
        <p className="text-amber-800">Se der erro, não insista: a tag continua funcionando normalmente sem o bloqueio.</p>
      </div>
    </details>
  );
}

export default function NfcWriter({ url, onClose }) {
  const [platform] = useState(detectPlatform);
  // idle | writing | verifying | written | locking | lockUnsure | locked | error
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [tech, setTech] = useState(''); // erro bruto do Chrome, para suporte
  const abortRef = useRef(null);        // controller da operação NFC ativa (null = nenhuma)
  const timerRef = useRef(null);

  // Ao fechar a janela, encerra qualquer operação de NFC pendente.
  useEffect(() => () => { abortRef.current?.abort(); clearTimeout(timerRef.current); }, []);

  const newSignal = () => {
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    return ctrl;
  };

  // Libera a operação atual (só se ainda for ela a ativa).
  const release = (ctrl) => {
    if (abortRef.current === ctrl) abortRef.current = null;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const remember = (err) => setTech(`${err?.name || 'Erro'}: ${err?.message || '(sem mensagem)'}`);

  const fail = (err) => {
    if (err?.name === 'AbortError') return;
    remember(err);
    setError(errorMessage(err));
    setStatus('error');
  };

  // Lê a tag para conferir se o endereço gravado é o nosso.
  const verifyByReading = () => {
    const ctrl = newSignal();
    setStatus('verifying');
    const ndef = new window.NDEFReader();
    timerRef.current = setTimeout(() => {
      release(ctrl);
      ctrl.abort();
      setError('Não detectamos a tag para conferir. Tente gravar de novo.');
      setStatus('error');
    }, VERIFY_TIMEOUT_MS);
    ndef.onreading = (event) => {
      release(ctrl);
      ctrl.abort(); // encerra o scan
      const found = readUrlFromEvent(event);
      if (found === url) {
        setStatus('written');
      } else {
        setError(found ? `A tag contém outro endereço (${found}). Tente gravar de novo.` : 'A tag está vazia. Tente gravar de novo.');
        setStatus('error');
      }
    };
    ndef.scan({ signal: ctrl.signal }).catch((err) => { release(ctrl); fail(err); });
  };

  const write = async () => {
    setError('');
    setNote('');
    setTech('');
    const ctrl = newSignal();
    setStatus('writing');
    try {
      await new window.NDEFReader().write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.signal, overwrite: true });
      release(ctrl);
      setStatus('written');
    } catch (err) {
      if (abortRef.current !== ctrl) return; // cancelada ou substituída
      release(ctrl);
      if (isTransient(err)) verifyByReading();
      else fail(err);
    }
  };

  const lockTag = async () => {
    if (!platform.canLock) {
      setNote('Seu navegador não oferece suporte ao bloqueio NFC.');
      return;
    }
    // Nunca empilhar: se há operação NFC ativa, não inicia outra.
    if (abortRef.current) return;

    if (!window.confirm('ATENÇÃO: o bloqueio é permanente e irreversível. Deseja continuar?')) return;

    setError('');
    setNote('');
    setTech('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('locking');

    // Não deixar o celular aguardando indefinidamente.
    timerRef.current = setTimeout(() => {
      if (abortRef.current !== ctrl) return;
      abortRef.current = null;
      ctrl.abort();
      setNote('Não foi possível confirmar o bloqueio. Não considere a tag bloqueada.');
      setStatus('lockUnsure');
    }, VERIFY_TIMEOUT_MS);

    try {
      // A Promise só resolve quando o bloqueio termina com sucesso.
      await new window.NDEFReader().makeReadOnly({ signal: ctrl.signal });

      // Ignora respostas de operações antigas ou canceladas.
      if (abortRef.current !== ctrl) return;
      release(ctrl);
      setStatus('locked');
    } catch (err) {
      // Outra operação iniciou, o usuário cancelou ou deu timeout.
      if (abortRef.current !== ctrl) return;
      release(ctrl);

      remember(err);

      if (isTransient(err)) {
        setNote('A comunicação com a tag foi interrompida. Não sabemos se o bloqueio foi concluído. Confira no NFC Tools antes de tentar de novo.');
        setStatus('lockUnsure');
        return;
      }

      setNote(
        err?.name === 'NotSupportedError'
          ? 'O navegador, o NFC do celular ou a tag não suporta esta operação. Use o NFC Tools.'
          : err?.name === 'NotAllowedError'
            ? 'Permissão NFC negada. Autorize o acesso e tente novamente.'
            : `Bloqueio não confirmado (${err?.name || 'erro desconhecido'}).`
      );
      setStatus('written');
    }
  };

  const cancel = () => {
    const ctrl = abortRef.current;
    // Invalida a operação antes de abortá-la (o catch dela é ignorado).
    abortRef.current = null;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    ctrl?.abort();

    if (status === 'locking') {
      setNote('Operação interrompida. O estado do bloqueio não foi confirmado.');
      setStatus('lockUnsure');
    } else {
      setNote('');
      setStatus('idle');
    }
  };

  const restart = () => {
    setNote('');
    setTech('');
    setError('');
    setStatus('idle');
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
  };

  const techDetails = () => tech && (
    <details className="text-xs text-gray-500">
      <summary className="cursor-pointer">Detalhes técnicos</summary>
      <code className="block mt-1 p-2 bg-gray-100 rounded break-all">{tech}</code>
    </details>
  );

  const showBrowserLock = platform.lockEnabled && platform.canLock;

  const renderWebNfc = () => {
    switch (status) {
      case 'writing':
        return <Waiting onCancel={cancel} title="Encoste a tag na parte de trás do celular" hint="Normalmente perto da câmera. Segure por 2 segundos, até aparecer a confirmação." />;
      case 'verifying':
        return <Waiting onCancel={cancel} title="Afaste e encoste a tag de novo" hint="Vamos ler a tag para confirmar que o endereço foi gravado." />;
      case 'locking':
        return <Waiting onCancel={cancel} title="Afaste e encoste a tag de novo para bloquear" hint="Segure parado até aparecer a confirmação. Não afaste no meio." />;
      case 'written':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-2">
              <CheckCircle2 className="w-14 h-14 mx-auto text-green-600" />
              <p className="font-semibold">Tag gravada!</p>
              <p className="text-sm text-gray-600">Teste: com a tela desbloqueada, aproxime a tag do celular. Seu perfil deve abrir.</p>
            </div>
            {note && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{note}</p>}
            {showBrowserLock ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-sm text-amber-900">
                  <strong>Bloquear contra regravação</strong> impede que alguém grave um link falso na tag.
                  <strong> É permanente e irreversível.</strong>
                </p>
                <button onClick={lockTag} className="w-full flex items-center justify-center p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium">
                  <Lock className="w-4 h-4 mr-2" /> Bloquear esta tag
                </button>
              </div>
            ) : (
              <LockWithNfcTools />
            )}
            {techDetails()}
            <button onClick={restart} className="w-full p-3 border rounded-xl font-medium text-gray-700">Gravar outra tag</button>
          </div>
        );
      case 'lockUnsure':
        // Sem botão de nova tentativa: repetir o bloqueio em sequência é o
        // padrão suspeito de travar o NFC. Conferência é externa.
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-2">
              <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
              <p className="font-semibold">Bloqueio não confirmado</p>
            </div>
            {note && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{note}</p>}
            <div className="border rounded-lg p-3 text-sm text-gray-700 space-y-2">
              <p className="font-medium flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Confira o estado da tag</p>
              <NfcToolsSteps verifyOnly />
              <p className="text-xs text-gray-500">Se aparecer &quot;Gravável: Sim&quot;, feche esta janela e abra de novo para tentar outra vez.</p>
            </div>
            {techDetails()}
            <button onClick={onClose} className="w-full p-3 border rounded-xl font-medium text-gray-700">Fechar</button>
          </div>
        );
      case 'locked':
        return (
          <div className="text-center space-y-3 py-2">
            <ShieldCheck className="w-14 h-14 mx-auto text-green-600" />
            <p className="font-semibold">Bloqueio permanente aplicado!</p>
            <p className="text-sm text-gray-600">Ninguém mais consegue alterar o endereço desta tag.</p>
            <button onClick={restart} className="w-full p-3 border rounded-xl font-medium text-gray-700">Gravar outra tag</button>
          </div>
        );
      default: // idle | error
        return (
          <div className="space-y-4">
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Ative o NFC nas configurações do celular.</li>
              <li>Toque em <strong>Gravar</strong> e permita o uso de NFC.</li>
              <li>Encoste a tag na parte de trás do celular e segure por 2 segundos.</li>
            </ol>
            {status === 'error' && (
              <>
                <p className="text-sm text-red-600 flex gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}</p>
                {techDetails()}
              </>
            )}
            <button onClick={write} className="w-full flex items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">
              {status === 'error' ? <><RefreshCw className="w-5 h-5 mr-2" /> Tentar de novo</> : <><Nfc className="w-5 h-5 mr-2" /> Gravar</>}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><Nfc className="w-5 h-5 text-blue-600" /> Gravar tag NFC</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Fechar"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-gray-50 border rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Endereço que será gravado (permanente)</p>
          <div className="flex items-center gap-2">
            <code className="text-sm break-all flex-grow">{url}</code>
            <button onClick={copy} className="p-2 rounded hover:bg-gray-200 text-gray-600" aria-label="Copiar"><Copy className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Este endereço nunca muda, mesmo se você trocar o link do seu perfil.</p>
        </div>

        {platform.hasWebNfc ? renderWebNfc() : platform.isIOS ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="flex gap-2"><Smartphone className="w-5 h-5 flex-shrink-0 text-gray-500" /> No iPhone, a Apple não permite que sites gravem NFC. Use o app gratuito <strong>NFC Tools</strong> (App Store):</p>
            <ol className="list-decimal list-inside space-y-1 bg-gray-50 border rounded-lg p-3">
              <li>Toque no botão de copiar acima.</li>
              <li>No NFC Tools, abra <strong>Escrever</strong> → <strong>Adicionar um registro</strong> → <strong>URL / URI</strong>.</li>
              <li>Cole o endereço e confirme.</li>
              <li>Toque em <strong>Escrever</strong> e aproxime a tag do topo do iPhone.</li>
            </ol>
            <LockWithNfcTools />
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              {platform.isAndroid
                ? <>Este navegador não grava NFC. Abra este painel no <strong>Google Chrome</strong> do seu Android.</>
                : <>Para gravar, abra este painel no <strong>Chrome de um celular Android</strong> com NFC. Aponte a câmera do celular para o QR abaixo e faça login:</>}
            </p>
            {!platform.isAndroid && (
              <div className="flex justify-center p-3 bg-gray-50 border rounded-xl">
                <QRCode value={`${window.location.origin}/admin`} size={140} />
              </div>
            )}
            <p className="text-gray-500">No iPhone, use o app gratuito NFC Tools com o endereço acima.</p>
          </div>
        )}
      </div>
    </div>
  );
}
