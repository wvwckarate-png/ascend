// Stand-in for the `students` table so the PIN routes can be tested without the real database.
//   node e2e/fake-supabase.js   (listens on :4010; Matthew's PIN is 4321, the others have none; Michael has saved the green theme)
const http = require('http');
const rows = { matthew: { id: 'matthew', pin: '4321' }, michael: { id: 'michael', pin: null, theme: 'green' }, brynne: { id: 'brynne', pin: null } };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let body = '';
  req.on('data', c => body += c); req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
    if (!u.pathname.endsWith('/rest/v1/students')) return send(404, { message: 'nope' });
    const idEq = (u.searchParams.get('id') || '').replace('eq.', '');
    const single = (req.headers.accept || '').includes('pgrst.object');
    if (req.method === 'GET') { const list = idEq ? [rows[idEq]].filter(Boolean) : Object.values(rows); return single ? (list[0] ? send(200, list[0]) : send(406, { message: 'no rows' })) : send(200, list); }
    if (req.method === 'PATCH') { if (rows[idEq]) Object.assign(rows[idEq], JSON.parse(body)); return send(204); }
    send(405, {});
  });
}).listen(4010, () => console.log('fake supabase on 4010'));
