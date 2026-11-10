/**
 * ASCII-grid sprites: one character per pixel, '.' is transparent and 'X'
 * is always the indigo950 outline. Other characters map through `legend`
 * to palette token names. Rows shorter than the width are padded on the
 * right with transparency; longer rows are an error.
 */
const { Img } = require('./image');
const { rgbOf } = require('./color');

function grid(rows, legend, size = 16) {
  if (rows.length !== size) throw new Error(`grid has ${rows.length} rows, expected ${size}`);
  const img = new Img(size, size);
  rows.forEach((row, y) => {
    if (row.length > size) throw new Error(`row ${y} "${row}" is ${row.length} wide, max ${size}`);
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const token = ch === 'X' ? 'indigo950' : legend[ch];
      if (!token) throw new Error(`no legend entry for "${ch}" in row ${y}`);
      img.set(x, y, rgbOf(token));
    });
  });
  return img;
}

module.exports = { grid };
