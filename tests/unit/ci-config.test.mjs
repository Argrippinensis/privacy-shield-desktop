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

for (const name of ['build.yml', 'ci.yml', 'pdf-portability.yml']) {
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

// Vorabversionen (R1beta): Tags mit '-' duerfen nie 'Latest' werden; stabile Tags behalten den bisherigen Ablauf.
function releaseJob() {
  const py = 'import yaml,sys,json; d=yaml.safe_load(open(sys.argv[1])); print(json.dumps(d["jobs"]["release"]))';
  const r = spawnSync('python3', ['-I', '-c', py, path.join(ROOT, '.github', 'workflows', 'build.yml')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const stepRun = (job, re) => {
  const s = job.steps.find((x) => re.test(x.name || ''));
  assert.ok(s, `Schritt ${re} fehlt`);
  return String(s.run);
};
const PRERELEASE_TEST = /case\s+"?\$\{?(?:GITHUB_REF_NAME|TAG)\}?"?\s+in[\s\S]*\*-\*\)|\[\[\s+"?\$\{?(?:GITHUB_REF_NAME|TAG)\}?"?\s+==\s+\*-\*\s+\]\]/;

test('build.yml: Release-Job legt bei Tags mit - das Release mit --prerelease an', { skip: SKIP_YAML }, () => {
  const run = stepRun(releaseJob(), /Release als Entwurf/);
  assert.match(run, PRERELEASE_TEST, 'Erkennung ueber den Tagnamen (*-*) fehlt');
  assert.match(run, /gh release create[^\n]*--draft[^\n]*--prerelease|gh release create[^\n]*--prerelease[^\n]*--draft|gh release create[^\n]*\$\{?PRERELEASE_FLAG|gh release create[^\n]*\$\{?PRERELEASE/, 'gh release create ohne --prerelease');
  assert.match(run, /--prerelease/, '--prerelease fehlt');
  assert.match(run, /\(Vorabversion\)/, 'Titelzusatz (Vorabversion) fehlt');
});

test('build.yml: Veroeffentlichen behaelt bei Vorabversionen das Flag --prerelease', { skip: SKIP_YAML }, () => {
  const run = stepRun(releaseJob(), /Hochgeladene Dateien pruefen/);
  assert.match(run, /gh release edit "\$GITHUB_REF_NAME" --draft=false --prerelease/);
  assert.match(run, /gh release edit "\$GITHUB_REF_NAME" --draft=false(?!\s+--prerelease)/, 'stabiler Pfad ohne --prerelease fehlt');
  assert.match(run, PRERELEASE_TEST);
});

test('build.yml: Download-Pruefung ueber releases/latest nur fuer stabile Tags, sonst releases/download/<Tag>', { skip: SKIP_YAML }, () => {
  const run = stepRun(releaseJob(), /Download-Links pruefen/);
  assert.match(run, PRERELEASE_TEST);
  assert.match(run, /releases\/latest\/download\/\$f/, 'stabiler Pfad ueber releases/latest/download fehlt');
  assert.match(run, /releases\/download\/\$\{?(?:GITHUB_REF_NAME|TAG)\}?\/\$f/, 'Pruefung ueber releases/download/<Tag>/<Datei> fehlt');
  const iPre = run.search(/releases\/download\/\$\{?(?:GITHUB_REF_NAME|TAG)/);
  const iLatest = run.search(/releases\/latest\/download/);
  assert.ok(iPre >= 0 && iLatest >= 0 && iPre < iLatest, 'Vorabversions-Zweig muss vor dem latest-Zweig stehen');
});

test('build.yml: bei Vorabversionen wird geprueft, dass releases/latest nicht der neue Tag ist', { skip: SKIP_YAML }, () => {
  const job = releaseJob();
  const all = job.steps.map((x) => String(x.run || '')).join('\n');
  assert.match(all, /gh api "?repos\/\$\{?REPO\}?\/releases\/latest"? --jq \.tag_name/);
  assert.match(all, /\[ "\$\w+" != "\$\{?(?:GITHUB_REF_NAME|TAG)\}?" \]|\[\[ "\$\w+" == "\$\{?(?:GITHUB_REF_NAME|TAG)\}?" \]\]/, 'Vergleich latest gegen neuen Tag fehlt');
});

test('build.yml: Release-Job mit gezieltem CI-Leserecht und unveraenderten Actions', { skip: SKIP_YAML }, () => {
  const job = releaseJob();
  assert.deepEqual(job.permissions, { contents: 'write', actions: 'read' });
  assert.deepEqual(job.steps.filter((x) => x.uses).map((x) => x.uses),
    ['actions/checkout@v7', 'actions/setup-node@v7', 'actions/download-artifact@v8']);
});

test('build.yml: vor dem Veroeffentlichen wird die Vorabversion-Markierung gegen den Tag geprueft', { skip: SKIP_YAML }, () => {
  const run = stepRun(releaseJob(), /Hochgeladene Dateien pruefen/);
  const iCheck = run.search(/--json isPrerelease --jq \.isPrerelease/);
  const iEdit = run.search(/gh release edit/);
  assert.ok(iCheck >= 0, 'Pruefung der isPrerelease-Markierung fehlt');
  assert.ok(iEdit >= 0 && iCheck < iEdit, 'Markierung muss VOR gh release edit (Veroeffentlichen) geprueft werden');
  assert.match(run, /Release bleibt Entwurf: Vorabversion ist nicht als Vorabversion markiert/);
  assert.match(run, /Release bleibt Entwurf: stabile Version ist als Vorabversion markiert/);
});

test('build.yml: der latest-Check besteht nicht still bei API-Fehlern (nur 404 gilt als kein stabiles Release)', { skip: SKIP_YAML }, () => {
  const run = stepRun(releaseJob(), /Download-Links pruefen/);
  assert.doesNotMatch(run, /releases\/latest"? --jq \.tag_name 2>\/dev\/null \|\| true/, 'stilles || true beim latest-Check');
  assert.match(run, /HTTP 404/, 'Unterscheidung 404 gegen andere Fehler fehlt');
  assert.match(run, /Latest-Pruefung nicht moeglich/);
});
