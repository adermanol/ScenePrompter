// Pure function: turns a generate request body into a `higgsfield` CLI argv
// array. Kept separate from server.js so it's testable with zero mocking —
// no child_process, no network, just input in, array out.
//
// IMPORTANT: this returns an ARRAY, never a shell string. server.js must pass
// it to child_process.execFile (or spawn), never exec/a template string — the
// prompt is free user text, and execFile with an argv array is what keeps a
// value like `; rm -rf ~` inert instead of shell-interpreted.
// Every Higgsfield model has its own parameter schema (`higgsfield model get
// <job_type> --json`) — field names and enums differ per model (e.g. veo3's
// "aspect_ratio" vs clipify's "clip_aspect"; no model we inspected has a
// universal "negative_prompt"). So there is no fixed set of generation flags:
// `params` is whatever the caller (server.js, driven by the frontend's
// schema-rendered form) collected for THIS model, passed through as
// `--<param_name> <value>` pairs using the exact names the CLI itself reports.
const PARAM_NAME_RE = /^[a-zA-Z0-9_]+$/;

function buildGenerateArgs({ jobType, prompt, params = {}, wait = true } = {}) {
    if (!jobType || typeof jobType !== 'string') {
        throw new Error('jobType is required');
    }
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('prompt is required');
    }

    const args = ['generate', 'create', jobType, '--prompt', prompt];

    for (const [name, value] of Object.entries(params || {})) {
        if (value === undefined || value === null || value === '') continue;
        if (!PARAM_NAME_RE.test(name)) {
            throw new Error(`Invalid param name: ${name}`);
        }
        args.push(`--${name}`, String(value));
    }

    args.push('--json');

    if (wait) {
        args.push('--wait', '--wait-timeout', '20m', '--wait-interval', '5s');
    }

    return args;
}

function buildModelListArgs(type) {
    const args = ['model', 'list', '--json'];
    if (type === 'video' || type === 'image' || type === 'audio' || type === 'text') {
        args.push(`--${type}`);
    }
    return args;
}

function buildModelGetArgs(jobType) {
    if (!jobType || typeof jobType !== 'string') {
        throw new Error('jobType is required');
    }
    return ['model', 'get', jobType, '--json'];
}

function buildGenerateGetArgs(jobId) {
    if (!jobId || typeof jobId !== 'string') {
        throw new Error('jobId is required');
    }
    return ['generate', 'get', jobId, '--json'];
}

function buildAuthTokenArgs() {
    return ['auth', 'token', '--json'];
}

module.exports = {
    buildGenerateArgs,
    buildModelListArgs,
    buildModelGetArgs,
    buildGenerateGetArgs,
    buildAuthTokenArgs,
};
