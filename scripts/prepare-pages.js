import { cpSync, rmSync } from 'node:fs';
rmSync('assets', { recursive: true, force: true });
cpSync('dist/assets', 'assets', { recursive: true });
cpSync('dist/index.html', 'index.html');
