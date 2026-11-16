// These tests need no database: they check the request rules and the model's own validation.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { createResourceSchema, updateResourceSchema, isWebLink } = require('../src/validators/resourceValidators');
const LearningResource = require('../src/models/LearningResource');

const validVideo = { title: 'React crash course', type: 'VIDEO', url: 'https://www.youtube.com/watch?v=abc123' };

function fieldsOf(result) {
  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('Learning resources: request rules (no database)', () => {
  describe('isWebLink', () => {
    it('accepts http and https links only', () => {
      assert.equal(isWebLink('https://example.com/a?b=1'), true);
      assert.equal(isWebLink('http://example.com'), true);
      assert.equal(isWebLink('javascript:alert(1)'), false);
      assert.equal(isWebLink('data:text/html,<h1>x</h1>'), false);
      assert.equal(isWebLink('ftp://example.com/file'), false);
      assert.equal(isWebLink('example.com'), false);
      assert.equal(isWebLink('not a link'), false);
    });
  });

  describe('createResourceSchema', () => {
    it('accepts a video with a link and fills the optional fields with empty strings', () => {
      const result = createResourceSchema.safeParse(validVideo);
      assert.equal(result.success, true);
      assert.equal(result.data.description, '');
      assert.equal(result.data.skill, '');
    });

    it('trims the title, link and skill label', () => {
      const result = createResourceSchema.safeParse({
        ...validVideo,
        title: '  React crash course  ',
        url: '  https://example.com/x  ',
        skill: '  React  ',
      });
      assert.equal(result.data.title, 'React crash course');
      assert.equal(result.data.url, 'https://example.com/x');
      assert.equal(result.data.skill, 'React');
    });

    it('requires a link for every type except NOTE', () => {
      for (const type of ['VIDEO', 'ARTICLE', 'COURSE', 'DOCUMENT', 'OTHER']) {
        const result = createResourceSchema.safeParse({ title: 'Something useful', type });
        assert.equal(result.success, false, `${type} should need a link`);
        assert.deepEqual(fieldsOf(result), ['url']);
      }
    });

    it('lets a NOTE have text and no link, and rejects a NOTE without text', () => {
      const ok = createResourceSchema.safeParse({ title: 'Before you apply', type: 'NOTE', description: 'You only need the basics.' });
      assert.equal(ok.success, true);

      const bad = createResourceSchema.safeParse({ title: 'Before you apply', type: 'NOTE' });
      assert.equal(bad.success, false);
      assert.deepEqual(fieldsOf(bad), ['description']);
    });

    it('rejects links that are not http(s), including javascript: links', () => {
      for (const url of ['javascript:alert(1)', 'ftp://example.com', 'example.com', 'data:text/plain,hi']) {
        const result = createResourceSchema.safeParse({ ...validVideo, url });
        assert.equal(result.success, false, `${url} should be rejected`);
        assert.ok(fieldsOf(result).includes('url'));
      }
    });

    it('rejects a missing or short title, an unknown type, and over-long values', () => {
      assert.equal(createResourceSchema.safeParse({ ...validVideo, title: undefined }).success, false);
      assert.equal(createResourceSchema.safeParse({ ...validVideo, title: 'ab' }).success, false);
      assert.equal(createResourceSchema.safeParse({ ...validVideo, type: 'PODCAST' }).success, false);
      assert.equal(createResourceSchema.safeParse({ ...validVideo, title: 'x'.repeat(121) }).success, false);
      assert.equal(createResourceSchema.safeParse({ ...validVideo, url: `https://example.com/${'a'.repeat(500)}` }).success, false);
      assert.equal(createResourceSchema.safeParse({ ...validVideo, description: 'x'.repeat(1001) }).success, false);
      assert.equal(createResourceSchema.safeParse({ ...validVideo, skill: 'x'.repeat(41) }).success, false);
    });

    it('drops fields the client must not choose (job, addedBy)', () => {
      const result = createResourceSchema.safeParse({ ...validVideo, job: 'x', addedBy: 'y' });
      assert.equal(result.success, true);
      assert.equal(result.data.job, undefined);
      assert.equal(result.data.addedBy, undefined);
    });
  });

  describe('updateResourceSchema', () => {
    it('accepts a partial update', () => {
      assert.equal(updateResourceSchema.safeParse({ title: 'A better title' }).success, true);
      assert.equal(updateResourceSchema.safeParse({ url: '' }).success, true); // clearing is allowed here; the service checks the type rule
    });

    it('rejects an empty update and unknown fields such as job', () => {
      assert.equal(updateResourceSchema.safeParse({}).success, false);
      assert.equal(updateResourceSchema.safeParse({ job: '64b64c9a7f1e8c0012345678' }).success, false);
      assert.equal(updateResourceSchema.safeParse({ addedBy: '64b64c9a7f1e8c0012345678' }).success, false);
    });

    it('still rejects a bad link or type', () => {
      assert.equal(updateResourceSchema.safeParse({ url: 'javascript:alert(1)' }).success, false);
      assert.equal(updateResourceSchema.safeParse({ type: 'PODCAST' }).success, false);
    });
  });
});

describe('Learning resources: model rules (no database)', () => {
  const base = () => ({
    job: new mongoose.Types.ObjectId(),
    addedBy: new mongoose.Types.ObjectId(),
    title: 'Learn the basics',
    type: 'ARTICLE',
    url: 'https://example.com/learn',
  });

  it('accepts a valid resource', async () => {
    await new LearningResource(base()).validate();
  });

  it('rejects a link-type resource without a link', async () => {
    const doc = new LearningResource({ ...base(), url: '' });
    await assert.rejects(() => doc.validate(), (error) => Boolean(error.errors.url));
  });

  it('rejects a NOTE without text but accepts one with text and no link', async () => {
    const empty = new LearningResource({ ...base(), type: 'NOTE', url: '' });
    await assert.rejects(() => empty.validate(), (error) => Boolean(error.errors.description));

    await new LearningResource({ ...base(), type: 'NOTE', url: '', description: 'Read the job description twice.' }).validate();
  });

  it('shows id, hides _id and addedBy in JSON', () => {
    const json = new LearningResource(base()).toJSON();
    assert.ok(json.id);
    assert.equal(json._id, undefined);
    assert.equal(json.addedBy, undefined);
    assert.equal(json.__v, undefined);
  });
});
