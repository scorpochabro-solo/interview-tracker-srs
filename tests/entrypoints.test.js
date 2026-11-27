import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = new URL('../app/', import.meta.url);

test('стартовая страница подключает JavaScript и существующие файлы стилей', () => {
  const html = readFileSync(new URL('index.html', appRoot), 'utf8');
  assert.match(html, /<script type="module" src="js\/main\.js">/);
  const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
  assert.ok(stylesheets.length > 0, 'Ожидалась хотя бы одна таблица стилей');

  for (const path of ['js/main.js', ...stylesheets.map(([, href]) => href)]) {
    assert.ok(statSync(new URL(path, appRoot)).isFile(), `Не найден файл приложения: ${path}`);
  }
});

test('все модули приложения разбираются Node.js без синтаксических ошибок', () => {
  const scripts = readdirSync(new URL('js/', appRoot), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'));
  assert.ok(scripts.length > 0);

  for (const script of scripts) {
    const path = join(script.parentPath, script.name);
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' }), path);
  }
});
