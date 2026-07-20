// Local helper server for ScenePrompter's "Send to Generator" action.
//
// This is NOT a multi-tenant API gateway — it's a thin bridge that shells out
// to the `higgsfield` CLI, which already handles its own OAuth (PKCE, run via
// `higgsfield auth login` in a terminal) and holds its own local token. We
// never see, store, or forward any credential ourselves. Run this on the same
// machine as an already-authenticated CLI.
const express = require('express');
const cors = require('cors');
const { authStatus, listModels, getModel, createGeneration, getGeneration } = require('./higgsfieldClient');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/api/auth/status', async (req, res) => {
    res.json(await authStatus());
});

app.get('/api/models', async (req, res) => {
    try {
        const type = typeof req.query.type === 'string' ? req.query.type : undefined;
        res.json(await listModels(type));
    } catch (err) {
        res.status(err.notAuthenticated ? 401 : 502).json({ error: err.message });
    }
});

// Each model has its own parameter schema — the frontend fetches it from
// GET /api/models/:jobType first and renders a form from it, so `params`
// here is whatever that form collected (e.g. {aspect_ratio: "16:9"} for
// veo3, {clip_aspect: "9:16"} for clipify). No fixed shape.
app.get('/api/models/:jobType', async (req, res) => {
    try {
        res.json(await getModel(req.params.jobType));
    } catch (err) {
        res.status(err.notAuthenticated ? 401 : 502).json({ error: err.message });
    }
});

app.post('/api/generate', async (req, res) => {
    try {
        const { jobType, prompt, params } = req.body || {};
        const result = await createGeneration({ jobType, prompt, params, wait: true });
        res.json(result);
    } catch (err) {
        if (/jobType is required|prompt is required/.test(err.message)) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(err.notAuthenticated ? 401 : 502).json({ error: err.message });
    }
});

app.get('/api/generate/:jobId', async (req, res) => {
    try {
        res.json(await getGeneration(req.params.jobId));
    } catch (err) {
        res.status(err.notAuthenticated ? 401 : 502).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`ScenePrompter backend listening on http://localhost:${PORT}`);
    console.log('Checking Higgsfield auth status...');
    authStatus().then(s => {
        if (s.authenticated) console.log('  ✓ authenticated');
        else console.log('  ✗ not authenticated — run `higgsfield auth login` in a terminal first');
    });
});
