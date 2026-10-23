// Statische Pruefungen ohne App-Start: Hausregeln fuer Oberflaeche und Doku.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { ROOT } from './helpers.mjs';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('Keine Emojis in Oberflaeche, Code und Dokumentation', () => {
  const emoji = /[\p{Emoji_Presentation}️]/u;
  const docs = fs.existsSync(path.join(ROOT, 'docs')) ? fs.readdirSync(path.join(ROOT, 'docs'), { recursive: true }).filter((f) => f.endsWith('.md')).map((f) => 'docs/' + String(f).split(path.sep).join('/')) : [];
  for (const f of ['app/index.html', 'app/privacy-shield.html', 'app/cli.html', 'main.js', 'preload.js', 'README.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', ...docs]) {
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    const m = read(f).match(emoji);
    assert.equal(m, null, `${f} enthaelt ein Emoji (${m && m[0]}); stattdessen SVG oder Text verwenden`);
  }
});

test('Texte der Shell haben korrekte Umlaute', () => {
  const s = read('app/index.html');
  for (const bad of ['Spater', 'verfugbar', 'durchgefuhrt', 'schliessen', 'Schliessen', ' lauft']) assert.ok(!s.includes(bad), `Shell enthaelt "${bad}"`);
});

test('Das Tool spricht in der Desktop-App nicht von Browser-Tab', () => {
  const s = read('app/privacy-shield.html');
  for (const bad of ['Schließen des Tabs', 'Ihres Browsers', 'dein Browser', 'lokal im Browser', 'Empfohlen am PC']) assert.ok(!s.includes(bad), `Tool enthaelt "${bad}"`);
});
