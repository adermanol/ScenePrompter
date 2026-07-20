// Plain-Node test, no framework — mirrors the style of the root project's
// tests/*.test.js. buildArgs.js is pure (no child_process, no network), so
// this needs zero mocking.
const assert = require('assert');
const {
    buildGenerateArgs,
    buildModelListArgs,
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

check('negative + aspectRatio ekleniyor',
    buildGenerateArgs({ jobType: 'kling_3_0', prompt: 'p', negative: 'blurry', aspectRatio: '16:9' }),
    ['generate', 'create', 'kling_3_0', '--prompt', 'p', '--json',
        '--negative-prompt', 'blurry', '--aspect-ratio', '16:9',
        '--wait', '--wait-timeout', '20m', '--wait-interval', '5s']);

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

console.log('\n=== buildGenerateGetArgs / buildAuthTokenArgs ===');
check('generate get', buildGenerateGetArgs('job-123'), ['generate', 'get', 'job-123', '--json']);
check('jobId eksikse hata fırlatır',
    (() => { try { buildGenerateGetArgs(); return 'no-throw'; } catch (e) { return e.message; } })(),
    'jobId is required');
check('auth token', buildAuthTokenArgs(), ['auth', 'token', '--json']);

console.log(`\n${failures === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${failures} TEST BAŞARISIZ`}`);
process.exit(failures === 0 ? 0 : 1);
