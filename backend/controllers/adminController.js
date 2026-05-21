const crypto = require('crypto');
const Tag = require('../models/Tag');

// POST /api/admin/tags
// Aceita 3 formatos no body:
//   { ids: ["tag-abc", "tag-xyz"] }                  → cria essas IDs específicas
//   { prefix: "lote-", count: 50, padding: 3 }       → cria lote-001..lote-050
//   { count: 50 }                                    → cria 50 com IDs aleatórios (8 hex chars)
exports.createTags = async (req, res) => {
  try {
    const { ids, prefix, count, padding = 3, notes = '', profileType = 'business' } = req.body || {};

    if (!['business', 'pet'].includes(profileType)) {
      return res.status(400).json({ message: 'profileType inválido. Use "business" ou "pet".' });
    }

    let tagIds = [];

    if (Array.isArray(ids) && ids.length > 0) {
      tagIds = ids.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof count === 'number' && count > 0 && count <= 1000) {
      if (typeof prefix === 'string' && prefix.length > 0) {
        for (let i = 1; i <= count; i++) {
          tagIds.push(`${prefix}${String(i).padStart(padding, '0')}`);
        }
      } else {
        for (let i = 0; i < count; i++) {
          tagIds.push(`tag-${crypto.randomBytes(4).toString('hex')}`);
        }
      }
    } else {
      return res.status(400).json({
        message: 'Envie { ids: [...] } ou { prefix, count } ou { count } (1-1000).'
      });
    }

    // insertMany com ordered:false → continua mesmo se algum duplicar
    let created = [];
    let duplicates = [];
    try {
      const docs = tagIds.map(id => ({ id, notes, profileType }));
      created = await Tag.insertMany(docs, { ordered: false });
    } catch (err) {
      if (err.writeErrors) {
        created = err.insertedDocs || [];
        duplicates = err.writeErrors
          .filter(e => e.err && e.err.code === 11000)
          .map(e => tagIds[e.index]);
      } else {
        throw err;
      }
    }

    res.status(201).json({
      createdCount: created.length,
      duplicateCount: duplicates.length,
      duplicates,
      created: created.map(t => ({ id: t.id, isActivated: t.isActivated, profileType: t.profileType, createdAt: t.createdAt }))
    });
  } catch (error) {
    console.error('createTags error:', error);
    res.status(500).json({ message: 'Erro ao criar tags.' });
  }
};

// GET /api/admin/tags?status=free|activated|all&type=business|pet|all (defaults: all)
exports.listTags = async (req, res) => {
  try {
    const { status = 'all', type = 'all' } = req.query;
    const filter = {};
    if (status === 'free') filter.isActivated = false;
    else if (status === 'activated') filter.isActivated = true;
    if (type === 'business' || type === 'pet') filter.profileType = type;
    const tags = await Tag.find(filter)
      .populate('activatedBy', 'slug email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ count: tags.length, tags });
  } catch (error) {
    console.error('listTags error:', error);
    res.status(500).json({ message: 'Erro ao listar tags.' });
  }
};

// DELETE /api/admin/tags/:id  (só se ainda não ativada)
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findOne({ id });
    if (!tag) return res.status(404).json({ message: 'Tag não encontrada.' });
    if (tag.isActivated) {
      return res.status(400).json({ message: 'Tag já ativada — não pode ser deletada.' });
    }
    await Tag.deleteOne({ id });
    res.json({ message: 'Tag removida.', id });
  } catch (error) {
    console.error('deleteTag error:', error);
    res.status(500).json({ message: 'Erro ao deletar tag.' });
  }
};
