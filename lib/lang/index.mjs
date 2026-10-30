import tr from './tr.mjs';
import en from './en.mjs';

const packs = { tr, en };

export function languagePack(locale = 'tr') {
  return packs[locale === 'en' ? 'en' : 'tr'];
}

export function registerDefinition(style, locale = 'tr') {
  const pack = languagePack(locale);
  return pack.registers[style] || pack.registers.natural;
}

export function availableStyles(locale = 'tr') {
  return Object.entries(languagePack(locale).registers).map(([id, definition]) => ({ id, label: definition.label }));
}

export function authorities(locale = 'tr') {
  return languagePack(locale).authorities;
}

export function packSummary() {
  return Object.values(packs).map(pack => ({
    locale: pack.locale,
    name: pack.name,
    version: pack.version,
    rules: pack.rules.length,
    patterns: pack.rules.reduce((total, rule) => total + rule.patterns.length, 0),
    aiMarkers: pack.aiMarkers.length,
    registers: Object.keys(pack.registers),
    authorities: pack.authorities.map(item => ({ id: item.id, title: item.title, issuer: item.issuer, published: item.published, url: item.url }))
  }));
}
