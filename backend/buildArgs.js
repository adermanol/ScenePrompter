// Pure function: turns a generate request body into a `higgsfield` CLI argv
// array. Kept separate from server.js so it's testable with zero mocking —
// no child_process, no network, just input in, array out.
//
// IMPORTANT: this returns an ARRAY, never a shell string. server.js must pass
// it to child_process.execFile (or spawn), never exec/a template string — the
// prompt is free user text, and execFile with an argv array is what keeps a
// value like `; rm -rf ~` inert instead of shell-interpreted.
function buildGenerateArgs({ jobType, prompt, negative, aspectRatio, wait = true } = {}) {
    if (!jobType || typeof jobType !== 'string') {
        throw new Error('jobType is required');
    }
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('prompt is required');
    }

    const args = ['generate', 'create', jobType, '--prompt', prompt, '--json'];

    if (negative) args.push('--negative-prompt', negative);
    if (aspectRatio) args.push('--aspect-ratio', aspectRatio);

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

function buildGenerateGetArgs(jobId) {
    if (!jobId || typeof jobId !== 'string') {
        throw new Error('jobId is required');
    }
    return ['generate', 'get', jobId, '--json'];
}

function buildAuthTokenArgs() {
    return ['auth', 'token', '--json'];
}

module.exports = { buildGenerateArgs, buildModelListArgs, buildGenerateGetArgs, buildAuthTokenArgs };
