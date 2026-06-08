const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const xml = fs.readFileSync('guide.xml', 'utf8');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['channel', 'programme', 'display-name', 'title', 'desc'].includes(name),
});

const parsed = parser.parse(xml);
const tv = parsed.tv;

const channels = (tv.channel || []).map((ch) => {
  const names = ch['display-name'] || [];
  const name = names.find(n => typeof n === 'object' ? n['#text'] : n);
  const nameStr = typeof name === 'object' ? name['#text'] : (name ?? '');
  return {
    xmltv_id: ch['@_id'],
    name: nameStr,
    site: 'zuragt.mn',
    lang: names[0]?.['@_lang'] ?? 'mn',
    logo: null,
    url: null,
  };
});

function parseXmltvTime(str) {
  const match = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})$/);
  if (!match) return null;
  const [, yr, mo, dy, hr, mn, sc, tz] = match;
  const tzH = parseInt(tz.slice(0, 3), 10);
  const tzM = parseInt(tz[0] + tz.slice(3), 10);
  return Date.UTC(+yr, +mo - 1, +dy, +hr - tzH, +mn - tzM, +sc);
}

const programs = (tv.programme || []).map((prog) => {
  const start = parseXmltvTime(prog['@_start']);
  const stop = parseXmltvTime(prog['@_stop']);
  if (start === null || stop === null) return null;
  const titles = (prog.title || []).map(t => ({
    value: typeof t === 'object' ? (t['#text'] ?? '') : String(t),
    lang: typeof t === 'object' ? (t['@_lang'] ?? 'mn') : 'mn',
  })).filter(t => t.value);
  const descriptions = (prog.desc || []).map(d => ({
    value: typeof d === 'object' ? (d['#text'] ?? '') : String(d),
    lang: typeof d === 'object' ? (d['@_lang'] ?? 'mn') : 'mn',
  })).filter(d => d.value);
  return { channel: prog['@_channel'], start, stop, titles, descriptions };
}).filter(Boolean);

fs.writeFileSync('guide.json', JSON.stringify({ date: new Date().toISOString().slice(0,10).replace(/-/g,''), channels, programs }));
console.log('Done. channels:', channels.length, 'programs:', programs.length);