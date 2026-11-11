const test = require('node:test');
const assert = require('node:assert/strict');
const { deleteFirebaseAccount, deleteLocalData, USER_DATA_LAYOUT } = require('../lib/account/deleteAccount');

function fakeFirebase({ docsPer = 2, deleteUserError = null } = {}) {
  const deleted = [];
  const log = [];
  const user = { uid: 'u1' };
  return {
    deleted,
    log,
    deps: {
      auth: { currentUser: user },
      db: {},
      collection: (_db, path) => ({ path }),
      doc: (_db, path) => ({ path }),
      getDocs: async (col) => ({ docs: Array.from({ length: docsPer }, (_, i) => ({ ref: { path: `${col.path}/d${i}` } })) }),
      writeBatch: () => {
        const ops = [];
        return { delete: (ref) => ops.push(ref.path), commit: async () => deleted.push(...ops) };
      },
      deleteUser: async (u) => {
        if (deleteUserError) throw deleteUserError;
        log.push(`deleteUser:${u.uid}`);
      },
    },
  };
}

test('account deletion removes Firestore data first, then the Auth account', async () => {
  const f = fakeFirebase();
  const r = await deleteFirebaseAccount(f.deps);
  assert.deepEqual(r, { ok: true });
  assert.ok(f.deleted.includes('users/u1'));
  for (const sub of USER_DATA_LAYOUT.subcollections) assert.ok(f.deleted.includes(`${sub.replace('{uid}', 'u1')}/d0`));
  assert.deepEqual(f.log, ['deleteUser:u1']);
});

test('account deletion asks for a fresh sign-in when Firebase requires it', async () => {
  const f = fakeFirebase({ deleteUserError: Object.assign(new Error('x'), { code: 'auth/requires-recent-login' }) });
  assert.deepEqual(await deleteFirebaseAccount(f.deps), { ok: false, code: 'requires_recent_login' });
});

test('not signed in: nothing to delete', async () => {
  assert.deepEqual(await deleteFirebaseAccount({ auth: { currentUser: null } }), { ok: false, code: 'not_signed_in' });
});

test('delete my data (web) clears progress, purchase cache and dev state', () => {
  const m = new Map([['quitQuestData', '{}'], ['qq.entitlements.v1:anonymous', '{}'], ['qq.sessions', '3'], ['unrelated', 'keep']]);
  const storage = { removeItem: (k) => m.delete(k), get length() { return m.size; }, key: (i) => [...m.keys()][i] };
  assert.deepEqual(deleteLocalData(storage), { ok: true });
  assert.deepEqual([...m.keys()], ['unrelated']);
});
