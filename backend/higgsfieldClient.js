// Thin wrapper around the `higgsfield` CLI. We hold no API key and run no
// OAuth code ourselves — the CLI already manages its own token from
// `higgsfield auth login`, run once by the user in their own terminal. This
// file's only job is to invoke it safely and parse its --json output.
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const {
    buildGenerateArgs,
    buildModelListArgs,
    buildGenerateGetArgs,
    buildAuthTokenArgs,
} = require('./buildArgs');

// `npm install -g @higgsfield/cli` exposes a `higgsfield.cmd` shim on PATH,
// but Windows' CreateProcess cannot exec a .cmd directly — modern Node
// deliberately fails that with EINVAL unless you pass shell:true (a fix
// tied to CVE-2024-27980, so this isn't a bug to work around casually). The
// npm package is itself just an installer that downloads a real native
// binary to <global node_modules>/@higgsfield/cli/vendor/hf(.exe) at install
// time — we resolve and call THAT directly instead: plain execFile, argv
// array, zero shell involvement anywhere in the chain.
//
// Finding the global node_modules root without shelling out to `npm` itself
// (which is *also* a .cmd on Windows, so it would hit the identical EINVAL)
// — try the well-known default install locations and use whichever exists.
function candidateGlobalRoots() {
    const roots = [];
    if (process.platform === 'win32') {
        if (process.env.APPDATA) roots.push(path.join(process.env.APPDATA, 'npm', 'node_modules'));
        if (process.env.ProgramFiles) roots.push(path.join(process.env.ProgramFiles, 'nodejs', 'node_modules'));
    } else {
        roots.push('/usr/local/lib/node_modules', '/usr/lib/node_modules');
        if (process.env.HOME) roots.push(path.join(process.env.HOME, '.npm-global', 'lib', 'node_modules'));
    }
    return roots;
}

let cachedBinPath = null;
function resolveHiggsfieldBin() {
    if (cachedBinPath) return cachedBinPath;
    const exeName = process.platform === 'win32' ? 'hf.exe' : 'hf';
    const tried = [];
    for (const root of candidateGlobalRoots()) {
        const candidate = path.join(root, '@higgsfield', 'cli', 'vendor', exeName);
        tried.push(candidate);
        if (fs.existsSync(candidate)) {
            cachedBinPath = candidate;
            return candidate;
        }
    }
    throw new Error(
        `Could not find the higgsfield CLI binary. Looked in:\n  ${tried.join('\n  ')}\n` +
        `Install it with: npm install -g @higgsfield/cli`
    );
}

// Long video generations (Sora/Veo-class models) can take minutes; --wait on
// the CLI side already bounds it to 20m, so give execFile a little more than
// that rather than killing a job that's about to finish.
const GENERATE_TIMEOUT_MS = 21 * 60 * 1000;
const QUICK_TIMEOUT_MS = 20 * 1000;

// `args` is always an array — never a shell string. This is what keeps a
// prompt like `; rm -rf ~` an inert single argv element instead of shell text.
function runHiggsfield(args, { timeout = QUICK_TIMEOUT_MS, parseJson = true } = {}) {
    return new Promise((resolve, reject) => {
        let bin;
        try {
            bin = resolveHiggsfieldBin();
        } catch (resolveErr) {
            reject(resolveErr);
            return;
        }
        execFile(bin, args, { timeout, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                // The CLI prints a clear "Error: Not authenticated. Hint: ..."
                // to stderr/stdout on auth failure — surface it as-is rather
                // than swallowing it into a generic "command failed".
                const message = (stderr || stdout || err.message || '').toString().trim();
                const notAuthenticated = /not authenticated/i.test(message);
                reject(Object.assign(new Error(message || 'higgsfield command failed'), {
                    notAuthenticated,
                    exitCode: err.code,
                }));
                return;
            }
            if (!parseJson) {
                resolve(stdout.toString().trim());
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (parseErr) {
                reject(new Error(`Could not parse higgsfield --json output: ${parseErr.message}\nRaw: ${stdout}`));
            }
        });
    });
}

async function authStatus() {
    try {
        // `auth token` prints the raw access token as plain text even with
        // --json (there's nothing to wrap it in) — read it as a bare string
        // and treat any non-empty result as authenticated.
        const token = await runHiggsfield(buildAuthTokenArgs(), { parseJson: false });
        return { authenticated: Boolean(token) };
    } catch (err) {
        if (err.notAuthenticated) return { authenticated: false };
        // Some other failure (CLI missing, etc) — still "not authenticated"
        // from the frontend's point of view, but keep the reason for logs.
        return { authenticated: false, error: err.message };
    }
}

function listModels(type) {
    return runHiggsfield(buildModelListArgs(type));
}

function createGeneration(params) {
    return runHiggsfield(buildGenerateArgs(params), { timeout: GENERATE_TIMEOUT_MS });
}

function getGeneration(jobId) {
    return runHiggsfield(buildGenerateGetArgs(jobId));
}

module.exports = { authStatus, listModels, createGeneration, getGeneration };
