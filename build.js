// Baut die Seite: kopiert site/ nach dist/ und füllt die Platzhalter.
// Gigs kommen aus einem Google-Kalender (ICS-URL in der Umgebungsvariable ICS_URL).
// Schlägt der Abruf fehl, bricht der Build ab -> die zuletzt veröffentlichte Seite bleibt online.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'site');
const OUT = path.join(__dirname, 'dist');
const TZ = 'Europe/Berlin';
const MAX_GIGS = 30;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unescapeText = s => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

function parseICS(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let cur = null, inAlarm = false;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; inAlarm = false; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (line === 'BEGIN:VALARM') { inAlarm = true; continue; }
    if (line === 'END:VALARM') { inAlarm = false; continue; }
    if (inAlarm) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const name = line.slice(0, i).split(';')[0].toUpperCase();
    cur[name] = line.slice(i + 1);
  }
  return events;
}

function berlinParts(date) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const g = t => +p.find(x => x.type === t).value;
  return { y: g('year'), m: g('month'), d: g('day'), hh: g('hour'), mm: g('minute') };
}

function parseDT(v) {
  if (!v) return null;
  let m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3], allDay: true };
  m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  if (m[7]) return { ...berlinParts(new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]))), allDay: false };
  return { y: +m[1], m: +m[2], d: +m[3], hh: +m[4], mm: +m[5], allDay: false };
}

const dayKey = t => t.y * 10000 + t.m * 100 + t.d;
const sortKey = t => dayKey(t) * 10000 + (t.allDay ? 0 : t.hh * 100 + t.mm);

function shortPlace(loc) {
  if (!loc) return '';
  const parts = unescapeText(loc).split(',').map(s => s.trim()).filter(Boolean);
  const cityPart = parts.find(p => /^\d{5}\s/.test(p));
  const city = cityPart ? cityPart.replace(/^\d{5}\s+/, '') : '';
  return [parts[0], city].filter(Boolean).join(', ');
}

function findLink(ev) {
  const raw = [ev.URL, ev.DESCRIPTION].filter(Boolean).map(unescapeText).join(' ');
  const m = raw.match(/https?:\/\/[^\s<>"')\\]+/);
  return m ? m[0] : '';
}

function renderGigs(icsText) {
  const today = dayKey(berlinParts(new Date()));
  const gigs = parseICS(icsText)
    .filter(ev => ev.STATUS !== 'CANCELLED')
    .map(ev => ({ ev, t: parseDT(ev.DTSTART) }))
    .filter(x => x.t && dayKey(x.t) >= today)
    .sort((a, b) => sortKey(a.t) - sortKey(b.t))
    .slice(0, MAX_GIGS);

  if (!gigs.length) {
    return '<p class="empty">Gerade ist kein Termin geplant. Neue Gigs erscheinen hier automatisch.</p>';
  }
  const items = gigs.map(({ ev, t }) => {
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d));
    const wd = date.toLocaleDateString('de-DE', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
    const mon = date.toLocaleDateString('de-DE', { month: 'short', timeZone: 'UTC' }).replace('.', '');
    const when = t.allDay ? wd : `${wd}, ${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')} Uhr`;
    const iso = `${t.y}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
    const title = esc(unescapeText(ev.SUMMARY || 'Konzert'));
    const place = esc(shortPlace(ev.LOCATION));
    const link = findLink(ev);
    return `<li class="gig">
  <time datetime="${iso}"><span class="d">${t.d}</span><span class="m">${esc(mon)}</span></time>
  <div><strong>${title}</strong><span class="meta">${esc(when)}</span>${place ? `<span class="meta">${place}</span>` : ''}</div>
  ${link ? `<a href="${esc(link)}" rel="noopener">Infos</a>` : ''}
</li>`;
  });
  return `<ul class="gigs">\n${items.join('\n')}\n</ul>`;
}

function renderMusik(cfg) {
  const labels = { youtube: 'YouTube', spotify: 'Spotify', bandcamp: 'Bandcamp', instagram: 'Instagram' };
  const items = Object.entries(labels)
    .filter(([k]) => cfg[k])
    .map(([k, label]) => `<li><a href="${esc(cfg[k])}" rel="noopener">${label}</a></li>`);
  if (!items.length) return '<p class="empty">Die ersten Aufnahmen sind in Arbeit.</p>';
  return `<ul class="links">${items.join('')}</ul>`;
}

function renderDownloads() {
  const files = [['Techrider.pdf', 'Techrider'], ['Stageplot.pdf', 'Stageplot']]
    .filter(([f]) => fs.existsSync(path.join(SRC, 'downloads', f)));
  if (!files.length) return '';
  return `<ul class="links">${files.map(([f, l]) => `<li><a href="downloads/${f}">${l} (PDF)</a></li>`).join('')}</ul>`;
}

async function loadICS() {
  if (process.env.ICS_FILE) return fs.readFileSync(process.env.ICS_FILE, 'utf8');
  const url = process.env.ICS_URL;
  if (!url) { console.warn('ICS_URL fehlt: Gig-Liste bleibt leer.'); return ''; }
  const r = await fetch(url.replace(/^webcal:/, 'https:'));
  if (!r.ok) throw new Error('Kalender nicht abrufbar: HTTP ' + r.status);
  return r.text();
}

(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'config.json'), 'utf8'));
  const ics = await loadICS();
  const gigsHtml = ics ? renderGigs(ics) : '<p class="empty">Gerade ist kein Termin geplant. Neue Gigs erscheinen hier automatisch.</p>';

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync(SRC, OUT, { recursive: true });
  fs.rmSync(path.join(OUT, 'config.json'));

  const repl = {
    '<!--GIGS-->': gigsHtml,
    '<!--MUSIK-->': renderMusik(cfg),
    '<!--DOWNLOADS-->': renderDownloads(),
    '{{HOSTER}}': process.env.HOSTER || 'dem Hosting-Anbieter',
    '{{YEAR}}': String(new Date().getFullYear())
  };
  for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.html'))) {
    let html = fs.readFileSync(path.join(OUT, f), 'utf8');
    for (const [k, v] of Object.entries(repl)) html = html.split(k).join(v);
    fs.writeFileSync(path.join(OUT, f), html);
  }
  console.log('Fertig: dist/ gebaut.');
})().catch(e => { console.error(e.message); process.exit(1); });
