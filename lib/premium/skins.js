/**
 * Premium knight skins. Each is a skin pack (see lib/sprites/registry.js)
 * built by `npm run sprites:skins`; selecting one layers its manifest over
 * the default art. Placeholder art until an artist's skins replace it.
 */
const SKINS = [
  { id: 'gilded', name: 'Gilded Paladin', description: 'Armour of antique gold, plume of crimson.' },
  { id: 'midnight', name: 'Midnight Warden', description: 'Night-blue plate with a brass shield.' },
  { id: 'silver', name: 'Silver Templar', description: 'Bright steel, a blue plume and a brass shield.' },
];

const skinManifestUrl = (id) => `/assets/skins/premium-${id}/manifest.json`;

module.exports = { SKINS, skinManifestUrl };
