import test from 'node:test';
import assert from 'node:assert/strict';

// Simula a API do Google Drive para garantir que leitura e gravação usam os endpoints corretos.
test('Google Drive: grava e lê o mesmo documento', async () => {
  Object.assign(process.env, {DATA_BACKEND:'google-drive',GOOGLE_DRIVE_FOLDER_ID:'pasta123',GOOGLE_OAUTH_CLIENT_ID:'id',GOOGLE_OAUTH_CLIENT_SECRET:'secret',GOOGLE_OAUTH_REFRESH_TOKEN:'refresh'});
  const files = new Map(); let next = 1; const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, opt = {}) => {
    const url = new URL(String(input)), method = opt.method || 'GET';
    calls.push(`${method} ${url.pathname}`);
    const json = (b, status = 200) => new Response(JSON.stringify(b), {status, headers:{'Content-Type':'application/json'}});
    if (url.host === 'oauth2.googleapis.com') return json({access_token:'tok', expires_in:3600});
    assert.equal(opt.headers?.Authorization, 'Bearer tok');
    if (url.pathname === '/drive/v3/files' && method === 'GET') {
      const name = /name = '([^']+)'/.exec(url.searchParams.get('q'))[1];
      return json({files:[...files].filter(([, f]) => f.name === name).map(([id, f]) => ({id, name:f.name}))});
    }
    if (url.pathname === '/drive/v3/files' && method === 'POST') {
      const id = 'f' + next++; files.set(id, {name:JSON.parse(opt.body).name, body:''}); return json({id});
    }
    let m = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (m && method === 'PATCH') { files.get(m[1]).body = opt.body; return json({id:m[1]}); }
    m = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (m && method === 'GET' && url.searchParams.get('alt') === 'media') return new Response(files.get(m[1]).body, {status:200});
    return json({error:'rota inesperada '+method+' '+url.pathname}, 404);
  };
  try {
    const {readDoc, writeDoc} = await import('../lib/storage.js?drive');
    assert.deepEqual(await readDoc('users.json', {version:2, users:{}}), {version:2, users:{}});
    await writeDoc('users.json', {version:2, users:{admin:{username:'admin'}}});
    assert.deepEqual(await readDoc('users.json', null), {version:2, users:{admin:{username:'admin'}}});
    await writeDoc('users.json', {version:2, users:{}});
    assert.equal(files.size, 1, 'regravar não deve criar arquivo duplicado');
    assert.ok(calls.includes('GET /drive/v3/files/f1'), 'leitura deve usar o endpoint do arquivo');
  } finally {
    globalThis.fetch = realFetch;
    for (const k of ['DATA_BACKEND','GOOGLE_DRIVE_FOLDER_ID','GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET','GOOGLE_OAUTH_REFRESH_TOKEN']) delete process.env[k];
  }
});
