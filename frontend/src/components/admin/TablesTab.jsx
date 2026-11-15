import { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Utensils, Printer, Nfc, Copy } from 'lucide-react';
import NfcWriter from './NfcWriter';

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Pedido na mesa: cada mesa tem um QR/tag com o endereço permanente da loja +
// ?mesa=N. Quem pede por ele vê "Mesa N · consumo no local" no carrinho.
export default function TablesTab({ data, setData }) {
  const s = data.orderSettings || {};
  const enabled = !!s.tableService;
  const count = Math.min(200, Math.max(1, Number(s.tables) || 10));
  const baseUrl = `${window.location.origin}/tag/${encodeURIComponent(data.id)}`;
  const tableUrl = (n) => `${baseUrl}?mesa=${n}`;
  const [nfcTable, setNfcTable] = useState(null);
  const [copied, setCopied] = useState(null);
  const qrRef = useRef(null);

  const update = (patch) => setData(prev => ({ ...prev, orderSettings: { ...(prev.orderSettings || {}), ...patch } }));
  const tables = Array.from({ length: count }, (_, i) => i + 1);

  const copy = (n) => {
    navigator.clipboard.writeText(tableUrl(n));
    setCopied(n);
    setTimeout(() => setCopied(null), 2000);
  };

  // Folha A4 com o QR de todas as mesas, para recortar e colocar nas mesas.
  const printAll = () => {
    const svgs = [...(qrRef.current?.querySelectorAll('svg') || [])].map(svg => svg.outerHTML);
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) { alert('Permita pop-ups deste site para imprimir os QR Codes.'); return; }
    const name = escapeHtml(data.name);
    const cards = svgs.map((svg, i) => `
      <div class="card">
        <p class="store">${name}</p>
        <p class="table">Mesa ${i + 1}</p>
        <div class="qr">${svg}</div>
        <p class="hint">Aponte a câmera ou encoste o celular<br>para ver o cardápio e pedir</p>
      </div>`).join('');
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR das mesas - ${name}</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .card { border: 1px dashed #bbb; border-radius: 10px; padding: 5mm; text-align: center; break-inside: avoid; }
  .store { margin: 0; font-size: 11px; color: #555; }
  .table { margin: 2mm 0; font-size: 22px; font-weight: bold; }
  .qr svg { width: 38mm; height: 38mm; }
  .hint { margin: 2mm 0 0; font-size: 9px; color: #555; line-height: 1.3; }
</style></head><body><div class="grid">${cards}</div>
<script>window.onload = function () { window.focus(); window.print(); };</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2"><Utensils className="w-5 h-5" /> Pedido na mesa</h3>
      <p className="text-sm text-gray-500 -mt-2">
        Cada mesa ganha um QR Code (e, se quiser, uma tag NFC). O cliente aponta a câmera ou encosta o celular, monta o pedido e ele
        chega no seu WhatsApp com <strong>"MESA 5"</strong> em destaque: sem endereço, sem taxa de entrega e sem chamar o garçom.
      </p>

      {!data.whatsapp && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">Cadastre seu WhatsApp na aba Contato: é nele que os pedidos chegam.</p>
      )}

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={enabled} onChange={() => update({ tableService: !enabled })} className="w-5 h-5" />
        <span className="font-medium">Ativar pedido na mesa</span>
      </label>

      <div className={`space-y-4 ${enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block font-medium text-gray-700 mb-1">Quantidade de mesas</span>
            <input type="number" min={1} max={200} value={count} onChange={(e) => update({ tables: Math.min(200, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-28 px-3 py-2 border rounded-lg" />
          </label>
          <button type="button" onClick={printAll} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir QR de todas as mesas
          </button>
        </div>
        <p className="text-xs text-gray-500">Clique em <strong>Salvar</strong> no topo depois de ativar ou mudar a quantidade. Os QR Codes usam o endereço permanente da loja: continuam funcionando mesmo se você trocar o link do perfil.</p>

        <div className="border rounded-xl divide-y bg-white max-h-96 overflow-y-auto">
          {tables.map(n => (
            <div key={n} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="font-semibold w-20">Mesa {n}</span>
              <code className="text-xs text-gray-500 truncate flex-grow min-w-0">{tableUrl(n)}</code>
              <button type="button" onClick={() => copy(n)} className="p-2 rounded hover:bg-gray-100 text-gray-600" aria-label={`Copiar link da mesa ${n}`} title="Copiar link">
                {copied === n ? <span className="text-xs text-green-700">copiado</span> : <Copy className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => setNfcTable(n)} className="px-2 py-1 rounded border text-xs inline-flex items-center gap-1 hover:bg-gray-50">
                <Nfc className="w-3.5 h-3.5" /> Gravar tag
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* QR Codes renderizados fora da tela, usados na impressão */}
      <div ref={qrRef} aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 0 }}>
        {enabled && tables.map(n => <QRCode key={n} value={tableUrl(n)} size={256} level="M" />)}
      </div>

      {nfcTable && <NfcWriter url={tableUrl(nfcTable)} onClose={() => setNfcTable(null)} />}
    </div>
  );
}
