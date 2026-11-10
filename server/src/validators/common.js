const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'The provided ID is not valid.');

const idParamSchema = z.object({ id: objectId });

module.exports = { objectId, idParamSchema };
