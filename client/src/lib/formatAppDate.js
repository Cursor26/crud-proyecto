export const DATE_FORMAT_OPTIONS = {
  dmy: { id: 'dmy', label: 'DD/MM/AAAA', example: '28/05/2026' },
  ymd: { id: 'ymd', label: 'AAAA-MM-DD', example: '2026-05-28' },
};

export const TIME_FORMAT_OPTIONS = {
  '24': { id: '24', label: '24 horas', example: '18:30:45' },
  '12': { id: '12', label: '12 horas (AM/PM)', example: '6:30:45 p. m.' },
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseInput(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatAppDate(value, formatId = 'dmy') {
  const d = parseInput(value);
  if (!d) return '';
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();
  if (formatId === 'ymd') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

export function formatAppTime(value, formatId = '24', locale = 'es-ES') {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const opts = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: formatId === '12',
  };
  return d.toLocaleTimeString(locale, opts);
}
