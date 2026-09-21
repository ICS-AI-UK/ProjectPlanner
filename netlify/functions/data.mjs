import { getStore } from '@netlify/blobs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Netlify's filesystem is read-only, so the plan lives in a Netlify Blobs store
// rather than in data/projects.json the way the local Express server keeps it.
// Both ends speak the same /api/data contract, so the front end is unchanged.
const STORE = 'project-planner';
const KEY   = 'state';

// A newly deployed site has an empty store, so fall back to the plan committed
// to the repo. netlify.toml's included_files keeps that file in the bundle.
function seedState() {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'data', 'projects.json'), 'utf8'));
  } catch {
    return { projects: [], todos: [], bankHolidays: [] };
  }
}

export default async (req) => {
  const store = getStore(STORE);

  if (req.method === 'GET') {
    // Strong consistency: the client reloads straight after saving, and the
    // default eventual read can still hand back the previous version.
    const saved = await store.get(KEY, { type: 'json', consistency: 'strong' });
    return Response.json(saved ?? seedState());
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Every save replaces the whole document, so reject anything of the wrong
    // shape instead of letting a malformed request blank out the stored plan.
    if (!body || typeof body !== 'object' || !Array.isArray(body.projects)) {
      return Response.json({ error: 'Expected an object with a projects array' }, { status: 400 });
    }

    await store.setJSON(KEY, body);
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'GET, POST' },
  });
};

export const config = { path: '/api/data' };
