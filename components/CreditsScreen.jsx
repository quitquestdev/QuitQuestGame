'use client';

/**
 * Credits: the contents of CREDITS.md, shown in the app (Hero tab > Credits)
 * so asset attribution and font licences are visible on every platform.
 *
 * A tiny reader for the parts of Markdown CREDITS.md uses: headings, lists,
 * tables, paragraphs, **bold**, `code` and links. Text is never injected as
 * HTML, so the file cannot run anything.
 */
import React, { useMemo } from 'react';
import Panel from './ui/Panel';
import Button from './ui/Button';
import Sprite from './Sprite';
import creditsText from '../CREDITS.md';

/** Inline: **bold**, `code` and [text](url) or bare https:// links. */
function inline(text, key = 'i') {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${n++}`;
    if (t.startsWith('**')) out.push(<strong key={k} className="text-bone">{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k} className="qq-code">{t.slice(1, -1)}</code>);
    else if (t.startsWith('[')) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
      out.push(<a key={k} className="qq-link" href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
    } else out.push(<a key={k} className="qq-link break-all" href={t} target="_blank" rel="noopener noreferrer">{t}</a>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parse(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { blocks.push({ type: 'h', level: h[1].length, text: h[2] }); i++; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i])) rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()));
        i++;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const depth = lines[i].match(/^\s*/)[0].length >= 2 ? 1 : 0;
        let text = lines[i].replace(/^\s*[-*]\s+/, '');
        i++;
        while (i < lines.length && lines[i].trim() && !/^\s*[-*]\s+/.test(lines[i]) && !/^(#|\|)/.test(lines[i])) text += ' ' + lines[i++].trim();
        items.push({ depth, text });
      }
      blocks.push({ type: 'list', items });
      continue;
    }
    let text = line.trim();
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|\||\s*[-*]\s)/.test(lines[i])) text += ' ' + lines[i++].trim();
    blocks.push({ type: 'p', text });
  }
  return blocks;
}

export default function CreditsScreen({ onClose }) {
  const blocks = useMemo(() => parse(creditsText), []);
  return (
    <div className="space-y-4">
      <Panel tone="raised" className="space-y-3 qq-credits">
        {blocks.map((b, i) => {
          if (b.type === 'h') {
            const cls = b.level === 1 ? 'type-title text-brass-300' : b.level === 2 ? 'type-heading text-brass-300 pt-2' : 'type-subheading text-bone pt-1';
            const Tag = `h${Math.min(4, b.level + 1)}`;
            return <Tag key={i} className={cls}>{inline(b.text, `h${i}`)}</Tag>;
          }
          if (b.type === 'p') return <p key={i} className="type-body text-bone">{inline(b.text, `p${i}`)}</p>;
          if (b.type === 'list') {
            return (
              <ul key={i} className="space-y-1 type-body text-bone">
                {b.items.map((it, j) => (
                  <li key={j} className={it.depth ? 'pl-8 list-[circle] list-inside' : 'pl-1 list-disc list-inside'}>{inline(it.text, `l${i}-${j}`)}</li>
                ))}
              </ul>
            );
          }
          const [head, ...rows] = b.rows;
          return (
            <table key={i} className="qq-table">
              <thead><tr>{head.map((c, j) => <th key={j} scope="col">{inline(c, `th${i}-${j}`)}</th>)}</tr></thead>
              <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c, `td${i}-${j}-${k}`)}</td>)}</tr>)}</tbody>
            </table>
          );
        })}
      </Panel>
      <div className="text-center">
        <Button size="sm" onClick={onClose}><Sprite id="icon_arrow_left" scale={1} />Back</Button>
      </div>
    </div>
  );
}
