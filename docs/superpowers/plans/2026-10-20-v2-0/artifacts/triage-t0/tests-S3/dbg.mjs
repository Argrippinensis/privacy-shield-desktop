const APP='/tmp/triage/v2';
const { launchApp, toolFrame } = await import(APP + '/tests/helpers.mjs');
const a = await launchApp({ offline: true }); const f = await toolFrame(a.win);
await f.evaluate(() => { document.getElementById('VN').value='<IMG/SRC=X/ONERROR=PSS3MARK=1>'; document.getElementById('VP').value='ZZ\\d'; addCV(); });
await f.waitForTimeout(1000);
console.log(await f.evaluate(() => [document.getElementById('CVL').innerHTML, window.PSS3MARK, document.querySelector('#CVL img') && document.querySelector('#CVL img').complete]));
console.log(a.errors);
await a.close();
