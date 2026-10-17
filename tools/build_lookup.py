#!/usr/bin/env python3
"""Tap a word to look it up: splits every line the app can show for reading (Story beats, Ren's Messages, Library
readers) into words with Open JTalk, finds each word's dictionary form, and writes js/lookup-data.js.

Each word is matched, in this order, to: a word tagged on that line (a story beat's words, a message's Garden words),
a Garden card (the N5/N4/N3 decks, story and kanji words), a particle or grammar ending (js/lookup.js explains those),
or a JMdict entry (EDRDG, CC BY-SA 4.0). JMdict glosses are kept in tools/jmdict-glosses.tsv, so a rebuild without
the dictionary file still has them. To refresh them, point JMDICT_DB at a jamdict SQLite file (the jamdict-data
package ships one as jamdict.db.xz).

Called by tools/build_assets.py. On its own:
  python3 tools/build_lookup.py                 # rebuild js/lookup-data.js
  python3 tools/build_lookup.py --check N4      # list Library words beyond the decks up to N4 (for writing readers)
"""
import json
import os
import re
import sqlite3
import subprocess
import sys

import pyopenjtalk

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOSSES = os.path.join(ROOT, 'tools', 'jmdict-glosses.tsv')
OUT = os.path.join(ROOT, 'js', 'lookup-data.js')

KANJI = re.compile(r'[一-鿿々]')
JP = re.compile(r'[ぁ-ゖァ-ヺー一-鿿々]')


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


# Particles and grammar endings: shown with a short note from js/lookup.js (LOOKUP_GRAMMAR), not a dictionary entry.
PARTICLE_POS = {'助詞'}
# A token that attaches to the word before it (conjugation endings, suffixes), so たべました is one word: たべる.
ATTACH_POS = {('助動詞', None), ('動詞', '接尾'), ('形容詞', '接尾'), ('名詞', '接尾'), ('形容詞', '非自立'), ('動詞', '非自立')}
CONTENT_POS = {'名詞', '動詞', '形容詞', '副詞', '連体詞', '感動詞', '接続詞', '接頭詞', 'フィラー'}


def nodes(text):
    """Open JTalk's words for a text, each with its span in the text (spaces and symbols included as gaps)."""
    out = []
    pos = 0
    for n in pyopenjtalk.run_frontend(text.replace(' ', '').replace('　', '')):
        s = n['string']
        # Find the word in the original text, skipping the spaces the text puts between words.
        i = pos
        j = 0
        start = None
        while i < len(text) and j < len(s):
            if text[i] in ' 　' and start is None:
                i += 1
                continue
            if text[i] in ' 　':
                i += 1
                continue
            if text[i] != s[j]:
                break
            if start is None:
                start = i
            i += 1
            j += 1
        if j < len(s) or start is None:
            continue   # Open JTalk normalized the text (full-width digits, symbols): leave it as a gap
        out.append({**n, 'start': start, 'end': i})
        pos = i
    return out


def groups(text):
    """Words to tap: [{start, end, surface, base, read, kind}] where kind is 'word', 'particle' or 'gap'."""
    out = []
    for n in nodes(text):
        p, g1 = n['pos'], n['pos_group1']
        if not JP.search(n['string']) or not n['string'].strip('ー〜～'):
            continue   # a lone ー (がんばれー) is not a word to look up
        attach = (p, None) in ATTACH_POS or (p, g1) in ATTACH_POS
        # て / で / ば after a verb or adjective belongs to it (まって = まつ).
        if p == '助詞' and g1 == '接続助詞' and n['string'] in ('て', 'で', 'ば', 'ちゃ', 'じゃ') and out and out[-1]['kind'] == 'word' and out[-1]['head_pos'] in ('動詞', '形容詞'):
            attach = True
        # Counters and numbers: 二本, 三時.
        if p == '名詞' and g1 == '数' and out and out[-1]['kind'] == 'word' and out[-1]['head_g1'] == '数' and out[-1]['end'] == n['start']:
            attach = True
        if attach and out and out[-1]['kind'] == 'word' and out[-1]['end'] == n['start']:
            last = out[-1]
            last['end'] = n['end']
            last['surface'] = text[last['start']:last['end']]
            last['read'] += n['read']
            last['parts'].append(n['orig'])
            continue
        if p in PARTICLE_POS or (p == '助動詞'):
            out.append({'start': n['start'], 'end': n['end'], 'surface': n['string'], 'base': n['orig'], 'read': n['read'], 'kind': 'particle',
                        'head_pos': p, 'head_g1': g1, 'parts': [n['orig']]})
            continue
        if p not in CONTENT_POS:
            continue
        # A prefix (お, ご) joins the word after it.
        out.append({'start': n['start'], 'end': n['end'], 'surface': n['string'], 'base': n['orig'], 'read': n['read'], 'kind': 'word',
                    'head_pos': p, 'head_g1': g1, 'parts': [n['orig']], 'prefix': p == '接頭詞'})
    # Join a prefix to the next word (お金, ご飯).
    merged = []
    for g in out:
        if merged and merged[-1].get('prefix') and merged[-1]['end'] == g['start'] and g['kind'] == 'word':
            m = merged.pop()
            g = {**g, 'start': m['start'], 'surface': text[m['start']:g['end']], 'read': m['read'] + g['read'], 'alt': m['base'] + g['base']}
        merged.append(g)
    return merged


# ---------------- dictionaries ----------------

def node_json(script):
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, capture_output=True, check=True, text=True).stdout)


def catalog():
    """Garden cards: id -> [jp, reading, en, level]."""
    return node_json("""
      const { GARDEN_CATALOG } = await import('./js/data.js');
      const out = {};
      for (const [id, x] of Object.entries(GARDEN_CATALOG)) out[id] = [x.jp, x.reading, x.en, x.level || 'N5'];
      process.stdout.write(JSON.stringify(out));
    """)


class Gloss:
    """JMdict meanings by written form: base -> (reading, gloss)."""

    def __init__(self):
        self.cache = {}
        if os.path.exists(GLOSSES):
            for line in open(GLOSSES, encoding='utf-8'):
                if line.startswith('#') or not line.strip():
                    continue
                base, reading, gloss = line.rstrip('\n').split('\t')
                self.cache[base] = (reading, gloss)
        path = os.environ.get('JMDICT_DB')
        self.db = sqlite3.connect(path) if path and os.path.exists(path) else None
        self.used = set()

    def get(self, base, read_hint=''):
        if base in self.cache:
            self.used.add(base)
            return self.cache[base]
        if not self.db:
            return None
        c = self.db
        if KANJI.search(base):
            ids = [r[0] for r in c.execute('select idseq from Kanji where text=?', (base,))]
        else:
            ids = [r[0] for r in c.execute('select idseq from Kana where text=?', (base,))]
        if not ids:
            return None

        def score(idseq):
            pri = c.execute('select count(*) from KJP join Kanji on KJP.kid=Kanji.ID where Kanji.idseq=?', (idseq,)).fetchone()[0]
            pri += c.execute('select count(*) from KNP join Kana on KNP.kid=Kana.ID where Kana.idseq=?', (idseq,)).fetchone()[0]
            kanas = [hira(r[0]) for r in c.execute('select text from Kana where idseq=?', (idseq,))]
            match = 1 if read_hint and hira(read_hint) in kanas else 0
            return (match, pri, -idseq)
        best = max(ids, key=score)
        kanas = [r[0] for r in c.execute('select text from Kana where idseq=? order by ID', (best,))]
        reading = hira(read_hint) if read_hint and hira(read_hint) in [hira(k) for k in kanas] else (kanas[0] if kanas else base)
        senses = [r[0] for r in c.execute('select ID from Sense where idseq=? order by ID', (best,))][:2]
        parts = []
        for sid in senses:
            gl = [r[0] for r in c.execute("select text from SenseGloss where sid=? and (lang='eng' or lang is null) order by rowid", (sid,))][:3]
            if gl:
                parts.append(', '.join(gl))
        if not parts:
            return None
        gloss = '; '.join(parts)
        self.cache[base] = (hira(reading), gloss)
        self.used.add(base)
        return self.cache[base]

    def save(self):
        rows = sorted((b, *self.cache[b]) for b in self.used)
        with open(GLOSSES, 'w', encoding='utf-8') as f:
            f.write('# Word lookup meanings from JMdict (EDRDG, CC BY-SA 4.0), for words not in the app\'s own decks.\n')
            f.write('# Written by tools/build_lookup.py. Columns: dictionary form, reading, meaning.\n')
            for r in rows:
                f.write('\t'.join(r) + '\n')


# ---------------- matching ----------------

class Matcher:
    def __init__(self, cat):
        self.cat = cat
        self.by_jp = {}
        self.by_reading = {}
        order = {'N5': 0, 'N4': 1, 'N3': 2}
        for cid, (jp, reading, en, level) in sorted(cat.items(), key=lambda kv: (order.get(kv[1][3], 3), not kv[0].startswith('n'))):
            self.by_jp.setdefault(jp, cid)
            self.by_reading.setdefault(hira(reading), cid)

    def card(self, g, hints):
        """The Garden card id for a word, or None."""
        cands = [g['surface'], g['base'], g.get('alt', '')]
        # Adverbs written with に (すぐに): the deck has すぐ.
        cands += [c[:-1] for c in cands if len(c) > 2 and c.endswith('に')]
        for h in hints:
            if h['jp'] in cands or (hira(h['reading']) == hira(g['base']) and not KANJI.search(g['base'])):
                return h.get('id') or None
        for c in cands:
            if c and c in self.by_jp:
                return self.by_jp[c]
        # A word written in kana (たべる) shares the card of the deck word written in kanji (食べる).
        for c in cands:
            if c and not KANJI.search(c) and hira(c) in self.by_reading:
                return self.by_reading[hira(c)]
        return None


E_TO_U = dict(zip('えけげせてねべめれ', 'うくぐすつぬぶむる'))


def plain_of_potential(base):
    """勝てる -> 勝つ, がんばれる -> がんばる: Open JTalk lists many potential verbs as words of their own."""
    if len(base) >= 3 and base.endswith('る') and base[-2] in E_TO_U:
        return base[:-2] + E_TO_U[base[-2]]
    return None


def base_reading(g):
    if not KANJI.search(g['base']):
        return hira(g['base'])
    r = ''.join(hira(n['read']) for n in pyopenjtalk.run_frontend(g['base']))
    return r


def build(items, cat=None):
    """items: [[text, hints]] where hints are [{jp, reading, en, id?}] tagged on that line. Returns (tokens, dict)."""
    cat = cat or catalog()
    matcher = Matcher(cat)
    gloss = Gloss()
    entries = []
    index = {}

    def entry(key, value):
        if key not in index:
            index[key] = len(entries)
            entries.append(value)
        return index[key]

    tokens = {}
    unknown = set()
    level_of = {}    # entry index -> easiest level of a line it's in
    order = ['N5', 'N4', 'N3']
    for item in items:
        text, hints = item[0], item[1]
        level = item[2] if len(item) > 2 else 'N5'
        if text in tokens:
            for i in tokens[text][1::2]:
                if i >= 0 and order.index(level) < order.index(level_of.get(i, 'N3')):
                    level_of[i] = level
            continue
        seq = []
        at = 0
        for g in groups(text):
            if g['start'] > at:
                seq += [g['start'] - at, -1]
            n = g['end'] - g['start']
            if g['kind'] == 'particle':
                seq += [n, entry('p:' + g['base'], ['p', g['base']])]
            elif g['head_g1'] == '数':
                # A number, with its counter if it has one (七時, 二本): explained by js/lookup.js.
                counter = g['parts'][-1] if len(g['parts']) > 1 else ''
                seq += [n, entry('n:' + g['surface'], ['n', g['surface'], hira(g['read']), counter])]
            else:
                cid = matcher.card(g, hints)
                hint = next((h for h in hints if h['jp'] in (g['surface'], g['base'])), None)
                if cid:
                    seq += [n, entry('g:' + cid, ['g', cid])]
                elif hint:
                    seq += [n, entry('h:' + hint['jp'], ['w', hint['jp'], hint['reading'], hint['en']])]
                else:
                    jm = gloss.get(g['base'], base_reading(g))
                    plain = None if jm else plain_of_potential(g['base'])
                    if plain:
                        pcid = matcher.card({**g, 'surface': plain, 'base': plain, 'alt': ''}, [])
                        if pcid:
                            seq += [n, entry('c:' + pcid, ['c', pcid])]
                            at = g['end']
                            continue
                        jm2 = gloss.get(plain, '')
                        if jm2:
                            jm = (jm2[0], jm2[1])
                            g = {**g, 'base': plain}
                            seq += [n, entry('k:' + plain, ['k', plain, jm[0], jm[1]])]
                            at = g['end']
                            continue
                    if jm:
                        seq += [n, entry('j:' + g['base'], ['j', g['base'], jm[0], jm[1]])]
                    else:
                        seq += [n, entry('r:' + g['base'], ['r', g['base'], base_reading(g)])]
                        unknown.add(g['base'])
            at = g['end']
        if at < len(text):
            seq += [len(text) - at, -1]
        tokens[text] = seq
        for i in seq[1::2]:
            if i >= 0 and order.index(level) < order.index(level_of.get(i, 'N3')):
                level_of[i] = level
    gloss.save()
    build.level_of = level_of
    return tokens, entries, unknown


def extra_clips(entries, level_of):
    """Clips for looked-up words that aren't Garden cards (those already have one): [reading, voice, opts, speeds, level]."""
    out = []
    for i, e in enumerate(entries):
        if e[0] in ('j', 'k', 'w', 'r', 'n') and len(e) > 2 and e[2] and JP.search(e[2]):
            out.append([e[2], 0, None, [''], level_of.get(i, 'N5')])
    return out


def write(tokens, entries):
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build_lookup.py: tap a word to look it up (js/lookup.js).\n')
        f.write('// TOKENS: text -> [length, entry, length, entry, ...] (entry -1: not a word, like a space or 。).\n')
        f.write("// ENTRIES: ['g', Garden id] | ['p', particle or ending] | ['n', number, reading, counter] | ['w', jp, reading, meaning] (a word tagged on its line)\n")
        f.write("//   | ['j', jp, reading, meaning] (JMdict, EDRDG, CC BY-SA 4.0) | ['r', jp, reading] (no meaning known)\n")
        f.write("//   | ['c', Garden id] / ['k', jp, reading, meaning]: the word in its \"can do\" (potential) form.\n")
        f.write('export const ENTRIES = ' + json.dumps(entries, ensure_ascii=False, separators=(',', ':')) + ';\n')
        f.write('export const TOKENS = ' + json.dumps(tokens, ensure_ascii=False, separators=(',', ':'), sort_keys=True) + ';\n')
    print(f'lookup: {len(tokens)} lines, {len(entries)} entries')


def collect():
    return json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'collect.mjs'), '--lookup'], capture_output=True, check=True, text=True).stdout)['lookup']


NAMES = {'レン', 'カイト', 'ソラ', 'キク', 'キクさん', '田中', '田中さん', '師匠', 'ししょう', 'クロダ', '黒田'}


def check(level):
    """Words in the Library readers of `level` that aren't Garden cards at that level or below."""
    order = ['N5', 'N4', 'N3']
    allowed = set(order[:order.index(level) + 1])
    cat = catalog()
    matcher = Matcher(cat)
    data = node_json(f"""
      const {{ READERS }} = await import('./js/library-data.js');
      process.stdout.write(JSON.stringify(READERS.filter((r) => r.level === '{level}').map((r) => [r.id, r.lines.map((l) => l.jp)])));
    """)
    total = 0
    for rid, lines in data:
        missing = {}
        for line in lines:
            for g in groups(line):
                if g['kind'] != 'word' or g['head_g1'] in ('数', '固有名詞') or g['surface'] in NAMES:
                    continue
                total += 1
                cid = matcher.card(g, [])
                if not cid or cat[cid][3] not in allowed:
                    missing.setdefault(g['base'], 0)
                    missing[g['base']] += 1
        print(f'{rid}: {len(missing)} words beyond the decks: ' + ', '.join(f'{k}' + (f'×{v}' if v > 1 else '') for k, v in sorted(missing.items())))
    print(f'{total} words checked')


def main():
    if len(sys.argv) > 2 and sys.argv[1] == '--check':
        check(sys.argv[2])
        return
    tokens, entries, unknown = build(collect())
    write(tokens, entries)
    if unknown:
        print(f'lookup: {len(unknown)} words with no meaning: ' + ', '.join(sorted(unknown)[:80]))


if __name__ == '__main__':
    main()
