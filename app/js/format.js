// plural(5, ['отклик', 'отклика', 'откликов']) -> 'откликов'
export function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function countLabel(n, forms) {
  return `${n} ${plural(n, forms)}`;
}

export function formatPercent(value) {
  return value === null ? '—' : `${value}%`;
}

// Для поиска: без учёта регистра и разницы между «е» и «ё».
export function normalizeSearch(text) {
  return String(text).toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
}
