/**
 * Account and data deletion.
 *
 * Web build (no sign-in): progress lives only on this device, so deleting it
 * clears this browser's saved data (deleteLocalData).
 *
 * Mobile apps (Firebase Auth + Firestore): deleteFirebaseAccount removes the
 * player's Firestore data and then the Auth account, as Apple requires for
 * apps that let people create accounts. The Firebase functions are passed in,
 * so this file has no SDK dependency and is unit tested with fakes:
 *
 *   import { getAuth, deleteUser } from 'firebase/auth';
 *   import { getFirestore, doc, collection, getDocs, writeBatch } from 'firebase/firestore';
 *   await deleteFirebaseAccount({ auth: getAuth(), db: getFirestore(),
 *     deleteUser, doc, collection, getDocs, writeBatch });
 *
 * USER_DATA_LAYOUT names every Firestore location that holds a player's data.
 * When a new collection stores player data, add it here so deletion stays
 * complete. Purchases are not deleted: they belong to the player's App Store
 * or Google Play account, and RevenueCat keeps the receipt record. The
 * Premium screen explains that purchases are managed by the store.
 */

/** Firestore paths holding a player's data. `{uid}` is replaced. */
const USER_DATA_LAYOUT = {
  documents: ['users/{uid}'],
  // Subcollections under users/{uid}; each document in them is deleted.
  subcollections: ['users/{uid}/progress', 'users/{uid}/history'],
};

/** Browser storage keys this app writes (progress, purchases cache, map state). */
const LOCAL_KEYS = ['quitQuestData', 'qq.sessions', 'qq.devMock.scenario', 'qq.devMock.owned'];
const LOCAL_PREFIXES = ['qq.entitlements.'];

function deleteLocalData(storage) {
  if (!storage) return { ok: false };
  try {
    for (const k of LOCAL_KEYS) storage.removeItem(k);
    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i);
      if (k && LOCAL_PREFIXES.some((p) => k.startsWith(p))) storage.removeItem(k);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

/**
 * Delete the signed-in player's Firestore data, then their Auth account.
 * Returns { ok } or { ok: false, code } where code is:
 *   'not_signed_in'
 *   'requires_recent_login'  Firebase needs the player to sign in again first
 *   'failed'                 anything else (nothing is shown raw to the player)
 */
async function deleteFirebaseAccount({ auth, db, deleteUser, doc, collection, getDocs, writeBatch }) {
  const user = auth && auth.currentUser;
  if (!user) return { ok: false, code: 'not_signed_in' };
  const uid = user.uid;
  const path = (p) => p.replace('{uid}', uid);
  try {
    for (const sub of USER_DATA_LAYOUT.subcollections) {
      const snap = await getDocs(collection(db, path(sub)));
      let batch = writeBatch(db);
      let n = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        if (++n % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      await batch.commit();
    }
    const batch = writeBatch(db);
    for (const p of USER_DATA_LAYOUT.documents) batch.delete(doc(db, path(p)));
    await batch.commit();
    await deleteUser(user);
    return { ok: true };
  } catch (err) {
    if (err && err.code === 'auth/requires-recent-login') return { ok: false, code: 'requires_recent_login' };
    return { ok: false, code: 'failed' };
  }
}

module.exports = { deleteLocalData, deleteFirebaseAccount, USER_DATA_LAYOUT, LOCAL_KEYS };
