import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Nfc, X, CheckCircle2, AlertTriangle, Copy, Smartphone, Lock, RefreshCw, ShieldCheck } from 'lucide-react';

// Web NFC só existe no Chrome para Android (em HTTPS). iPhone não permite que
// sites gravem NFC: lá orientamos o uso de um app gratuito.
function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const hasWebNfc = typeof window !== 'undefined' && 'NDEFReader' in window;
  const canLock = hasWebNfc && 'makeReadOnly' in window.NDEFReader.prototype;
  return { isIOS, isAndroid, hasWebNfc, canLock };
}

// Erros "de conexão": o Chrome perdeu contato com a tag. Muitas vezes a
// gravação já tinha terminado — por isso conferimos lendo a tag em vez de
// mostrar falha direto.
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

export default function NfcWriter({ url, onClose }) {
  const [platform] = useState(detectPlatform);
  // idle | writing | verifying | written | locking | lockUnsure | checkingLock | locked | error
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => { abortRef.current?.abort(); clearTimeout(timerRef.current); }, []);

  const newSignal = () => {
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    return ctrl;
  };

  const fail = (err) => {
    if (err?.name === 'AbortError') return;
    setError(errorMessage(err));
    setStatus('error');
  };

  // Lê a tag para conferir se o endereço gravado é o nosso.
  const verifyByReading = () => {
    const ctrl = newSignal();
    setStatus('verifying');
    const ndef = new window.NDEFReader();
    timerRef.current = setTimeout(() => {
      ctrl.abort();
      setError('Não detectamos a tag para conferir. Tente gravar de novo.');
      setStatus('error');
    }, VERIFY_TIMEOUT_MS);
    ndef.onreading = (event) => {
      clearTimeout(timerRef.current);
      ctrl.abort();
      const found = readUrlFromEvent(event);
      if (found === url) {
        setStatus('written');
      } else {
        setError(found ? `A tag contém outro endereço (${found}). Tente gravar de novo.` : 'A tag está vazia. Tente gravar de novo.');
        setStatus('error');
      }
    };
    ndef.onreadingerror = () => { /* leitura falhou: segue esperando novo encosto */ };
    ndef.scan({ signal: ctrl.signal }).catch((err) => { clearTimeout(timerRef.current); fail(err); });
  };

  const write = async () => {
    setError('');
    setNote('');
    const ctrl = newSignal();
    setStatus('writing');
    try {
      await new window.NDEFReader().write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.signal, overwrite: true });
      setStatus('written');
    } catch (err) {
      if (isTransient(err)) verifyByReading();
      else fail(err);
    }
  };

  // Bloqueio em etapa separada: o Chrome precisa detectar a tag de novo.
  const lockTag = async () => {
    if (!window.confirm('Bloquear a tag é definitivo: ela nunca mais poderá ser regravada. Continuar?')) return;
    setError('');
    setNote('');
    const ctrl = newSignal();
    setStatus('locking');
    try {
      await new window.NDEFReader().makeReadOnly({ signal: ctrl.signal });
      setStatus('locked');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (isTransient(err)) setStatus('lockUnsure');
      else fail(err);
    }
  };

  // Confere o bloqueio tentando regravar o MESMO endereço (inofensivo):
  // se gravar, a tag não está bloqueada; se a tag recusar, está bloqueada.
  const checkLock = async () => {
    setNote('');
    const ctrl = newSignal();
    setStatus('checkingLock');
    try {
      await new window.NDEFReader().write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.signal, overwrite: true });
      setNote('A tag ainda não está bloqueada. Toque em "Bloquear esta tag" e tente de novo.');
      setStatus('written');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (isTransient(err)) {
        setNote('Não deu para conferir. Encoste a tag de novo e segure por 2 segundos.');
        setStatus('lockUnsure');
      } else {
        setStatus('locked');
      }
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
    setStatus(status === 'checkingLock' ? 'lockUnsure' : status === 'locking' ? 'written' : 'idle');
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
  };

  const renderWebNfc = () => {
    switch (status) {
      case 'writing':
        return <Waiting onCancel={cancel} title="Encoste a tag na parte de trás do celular" hint="Normalmente perto da câmera. Segure por 2 segundos, até aparecer a confirmação." />;
      case 'verifying':
        return <Waiting onCancel={cancel} title="Afaste e encoste a tag de novo" hint="Vamos ler a tag para confirmar que o endereço foi gravado." />;
      case 'locking':
        return <Waiting onCancel={cancel} title="Afaste e encoste a tag de novo para bloquear" hint="Segure por 2 segundos, até aparecer a confirmação." />;
      case 'checkingLock':
        return <Waiting onCancel={cancel} title="Encoste a tag para conferir o bloqueio" hint="Segure por 2 segundos." />;
      case 'written':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-2">
              <CheckCircle2 className="w-14 h-14 mx-auto text-green-600" />
              <p className="font-semibold">Tag gravada!</p>
              <p className="text-sm text-gray-600">Teste: com a tela desbloqueada, aproxime a tag do celular. Seu perfil deve abrir.</p>
            </div>
            {note && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{note}</p>}
            {platform.canLock && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-sm text-amber-900">
                  <strong>Bloquear contra regravação</strong> impede que alguém grave um link falso na sua tag
                  (recomendado para placas em mesas e balcões). <strong>Não pode ser desfeito.</strong>
                </p>
                <button onClick={lockTag} className="w-full flex items-center justify-center p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium">
                  <Lock className="w-4 h-4 mr-2" /> Bloquear esta tag
                </button>
              </div>
            )}
            <button onClick={() => { setNote(''); setStatus('idle'); }} className="w-full p-3 border rounded-xl font-medium text-gray-700">Gravar outra tag</button>
          </div>
        );
      case 'lockUnsure':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-2">
              <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
              <p className="font-semibold">Não deu para confirmar o bloqueio</p>
              <p className="text-sm text-gray-600">A tag pode ter sido bloqueada mesmo assim. Toque em verificar e encoste a tag.</p>
            </div>
            {note && <p className="text-sm text-amber-800">{note}</p>}
            <button onClick={checkLock} className="w-full flex items-center justify-center p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">
              <ShieldCheck className="w-4 h-4 mr-2" /> Verificar bloqueio
            </button>
            <button onClick={lockTag} className="w-full p-3 border rounded-xl font-medium text-gray-700">Tentar bloquear de novo</button>
          </div>
        );
      case 'locked':
        return (
          <div className="text-center space-y-3 py-2">
            <ShieldCheck className="w-14 h-14 mx-auto text-green-600" />
            <p className="font-semibold">Tag gravada e bloqueada!</p>
            <p className="text-sm text-gray-600">Ninguém mais consegue alterar o endereço desta tag.</p>
            <button onClick={() => setStatus('idle')} className="w-full p-3 border rounded-xl font-medium text-gray-700">Gravar outra tag</button>
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
              <p className="text-sm text-red-600 flex gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}</p>
            )}
            <button onClick={write} className="w-full flex items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">
              {status === 'error' ? <><RefreshCw className="w-5 h-5 mr-2" /> Tentar de novo</> : <><Nfc className="w-5 h-5 mr-2" /> Gravar</>}
            </button>
            {platform.canLock && <p className="text-xs text-gray-500 text-center">Depois de gravar, você poderá bloquear a tag contra regravação.</p>}
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
            <p className="text-gray-500">Se tiver um Android por perto, abra este painel no Chrome dele para gravar direto daqui.</p>
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
