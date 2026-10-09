#!/usr/bin/env python3
"""Builds the generated assets: voice clips (audio/*.mp3 + js/clips.js), readings for romaji/furigana
(js/readings.js) and the service worker's precache list (sw.js).

Needs: node, ffmpeg, numpy, pyopenjtalk-plus (for readings) and VOICEVOX CORE 0.16 (for the voices):
  - the Python wheel voicevox_core-0.16.x-cp310-abi3-<platform>.whl from github.com/VOICEVOX/voicevox_core/releases
  - libvoicevox_onnxruntime from github.com/VOICEVOX/onnxruntime-builder/releases
  - open_jtalk_dic_utf_8-1.11 from github.com/r9y9/open_jtalk/releases
  - the .vvm voice models listed in VOICES, from github.com/VOICEVOX/voicevox_vvm/releases
  (or let VOICEVOX's `download` tool fetch them all). Point VOICEVOX_DIR at a folder holding
  onnxruntime/lib/, dict/open_jtalk_dic_utf_8-1.11/ and vvms/.
Run from the repo root after changing any Japanese text:  VOICEVOX_DIR=... python3 tools/build_assets.py
Existing clips are reused, so reruns only synthesize new lines. Without pyopenjtalk, js/readings.js is left as is.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import wave
from collections import Counter, defaultdict

import numpy as np

try:
    import pyopenjtalk
except ImportError:
    pyopenjtalk = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'audio')

# Per-character VOICEVOX voices. Index = `voice` in speaker.speak(); (vvm file, style id, credit name).
# Only voices whose terms allow free use with a "VOICEVOX:name" credit (shown in Settings, js/settings.js).
VOICES = [
    ('0.vvm', 2, '四国めたん'),     # 0 narrator, vocabulary, kana: clear standard voice
    ('9.vvm', 12, '白上虎太郎'),    # 1 Ren, shopkeeper: young, energetic
    ('15.vvm', 13, '青山龍星'),     # 2 the Master: deep, calm (personal use; companies must ask first)
    ('4.vvm', 11, '玄野武宏'),      # 3 Kaito, office worker
    ('21.vvm', 109, '東北イタコ'),  # 4 older customer
    ('0.vvm', 3, 'ずんだもん'),     # 5 kid
]
# Two recordings of every line: natural speed, and a slow one for the 🐢 setting (slowing at synthesis
# sounds far cleaner than stretching in the browser).
SPEEDS = {'': 1.0, 'slow': 0.6}
# Readings to use when a kanji run appears on its own or in text the build hasn't seen (Open JTalk's pick is off).
RUN_OVERRIDE = {'一': 'いち', '二': 'に', '三': 'さん', '四': 'よん', '五': 'ご', '明': 'めい', '鍛冶': 'かじ', '生': 'せい'}
WRONG = {'鍛冶'}   # misread everywhere, not just alone
# Single kana whose reading differs when said alone (は alone is read as the particle "wa").
SAY_AS = {'は': 'ハ', 'へ': 'ヘ'}

KANJI = r'一-鿿々'
SEG_RE = re.compile(r'[ぁ-ゖァ-ヺー' + KANJI + r']+')
RUN_RE = re.compile(r'[' + KANJI + r']+|[^' + KANJI + r']+')
IS_KANJI = re.compile(r'[' + KANJI + r']')


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 0x30a1 <= ord(c) <= 0x30f6 else c for c in s)


def clip_key(text, voice, speed=''):
    return f'{text}#{voice}' + (f'#{speed}' if speed else '')


def clip_name(text, voice, speed=''):
    tag = 'vv1|' + (f'{SPEEDS[speed]}|' if speed else '')
    return hashlib.sha1((tag + clip_key(text, voice, speed)).encode()).hexdigest()[:12] + '.mp3'


_synth = None


def synthesizer():
    global _synth
    if _synth is None:
        from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile
        base = os.environ.get('VOICEVOX_DIR', os.path.join(ROOT, 'voicevox_core'))
        ort = Onnxruntime.load_once(filename=os.path.join(base, 'onnxruntime', 'lib', Onnxruntime.LIB_VERSIONED_FILENAME))
        _synth = Synthesizer(ort, OpenJtalk(os.path.join(base, 'dict', 'open_jtalk_dic_utf_8-1.11')))
        for vvm in sorted({v[0] for v in VOICES}):
            with VoiceModelFile.open(os.path.join(base, 'vvms', vvm)) as m:
                _synth.load_voice_model(m)
    return _synth


def synth(text, voice, speed, out):
    s = synthesizer()
    style = VOICES[voice][1]
    q = s.create_audio_query(SAY_AS.get(text, text), style)
    q.speed_scale = SPEEDS[speed]
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
        f.write(s.synthesis(q, style))
    # Keep headroom: scale every clip to the same peak (0.9) so none clip and voices sound equally loud.
    with wave.open(tmp, 'rb') as w:
        sr, x = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64)
    peak = float(np.max(np.abs(x))) or 1.0
    x = (x * (0.9 * 32767 / peak)).astype(np.int16)
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(x.tobytes())
    # Trim silence, then add a short lead-in and tail so phones never swallow the first or last sound.
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af',
                    'silenceremove=start_periods=1:start_threshold=-55dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse,'
                    'afade=t=in:d=0.01,adelay=120,apad=pad_dur=0.25,aresample=24000',
                    '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', out], check=True)
    os.remove(tmp)


def build_clips(clips):
    os.makedirs(AUDIO, exist_ok=True)
    silence = os.path.join(AUDIO, 'silence.mp3')
    if not os.path.exists(silence):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.15',
                        '-c:a', 'libmp3lame', '-b:a', '32k', silence], check=True)
    table = {}
    keep = {'silence.mp3'}
    made = 0
    for text, voice in clips:
        for speed in SPEEDS:
            name = clip_name(text, voice, speed)
            keep.add(name)
            path = os.path.join(AUDIO, name)
            if not os.path.exists(path):
                synth(text, voice, speed, path)
                made += 1
            table[clip_key(text, voice, speed)] = name
    for f in os.listdir(AUDIO):
        if f not in keep:
            os.remove(os.path.join(AUDIO, f))
    with open(os.path.join(ROOT, 'js', 'clips.js'), 'w') as f:
        f.write('// Generated by tools/build_assets.py. Built-in voice clips: "text#voice" -> file in audio/.\n')
        f.write('export const CLIPS = ' + json.dumps(table, ensure_ascii=False, indent=0, sort_keys=True) + ';\n')
    print(f'clips: {len(table)} ({made} new)')


# ---------------- readings ----------------

def align(surface, reading):
    """Split surface into [text, reading-or-None] runs, given its full hiragana reading. None if it doesn't fit."""
    runs = RUN_RE.findall(surface)
    pattern = ''.join('(.+?)' if IS_KANJI.search(r) else '(' + re.escape(hira(r)) + ')' for r in runs)
    m = re.fullmatch(pattern, hira(reading))
    if not m:
        return None
    return [[r, m.group(i + 1) if IS_KANJI.search(r) else None] for i, r in enumerate(runs)]


def strip_marks(s):
    return re.sub(r'[\s、。！？!?…「」『』（）()・〜~,.]', '', s)


def char_readings_from_pair(jp, reading):
    """Per-run readings for a jp text with a known (spaced) reading, e.g. story lines."""
    parts = align(strip_marks(jp), strip_marks(reading))
    return parts


def char_readings_openjtalk(text):
    """[[surface, reading|None], ...] covering the Japanese in text, from Open JTalk's analysis."""
    out = []
    for n in pyopenjtalk.run_frontend(text):
        s, r = n['string'], n['read']
        if not IS_KANJI.search(s):
            out.append([s, None])
            continue
        parts = align(s, r)
        if parts is None:
            out.append([s, hira(r)])
        else:
            out.extend(parts)
    return out


def segments_with_parts(text, runs):
    """Map each Japanese segment of text to its parts, using a run list that covers text's Japanese characters."""
    # Expand runs into per-character labels: (char, run-id, reading)
    labels = []
    for i, (s, r) in enumerate(runs):
        for ch in s:
            labels.append((ch, i, r))
    result = {}
    pos = 0
    for m in SEG_RE.finditer(text):
        seg = m.group(0)
        # Walk labels to find this segment's characters in order.
        chars = []
        while pos < len(labels) and len(chars) < len(seg):
            ch, i, r = labels[pos]
            pos += 1
            if ch == seg[len(chars)]:
                chars.append((ch, i, r))
            elif chars:
                chars = []
        if len(chars) != len(seg) or not IS_KANJI.search(seg):
            continue
        parts = []
        for ch, i, r in chars:
            kan = bool(IS_KANJI.search(ch))
            if parts and parts[-1][2] == i and parts[-1][3] == kan:
                parts[-1][0] += ch
            else:
                parts.append([ch, r if kan else None, i, kan])
        # A kanji run cut by a segment edge would carry the full reading: drop those so the run table is used.
        fixed = []
        for t, r, i, kan in parts:
            full = ''.join(s for s, _ in [runs[i]])
            fixed.append([t, r if (not kan or t == full) else None])
        merged = []
        for t, r in fixed:
            if merged and r is None and merged[-1][1] is None and not IS_KANJI.search(t) and not IS_KANJI.search(merged[-1][0]):
                merged[-1][0] += t
            else:
                merged.append([t, r])
        result[seg] = merged
    return result


JS_STR = re.compile(r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`(?:[^`\\]|\\.)*`")


def source_texts():
    texts = set()
    for dirpath, _, files in os.walk(os.path.join(ROOT, 'js')):
        for f in files:
            if not f.endswith('.js') or f in ('readings.js', 'clips.js'):
                continue
            src = open(os.path.join(dirpath, f), encoding='utf-8').read()
            for m in JS_STR.finditer(src):
                s = m.group(0)[1:-1]
                s = re.sub(r'\$\{[^}]*\}', ' ', s)
                if IS_KANJI.search(s):
                    texts.add(s)
    return texts


def build_readings(pairs):
    segments = {}
    conflicts = []
    run_votes = defaultdict(Counter)

    def take(seg_map, source):
        for seg, parts in seg_map.items():
            for t, r in parts:
                if r and IS_KANJI.search(t):
                    run_votes[t][r] += 3 if source == 'data' else 1
            if seg in segments:
                if segments[seg] != parts and source == 'ojt':
                    conflicts.append((seg, segments[seg], parts))
                continue
            segments[seg] = parts

    # 1. Texts with readings written in the data win.
    for jp, reading in pairs:
        if not IS_KANJI.search(jp):
            continue
        parts = char_readings_from_pair(jp, reading)
        if parts is None:
            print('  could not align data reading:', jp, reading, file=sys.stderr)
            continue
        take(segments_with_parts(jp, parts), 'data')
    # 2. Everything else in the source, via Open JTalk.
    for text in sorted(source_texts()):
        take(segments_with_parts(text, char_readings_openjtalk(text)), 'ojt')

    runs = {t: c.most_common(1)[0][0] for t, c in run_votes.items()}
    runs.update(RUN_OVERRIDE)
    for seg in list(segments):
        segments[seg] = [[t, RUN_OVERRIDE.get(t, r) if seg == t or t in WRONG else r] for t, r in segments[seg]]
    # Only keep segments whose parts differ from what the run table would produce.
    def from_runs(seg):
        return [[t, runs.get(t) if IS_KANJI.search(t) else None] for t in RUN_RE.findall(seg)]
    seg_out = {s: p for s, p in segments.items() if p != from_runs(s)}
    with open(os.path.join(ROOT, 'js', 'readings.js'), 'w') as f:
        f.write('// Generated by tools/build_assets.py. Readings for furigana/romaji: story and word readings from data.js,\n')
        f.write('// everything else from Open JTalk. RUNS: kanji run -> hiragana. SEGMENTS: exceptions, segment -> [text, reading].\n')
        f.write('export const RUNS = ' + json.dumps(runs, ensure_ascii=False, sort_keys=True, indent=0) + ';\n')
        f.write('export const SEGMENTS = ' + json.dumps(seg_out, ensure_ascii=False, sort_keys=True) + ';\n')
    print(f'readings: {len(runs)} kanji runs, {len(seg_out)} segment exceptions, {len(conflicts)} conflicts')
    for c in conflicts:
        print('  conflict (data kept):', c, file=sys.stderr)
    with open(os.path.join(tempfile.gettempdir(), 'kotoba-readings-review.txt'), 'w') as f:
        for t, r in sorted(runs.items()):
            f.write(f'{t}\t{r}\t{dict(run_votes[t])}\n')


# ---------------- service worker ----------------

def build_sw():
    files = ['./', './index.html', './styles.css', './manifest.webmanifest']
    for sub in ('js', 'icons', 'audio'):
        for dirpath, _, names in os.walk(os.path.join(ROOT, sub)):
            for n in sorted(names):
                files.append('./' + os.path.relpath(os.path.join(dirpath, n), ROOT).replace(os.sep, '/'))
    path = os.path.join(ROOT, 'sw.js')
    src = open(path, encoding='utf-8').read()
    listing = 'const FILES = [\n' + ''.join(f"  '{f}',\n" for f in files) + '];'
    src = re.sub(r'const FILES = \[.*?\];', lambda _: listing, src, flags=re.S)
    open(path, 'w', encoding='utf-8').write(src)
    print(f'sw.js: {len(files)} files to precache')


def main():
    data = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'collect.mjs')], capture_output=True, check=True, text=True).stdout)
    build_clips([tuple(c) for c in data['clips']])
    if pyopenjtalk:
        build_readings(data['pairs'])
    else:
        print('readings: pyopenjtalk not installed, js/readings.js left as is')
    build_sw()


if __name__ == '__main__':
    main()
