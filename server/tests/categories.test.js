const { api, createCategory, setupDatabase, clearDatabase, teardownDatabase } = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

describe('Categories', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  it('lists active categories, sorted by name, without inactive ones', async () => {
    await createCategory({ name: 'Web Development' });
    await createCategory({ name: 'Data Entry' });
    await createCategory({ name: 'Hidden One', isActive: false });

    const res = await api().get('/api/categories');

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.categories.map((c) => c.name),
      ['Data Entry', 'Web Development']
    );
    // Regression guard: every category must include a usable `id` (not `_id`). A missing
    // `virtuals: true` on the model's toJSON options would silently drop this field.
    res.body.data.categories.forEach((category) => {
      assert.match(category.id, /^[a-f\d]{24}$/i);
      assert.equal(category._id, undefined);
    });
  });

  it('does not require authentication', async () => {
    const res = await api().get('/api/categories');
    assert.equal(res.status, 200);
  });
});
