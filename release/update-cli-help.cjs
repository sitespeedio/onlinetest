#!/usr/bin/env node
/* eslint-disable */
/*
 * Regenerate server/public/sitespeed-help.json from `sitespeed.io --help`.
 *
 * This file powers the searchable CLI option picker in the start page's
 * "command line" tab. It must be regenerated whenever a new sitespeed.io
 * version ships, so the picker stays in sync with the actual CLI.
 *
 * Usage:
 *   node release/update-cli-help.cjs <path-to-help-text>   # parse a captured file
 *   sitespeed.io --help | node release/update-cli-help.cjs -   # read from stdin
 *   node release/update-cli-help.cjs                       # auto: `npx --yes sitespeed.io --help`
 *
 * Exit code 0 on success. Logs the number of options written and the
 * destination path so it's easy to verify in CI.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT = path.join(REPO_ROOT, 'server', 'public', 'sitespeed-help.json');

function readStdinSync() {
  // Synchronous read of all of stdin. Works on Node ≥ 12.
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

function captureHelpViaNpx() {
  console.error('No input given — running `npx --yes sitespeed.io --help` …');
  return execFileSync('npx', ['--yes', 'sitespeed.io', '--help'], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
}

function getInput() {
  const arg = process.argv[2];
  if (!arg) return captureHelpViaNpx();
  if (arg === '-') return readStdinSync();
  return fs.readFileSync(arg, 'utf8');
}

function parse(text) {
  const lines = text.split('\n');
  const opts = [];
  let section = '';
  for (const raw of lines) {
    if (!raw.trim()) continue;
    // Section header: starts at column 0 and isn't the usage banner / footer
    if (!raw.startsWith(' ')) {
      if (raw.startsWith('sitespeed.io ') || raw.startsWith('Read the docs')) continue;
      section = raw.trim();
      continue;
    }
    // Option line: leading spaces, flag(s), 2+ spaces, description
    const m = raw.match(/^\s+([^\s].*?)\s{2,}(.*)$/);
    if (!m) continue;
    const [, flagsRaw, descRaw] = m;
    if (!flagsRaw.startsWith('-')) continue; // skip continuation lines
    const flags = flagsRaw.split(/,\s+/).map((s) => s.trim()).filter(Boolean);
    const primary = flags.find((f) => f.startsWith('--')) || flags[0];
    const tags = [];
    const desc = descRaw
      .replace(/\s*\[([^\]]+)\]/g, (_, t) => {
        tags.push(t);
        return '';
      })
      .trim();
    opts.push({ section, flags, primary, desc, tags });
  }
  return opts;
}

function main() {
  const text = getInput();
  if (!text || !text.trim()) {
    console.error('Empty input — no help text to parse.');
    process.exit(1);
  }
  const opts = parse(text);
  if (opts.length === 0) {
    console.error('Parsed 0 options — the input does not look like sitespeed.io --help output.');
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(opts));
  const bytes = fs.statSync(OUT).size;
  console.log(`✓ wrote ${opts.length} options to ${path.relative(REPO_ROOT, OUT)} (${bytes} B)`);
}

main();
