// Statische Pruefung der CI-Konfiguration (F4.b): ci.yml und build.yml sind gueltiges YAML, ci.yml fuehrt die Unit-Tests
// aus, build.yml enthaelt Eingabe break_model und den Windows-Installationstest. Kein Electron, kein Netz.
// YAML-Pruefung ueber python3 + PyYAML; fehlt eines von beiden, wird nur dieser Test uebersprungen (Textpruefungen laufen immer).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (name) => readFileSync(path.join(ROOT, '.github', 'workflows', name), 'utf8');
const buildYml = read('build.yml');
const ciYml = read('ci.yml');

function yamlSupport() {
  const r = spawnSync('python3', ['-I', '-c', 'import yaml'], { encoding: 'utf8' });
  return r.error || r.status !== 0 ? false : true;
}
const HAS_YAML = yamlSupport();
const SKIP_YAML = HAS_YAML ? false : 'python3 oder PyYAML fehlt: YAML-Pruefung uebersprungen';

for (const name of ['build.yml', 'ci.yml']) {
  test(`${name} ist gueltiges YAML`, { skip: SKIP_YAML }, () => {
    const file = path.join(ROOT, '.github', 'workflows', name);
    const r = spawnSync('python3', ['-I', '-c', 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))', file], { encoding: 'utf8' });
    assert.equal(r.status, 0, `YAML-Fehler in ${name}: ${r.stderr}`);
  });
}

test('ci.yml enthaelt den Schritt npm run test:unit', () => {
  assert.match(ciYml, /^\s*(?:-\s+)?run:\s*npm run test:unit\s*$/m);
});

test('build.yml: workflow_dispatch-Eingabe break_model (boolean)', () => {
  assert.match(
    buildYml,
    /workflow_dispatch:[ \t]*\r?\n[ \t]+inputs:[ \t]*\r?\n(?:[ \t]+.*\r?\n|[ \t]*\r?\n)*?[ \t]+break_model:[ \t]*\r?\n(?:[ \t]+.*\r?\n)*?[ \t]+type:[ \t]*boolean\b/,
    'Eingabe break_model mit type: boolean unter workflow_dispatch.inputs fehlt'
  );
});

test('build.yml: Windows-Installationsschritt mit stiller Installation nach C:\\PS-Test', () => {
  assert.match(buildYml, /Setup\.exe/, 'Installer PrivacyShield-Setup.exe wird nicht aufgerufen');
  assert.match(buildYml, /\/D=C:\\PS-Test/, 'Installationsziel /D=C:\\PS-Test fehlt');
  const s = buildYml.search(/['"]?\/S['"]?[\s,]/);
  const d = buildYml.indexOf('/D=C:\\PS-Test');
  assert.ok(s >= 0, 'Schalter /S (still) fehlt');
  assert.ok(s < d, '/D= muss das letzte Argument sein (nach /S)');
  assert.doesNotMatch(buildYml, /\/D=["']C:/, '/D= darf nicht in Anfuehrungszeichen stehen');
});

test('build.yml: Modellgroesse 135359829 Bytes wird geprueft', () => {
  assert.match(buildYml, /\b135359829\b/);
  assert.match(buildYml, /model_quantized\.onnx/);
});

test('build.yml: installierte App wird mit PS_INSTALLED=1 und tests/installed.test.mjs getestet', () => {
  assert.match(buildYml, /PS_INSTALLED\s*[:=]\s*['"]?1\b/);
  assert.match(buildYml, /installed\.test\.mjs/);
});

test('build.yml: kein ${{ inputs ... }} innerhalb eines run:-Blocks (Script-Injection, nur env:)', { skip: SKIP_YAML }, () => {
  const py = 'import yaml,sys,json; d=yaml.safe_load(open(sys.argv[1])); print(json.dumps([[j,s.get("name"),s.get("run")] for j,v in d["jobs"].items() for s in v.get("steps",[]) if "run" in s]))';
  const r = spawnSync('python3', ['-I', '-c', py, path.join(ROOT, '.github', 'workflows', 'build.yml')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  for (const [job, name, run] of JSON.parse(r.stdout)) {
    assert.doesNotMatch(String(run), /\$\{\{\s*(?:github\.event\.)?inputs/, `Schritt "${name}" (${job}): inputs im run:-Block, per env: uebergeben`);
  }
});

test('build.yml: die drei Installationsschritte laufen nur unter Windows mit shell: pwsh', { skip: SKIP_YAML }, () => {
  const py = 'import yaml,sys,json; d=yaml.safe_load(open(sys.argv[1])); print(json.dumps([s for v in d["jobs"].values() for s in v.get("steps",[])]))';
  const r = spawnSync('python3', ['-I', '-c', py, path.join(ROOT, '.github', 'workflows', 'build.yml')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const steps = JSON.parse(r.stdout);
  const wanted = [/Installer still installieren/, /Modelldatei der Installation/, /Tests gegen die installierte App/];
  for (const re of wanted) {
    const s = steps.find((x) => re.test(x.name || ''));
    assert.ok(s, `Schritt ${re} fehlt`);
    assert.match(String(s.if), /runner\.os\s*==\s*'Windows'/, `Schritt "${s.name}": Bedingung runner.os == 'Windows' fehlt`);
    assert.equal(s.shell, 'pwsh', `Schritt "${s.name}": shell: pwsh fehlt`);
  }
});
