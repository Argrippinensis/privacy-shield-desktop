import json, os, shutil, time
h = os.path.expanduser('~'); ts = time.strftime('%Y%m%d-%H%M%S')
p = os.path.join(h, '.claude', 'settings.json')
shutil.copy2(p, p + '.bak-' + ts)
s = json.load(open(p, encoding='utf-8'))
allow = s.setdefault('permissions', {}).setdefault('allow', [])
# 1) zu breite Regel verengen: "xvfb-run *" startet JEDEN Befehl; nur noch npm und node
removed = [r for r in ['Bash(xvfb-run *)'] if r in allow]
for r in removed: allow.remove(r)
new = ['Bash(xvfb-run -a npm *)', 'Bash(xvfb-run -a node *)',
       'Bash(mkdir *)', 'Bash(cp *)', 'Bash(touch *)', 'Bash(diff *)', 'Bash(patch *)', 'Bash(tar *)', 'Bash(7z *)', 'Bash(pgrep *)']
added = [r for r in new if r not in allow]
allow.extend(added)
json.dump(s, open(p, 'w', encoding='utf-8'), indent=2, ensure_ascii=False); open(p, 'a').write('\n')
print('entfernt:', removed or 'nichts'); print('ergaenzt:', added or 'nichts'); print('Sicherung: settings.json.bak-' + ts)
