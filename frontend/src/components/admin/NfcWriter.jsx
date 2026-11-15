import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Nfc, X, CheckCircle2, AlertTriangle, Copy, Smartphone, Lock, RefreshCw } from 'lucide-react';

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

function errorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Permissão de NFC negada. Toque no cadeado ao lado do endereço do site, permita "Dispositivos NFC" e tente de novo.';
    case 'NotSupportedError':
      return 'Não foi possível gravar: o NFC do celular está desligado ou a tag não é compatível. Ative o NFC nas configurações e tente de novo.';
    case 'NetworkError':
    case 'NotReadableError':
      return 'A tag se afastou durante a gravação. Tente de novo mantendo a tag encostada até aparecer a confirmação.';
    case 'InvalidStateError':
      return 'Esta tag está bloqueada contra gravação e não pode ser alterada.';
    default:
      return 'Não foi possível gravar a tag. Tente de novo.';
  }
}

export default function NfcWriter({ url, onClose }) {
  const [platform] = useState(detectPlatform);
  const [status, setStatus] = useState('idle'); // idle | waiting | locking | done | error
  const [error, setError] = useState('');
  const [lock, setLock] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const write = async () => {
    setError('');
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const ndef = new window.NDEFReader();
      setStatus('waiting');
      await ndef.write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.signal, overwrite: true });
      if (lock && platform.canLock) {
        setStatus('locking');
        await ndef.makeReadOnly({ signal: ctrl.signal });
      }
      setStatus('done');
    } catch (err) {
      if (err?.name === 'AbortError') { setStatus('idle'); return; }
      setError(errorMessage(err));
      setStatus('error');
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setStatus('idle');
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
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

        {platform.hasWebNfc ? (
          <div className="space-y-4">
            {status === 'done' ? (
              <div className="text-center space-y-3 py-2">
                <CheckCircle2 className="w-14 h-14 mx-auto text-green-600" />
                <p className="font-semibold">Tag gravada{lock && platform.canLock ? ' e bloqueada' : ''}!</p>
                <p className="text-sm text-gray-600">Teste: com a tela do celular desbloqueada, aproxime a tag. Seu perfil deve abrir.</p>
                <button onClick={() => setStatus('idle')} className="w-full p-3 border rounded-xl font-medium text-gray-700">Gravar outra tag</button>
              </div>
            ) : status === 'waiting' || status === 'locking' ? (
              <div className="text-center space-y-3 py-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
                  <Nfc className="w-10 h-10 text-blue-600" />
                </div>
                <p className="font-semibold">{status === 'locking' ? 'Bloqueando... mantenha a tag encostada' : 'Encoste a tag na parte de trás do celular'}</p>
                <p className="text-sm text-gray-600">Normalmente perto da câmera. Segure até aparecer a confirmação.</p>
                <button onClick={cancel} className="text-sm text-gray-500 underline">Cancelar</button>
              </div>
            ) : (
              <>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Ative o NFC nas configurações do celular.</li>
                  <li>Toque em <strong>Gravar</strong> e permita o uso de NFC.</li>
                  <li>Encoste a tag na parte de trás do celular.</li>
                </ol>

                {platform.canLock && (
                  <label className="flex items-start gap-3 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="w-4 h-4 mt-0.5" />
                    <span>
                      <span className="font-medium flex items-center gap-1"><Lock className="w-4 h-4" /> Bloquear contra regravação</span>
                      <span className="text-amber-800">Impede que outra pessoa grave um link falso na sua tag (recomendado para placas em mesas e balcões). <strong>Não pode ser desfeito.</strong></span>
                    </span>
                  </label>
                )}

                {status === 'error' && (
                  <p className="text-sm text-red-600 flex gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}</p>
                )}

                <button onClick={write} className="w-full flex items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">
                  {status === 'error' ? <><RefreshCw className="w-5 h-5 mr-2" /> Tentar de novo</> : <><Nfc className="w-5 h-5 mr-2" /> Gravar</>}
                </button>
              </>
            )}
          </div>
        ) : platform.isIOS ? (
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
