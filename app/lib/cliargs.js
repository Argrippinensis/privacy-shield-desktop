// Argumente der Kommandozeile (PSLib.cliargs), reines Modul ohne Oberflaechen- und Dateizugriff.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.cliargs = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TEXT = {
    noValue: (n) => 'Die Option ' + n + ' braucht einen Wert.',
    badProfile: 'Ungueltiger Wert fuer --profile (erlaubt: standard, finance, medical, strict, maximal).',
    badAi: 'Ungueltiger Wert fuer --ai (erlaubt: auto, off).',
    badEnv: 'Ungueltiger Variablenname fuer --password-env.',
    missing: (n) => 'Die Option ' + n + ' fehlt.',
    mapSource: '--map braucht genau eine Passwortquelle: --password-env oder --password-stdin.',
    password: 'Passwoerter nie als Argument, sondern --password-env oder --password-stdin verwenden.',
    unknown: (n) => 'Unbekannte Option ' + n + '.',
  };

  const VALUE = { '--in': 'in', '--out': 'out', '--profile': 'profile', '--ai': 'ai', '--policy': 'policy',
    '--map': 'map', '--password-env': 'passwordEnv', '--log': 'log' };
  const FLAG = { '--report': 'report', '--password-stdin': 'passwordStdin', '--fail-on-findings': 'failOnFindings',
    '--recursive': 'recursive', '--quiet': 'quiet' };
  const PROFILES = ['standard', 'finance', 'medical', 'strict'];
  // Diese Schalter gehoeren zu Electron/Chromium. Alle anderen unbekannten Schalter nach --cli sind wahrscheinlich Tippfehler.
  const RUNTIME_FLAGS = new Set(['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--enable-logging']);
  const RUNTIME_VALUES = new Set(['--inspect', '--remote-debugging-port', '--user-data-dir', '--lang']);

  function parse(argv) {
    const args = Array.isArray(argv) ? argv.map(String) : [];
    const rest = args.slice(1);
    const cliAt = rest.indexOf('--cli');
    if (cliAt < 0) return { cli: false, opts: {}, errors: [], code: 0 };
    const opts = { profile: 'standard', ai: 'auto', report: false, passwordStdin: false,
      failOnFindings: false, recursive: false, quiet: false };
    const errors = [];
    for (let i = 0; i < rest.length; i++) {
      const tok = rest[i];
      if (tok.slice(0, 2) !== '--') continue;
      const eq = tok.indexOf('=');
      const name = eq < 0 ? tok : tok.slice(0, eq);
      if (name === '--cli') continue;
      if (name === '--password' || name === '--passwort') { errors.push(TEXT.password); continue; }
      if (FLAG[name]) { opts[FLAG[name]] = true; continue; }
      if (!VALUE[name]) {
        if (i < cliAt || RUNTIME_FLAGS.has(name) || RUNTIME_VALUES.has(name)) {
          if (RUNTIME_VALUES.has(name) && eq < 0 && i + 1 < rest.length && rest[i + 1].slice(0, 2) !== '--') i++;
          continue;
        }
        errors.push(TEXT.unknown(name));
        continue;
      }
      let val;
      if (eq >= 0) val = tok.slice(eq + 1);
      else if (i + 1 < rest.length && rest[i + 1].slice(0, 2) !== '--') val = rest[++i];
      if (val === undefined || val === '') { errors.push(TEXT.noValue(name)); continue; }
      opts[VALUE[name]] = val;
    }
    if (opts.profile === 'maximal') opts.profile = 'strict';
    if (!PROFILES.includes(opts.profile)) { errors.push(TEXT.badProfile); opts.profile = 'standard'; }
    if (opts.ai !== 'auto' && opts.ai !== 'off') { errors.push(TEXT.badAi); opts.ai = 'auto'; }
    if (opts.passwordEnv !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(opts.passwordEnv)) errors.push(TEXT.badEnv);
    if (opts.in === undefined && !errors.some((e) => e === TEXT.noValue('--in'))) errors.push(TEXT.missing('--in'));
    if (opts.out === undefined && !errors.some((e) => e === TEXT.noValue('--out'))) errors.push(TEXT.missing('--out'));
    if (opts.map !== undefined && (opts.passwordEnv !== undefined) === opts.passwordStdin) errors.push(TEXT.mapSource);
    return { cli: true, opts, errors, code: errors.length ? 2 : 0 };
  }

  function norm(p) {
    const s = String(p);
    return s.length > 1 && /[\\/]$/.test(s) ? s.slice(0, -1) : s;
  }

  // Dateien aus argv ("Oeffnen mit"): ohne Programmdatei, ohne Schalter, ohne App-Pfad
  function fileArgs(argv, info) {
    const app = norm((info && info.appPath) || '');
    return (Array.isArray(argv) ? argv : []).slice(1).map(String)
      .filter((t) => t !== '' && t[0] !== '-' && norm(t) !== app);
  }

  return { parse, fileArgs };
});
