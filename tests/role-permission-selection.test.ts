import assert from 'node:assert/strict';
import { includeAncestors, updateCheckedIds } from '../src/views/system/role/modules/role-permission-selection';

const tree = [
  { id: 10000, children: [{ id: 10010 }, { id: 10030 }, { id: 10040 }] },
  { id: 1000, children: [{ id: 1090, children: [{ id: 1093 }, { id: 1094 }] }] }
];

assert.deepEqual(includeAncestors(tree, [10030, 10040]), [10030, 10040, 10000]);
assert.deepEqual(updateCheckedIds(tree, [], [10000]), [10000, 10010, 10030, 10040]);
assert.deepEqual(updateCheckedIds(tree, [], [10000], false), [10000]);
assert.deepEqual(updateCheckedIds(tree, [], [10030], false), [10030, 10000]);
assert.deepEqual(
  updateCheckedIds(tree, [10030, 10040, 10000], [10030, 10040, 10000, 1093]),
  [10030, 10040, 10000, 1093, 1000, 1090]
);
assert.deepEqual(updateCheckedIds(tree, [10030, 10040, 10000], [10030, 10000]), [10030, 10000]);
assert.deepEqual(updateCheckedIds(tree, [10030, 10040, 10000], [10030, 10040]), []);
assert.deepEqual(updateCheckedIds(tree, [10030, 10000], [10030, 10000, 10010]), [10030, 10000, 10010]);
assert.deepEqual(
  includeAncestors([{ id: '9223372036854775000', children: [{ id: '9223372036854775001' }] }], ['9223372036854775001']),
  ['9223372036854775001', '9223372036854775000']
);
console.log('PASS: role permission ancestors, sibling isolation and large menu IDs');
