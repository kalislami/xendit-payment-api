import assert from 'node:assert/strict';
import { Prisma } from '../src/generated/prisma';

describe('Invoice database constraints', () => {
  it('keeps the Xendit ID primary and the application external ID unique', () => {
    const invoice = Prisma.dmmf.datamodel.models.find(model => model.name === 'Invoice');
    assert.equal(invoice?.fields.find(field => field.name === 'id')?.isId, true);
    assert.equal(invoice?.fields.find(field => field.name === 'externalId')?.isUnique, true);
  });
});
