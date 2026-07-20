// Plain-Node test, no framework — mirrors the style of the root project's
// tests/*.test.js. buildArgs.js is pure (no child_process, no network), so
// this needs zero mocking.
const assert = require('assert');
const {
    buildGenerateArgs,
    buildModelListArgs,
    buildModelGetArgs,
    buildGenerateGetArgs,
    buildAuthTokenArgs,
} = require('../buildArgs');

let failures = 0;
function check(label, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    const ok = a === e;
    if (!ok) failures++;
    console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}`);
    if (!ok) console.log(`        beklenen ${e}\n        gelen    ${a}`);
}

console.log('\n=== buildGenerateArgs ===');

check('temel prompt + wait bayrakları',
    buildGenerateArgs({ jobType: 'seedance_2_0', prompt: 'a cinematic shot' }),
    ['generate', 'create', 'seedance_2_0', '--prompt', 'a cinematic shot', '--json',
        '--wait', '--wait-timeout', '20m', '--wait-interval', '5s']);

check('params, modele özgü isimleriyle geçiyor (aspect_ratio, clip_aspect...)',
    buildGenerateArgs({ jobType: 'veo3', prompt: 'p', params: { aspect_ratio: '16:9', quality: 'high' } }),
    ['generate', 'create', 'veo3', '--prompt', 'p',
        '--aspect_ratio', '16:9', '--quality', 'high',
        '--json', '--wait', '--wait-timeout', '20m', '--wait-interval', '5s']);

check('boş/null/undefined param değerleri atlanıyor',
    buildGenerateArgs({ jobType: 'x', prompt: 'p', params: { a: '', b: null, c: undefined, d: '0' }, wait: false }),
    ['generate', 'create', 'x', '--prompt', 'p', '--d', '0', '--json']);

check('geçersiz param adı hata fırlatır',
    (() => { try { buildGenerateArgs({ jobType: 'x', prompt: 'p', params: { 'bad name;': '1' }, wait: false }); return 'no-throw'; } catch (e) { return e.message; } })(),
    'Invalid param name: bad name;');

check('wait:false -> wait bayrakları yok',
    buildGenerateArgs({ jobType: 'x', prompt: 'p', wait: false }),
    ['generate', 'create', 'x', '--prompt', 'p', '--json']);

check('jobType eksikse hata fırlatır',
    (() => { try { buildGenerateArgs({ prompt: 'p' }); return 'no-throw'; } catch (e) { return e.message; } })(),
    'jobType is required');

check('prompt eksikse hata fırlatır',
    (() => { try { buildGenerateArgs({ jobType: 'x' }); return 'no-throw'; } catch (e) { return e.message; } })(),
    'prompt is required');

console.log('\n=== Injection güvenliği: prompt tek, inert bir argv elemanı olarak kalıyor ===');

const dangerousPrompts = [
    '; rm -rf ~',
    '`whoami`',
    '$(cat /etc/passwd)',
    'a && echo pwned',
    'a || echo pwned',
    'a | cat /etc/passwd',
    'a" ; rm -rf ~ ; echo "',
];

dangerousPrompts.forEach(p => {
    const args = buildGenerateArgs({ jobType: 'x', prompt: p, wait: false });
    // The dangerous string must appear as EXACTLY ONE untouched array element
    // (immediately after '--prompt') — never split into multiple argv tokens,
    // which is what would happen if this were ever built as a shell string
    // and re-parsed. This is the property that keeps it safe when server.js
    // passes the array to execFile (never exec/a template string).
    const idx = args.indexOf('--prompt');
    check(`"${p}" tek argv elemanı olarak korunuyor`, args[idx + 1], p);
    // wait:false -> ['generate','create','x','--prompt',p,'--json'] = 6 eleman,
    // p ne kadar "tehlikeli" olursa olsun tek bir eleman olarak sayılmalı.
    check(`"${p}" argv dizisinin uzunluğunu bozmuyor`, args.length, 6);
});

console.log('\n=== buildModelListArgs ===');
check('type yoksa filtre yok', buildModelListArgs(), ['model', 'list', '--json']);
check('type=video', buildModelListArgs('video'), ['model', 'list', '--json', '--video']);
check('geçersiz type yoksayılıyor', buildModelListArgs('bogus'), ['model', 'list', '--json']);

console.log('\n=== buildModelGetArgs ===');
check('model get', buildModelGetArgs('veo3'), ['model', 'get', 'veo3', '--json']);
check('jobType eksikse hata fırlatır',
    (() => { try { buildModelGetArgs(); return 'no-throw'; } catch (e) { return e.message; } })(),
    'jobType is required');

console.log('\n=== buildGenerateGetArgs / buildAuthTokenArgs ===');
check('generate get', buildGenerateGetArgs('job-123'), ['generate', 'get', 'job-123', '--json']);
check('jobId eksikse hata fırlatır',
    (() => { try { buildGenerateGetArgs(); return 'no-throw'; } catch (e) { return e.message; } })(),
    'jobId is required');
check('auth token', buildAuthTokenArgs(), ['auth', 'token', '--json']);

console.log(`\n${failures === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${failures} TEST BAŞARISIZ`}`);
process.exit(failures === 0 ? 0 : 1);
