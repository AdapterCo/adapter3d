// Taxa de entrega: única (deliveryFee) ou por bairro (deliveryZones), com frete
// grátis opcional a partir de um valor (freeDeliveryOver, sobre o subtotal já com
// desconto de cupom). Valores em CENTAVOS.

export const zonesOf = (settings) => (settings?.deliveryZones || []).filter(z => String(z?.name || '').trim());

// { fee, zone, needsZone, free, missingForFree }
export function deliveryQuote(settings, zoneId, subtotal) {
  const zones = zonesOf(settings);
  const zone = zones.find(z => String(z._id) === String(zoneId)) || null;
  const needsZone = zones.length > 0 && !zone;
  const base = zones.length > 0 ? Number(zone?.fee || 0) : Number(settings?.deliveryFee || 0);
  const freeOver = Number(settings?.freeDeliveryOver || 0);
  const free = freeOver > 0 && subtotal >= freeOver;
  const missingForFree = freeOver > 0 && !free && (needsZone || base > 0) ? freeOver - subtotal : 0;
  return { fee: free || needsZone ? 0 : base, zone, needsZone, free: free && base > 0, missingForFree };
}
