const Tag = require('../models/Tag');

// Slug igual ao código de uma tag é reservado para a tag. Tag pet usa o próprio
// código como link (/codigo), então um lojista que pegasse esse slug antes
// impediria para sempre a ativação daquela tag (o código fica até nos slugs
// antigos dele). Exceções: a tag do próprio dono (conta antiga cujo ID é o
// código da tag, ou tag vinculada à conta depois).
async function slugTakenByTag(slug, { ownTagId = null, ownUserObjectId = null } = {}) {
  if (!slug || slug === ownTagId) return false;
  const tag = await Tag.findOne({ id: slug }).select('activatedBy').lean();
  if (!tag) return false;
  if (ownUserObjectId && tag.activatedBy && String(tag.activatedBy) === String(ownUserObjectId)) return false;
  return true;
}

module.exports = { slugTakenByTag };
