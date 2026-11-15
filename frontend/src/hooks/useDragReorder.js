import { useEffect, useRef, useState } from 'react';

// Reordenar lista arrastando pela alça. Usa pointer events (funciona com dedo e
// mouse; o drag-and-drop nativo do HTML não funciona no celular).
// Uso: lista com data-drag-list, itens com {...itemProps(i)} e alça com {...handleProps(i)}.
// onMove(from, to) deve aplicar a troca com setState funcional.
//
// Movimento e soltura são escutados na janela, não com setPointerCapture: ao
// reordenar, o React move o elemento no DOM e o navegador solta a captura do
// elemento movido, o que fazia o arraste parar depois da primeira troca.
export default function useDragReorder(onMove) {
  const current = useRef(null); // índice do item arrastado (muda a cada troca)
  const listRef = useRef(null);
  const onMoveRef = useRef(onMove);
  const cleanupRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  useEffect(() => { onMoveRef.current = onMove; });
  useEffect(() => () => cleanupRef.current?.(), []);

  const handleMove = (e) => {
    const from = current.current;
    const list = listRef.current;
    if (from === null || !list) return;
    e.preventDefault();
    const items = [...list.querySelectorAll(':scope > [data-drag-index]')];
    // Destino: o item mais distante cuja metade o ponteiro já passou.
    let to = from;
    items.forEach((el) => {
      const i = Number(el.dataset.dragIndex);
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (i < from && e.clientY < mid) to = Math.min(to, i);
      if (i > from && e.clientY > mid) to = Math.max(to, i);
    });
    if (to !== from) {
      onMoveRef.current(from, to);
      current.current = to;
      setDragging(to);
    }
    // Rolagem automática perto das bordas da tela.
    if (e.clientY < 60) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
  };

  const stop = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    current.current = null;
    listRef.current = null;
    setDragging(null);
  };

  const handleProps = (index) => ({
    'aria-label': 'Arrastar para reordenar',
    title: 'Arraste para mudar a ordem',
    style: { touchAction: 'none', cursor: dragging === null ? 'grab' : 'grabbing' },
    onPointerDown: (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      cleanupRef.current?.();
      current.current = index;
      listRef.current = e.currentTarget.closest('[data-drag-list]');
      setDragging(index);
      const opts = { passive: false };
      window.addEventListener('pointermove', handleMove, opts);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', handleMove, opts);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
      };
    }
  });

  const itemProps = (index) => ({
    'data-drag-index': index,
    'data-dragging': dragging === index ? 'true' : undefined
  });

  return { handleProps, itemProps, dragging };
}

// Move o item de `from` para `to` e renumera o campo order.
export function moveItem(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((x, i) => ({ ...x, order: i }));
}
