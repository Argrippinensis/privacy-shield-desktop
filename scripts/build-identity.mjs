import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url))); 
const files = fs.readdirSync('app/lib').filter(f => f.endsWith('.js') && f !== 'build-identity.js').sort();
const hash = crypto.createHash('sha256');
for (const f of ['app/privacy-shield.html', 'app/ner-worker.js', 'app/ui/evidence-ui.js', ...files.map(f => 'app/lib/' + f)]) { hash.update(f + '\0'); hash.update(fs.readFileSync(f)); }
const lock = JSON.parse(fs.readFileSync('scripts/vendor.lock.json'));
const modelRevision = lock.files.find(f => f.dest.startsWith('models/')).url.match(/resolve\/([a-f0-9]{40})/)[1];
fs.writeFileSync('app/ui/build-identity.js', '// Generated; SHA-256 of named shared sources, see scripts/build-identity.mjs.\nconst PS_BUILD = ' + JSON.stringify({coreSha256: hash.digest('hex'), modelRevision}) + ';\n');
