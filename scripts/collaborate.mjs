#!/usr/bin/env node
/**
 * collaborate.mjs — Single-task AI implementation
 *
 * Implements ONE specific improvement to the Glåüm Camp website.
 * Designed to be called directly or imported by orchestrate.mjs.
 *
 * CLI usage:
 *   node scripts/collaborate.mjs --task "add email notifications for messages"
 *   node scripts/collaborate.mjs --task "..." --dry-run
 *
 * Programmatic usage (from orchestrate.mjs):
 *   import { runTask } from './collaborate.mjs'
 *   const result = await runTask('add email notifications', { branchName, logFile })
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env.local') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Port cleanup ─────────────────────────────────────────────────────────────

function killDevPorts() {
  for (const port of [3000, 3001]) {
    try {
      const r = spawnSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' });
      const pids = r.stdout.trim().split('\n').filter(Boolean);
      for (const pid of pids) spawnSync('kill', ['-9', pid], { encoding: 'utf8' });
      if (pids.length) print(`  ✓ Freed port ${port}`);
    } catch {}
  }
}

// ─── Codebase context ─────────────────────────────────────────────────────────

export function buildCodebaseContext() {
  const keyFiles = [
    'docs/design-system.md',
    'docs/features.md',
    'docs/pre-prod.md',
    'docs/database.md',
    'tailwind.config.ts',
    'app/page.tsx',
    'app/profile/page.tsx',
    'app/messages/page.tsx',
    'components/HeaderClient.tsx',
    'lib/supabase.ts',
    'lib/send-email.ts',
  ];

  // Build a directory tree so GPT-4o knows what already exists
  const treeRoots = ['app', 'components', 'lib', 'public'];
  let tree = '### File tree (key directories)\n```\n';
  for (const dir of treeRoots) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    const walk = (d, prefix = '') => {
      const entries = fs.readdirSync(d, { withFileTypes: true })
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      for (const e of entries) {
        tree += `${prefix}${e.isDirectory() ? e.name + '/' : e.name}\n`;
        if (e.isDirectory() && prefix.length < 8) walk(path.join(d, e.name), prefix + '  ');
      }
    };
    tree += `${dir}/\n`;
    walk(full, '  ');
  }
  tree += '```';

  let ctx = tree;
  for (const rel of keyFiles) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8').slice(0, 5000);
      ctx += `\n\n### ${rel}\n\`\`\`\n${content}\n\`\`\``;
    }
  }
  return ctx;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file. Always read a file before editing it.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write a file. For existing files: make targeted edits, preserve everything else. Do NOT rewrite a working file from scratch unless the task explicitly requires a full rewrite.',
    input_schema: {
      type: 'object',
      properties: {
        path:    { type: 'string', description: 'Relative path from project root' },
        content: { type: 'string', description: 'Full file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a directory.',
    input_schema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Relative directory path' },
      },
      required: ['dir'],
    },
  },
  {
    name: 'generate_image',
    description: 'Generate an image with DALL-E 3 and save it under public/.',
    input_schema: {
      type: 'object',
      properties: {
        prompt:   { type: 'string', description: 'Detailed DALL-E 3 prompt' },
        filename: { type: 'string', description: 'Save path under public/, e.g. icons/schedule.png' },
        size:     { type: 'string', enum: ['1024x1024', '1792x1024', '1024x1792'] },
        style:    { type: 'string', enum: ['vivid', 'natural'] },
      },
      required: ['prompt', 'filename'],
    },
  },
  {
    name: 'shell',
    description: 'Run a safe read-only shell command (ls, cat, grep, find). No writes.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
      },
      required: ['command'],
    },
  },
  {
    name: 'require_action',
    description: 'Flag a manual step the developer must take (migration, env var, service config). Call this immediately after creating a migration file or referencing a new env var.',
    input_schema: {
      type: 'object',
      properties: {
        type:        { type: 'string', enum: ['migration', 'env_var', 'service_config', 'deploy', 'other'] },
        title:       { type: 'string', description: 'Short label, e.g. "Run migration 026_..."' },
        description: { type: 'string', description: 'Full instructions' },
        file:        { type: 'string', description: 'Relevant file path if any' },
      },
      required: ['type', 'title', 'description'],
    },
  },
  {
    name: 'done',
    description: 'Signal that the task is complete.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'What was done' },
        changes: { type: 'array', items: { type: 'string' }, description: 'List of files changed' },
        visibleChanges: {
          type: 'array',
          items: { type: 'string' },
          description: 'Changes visible in the browser — new pages (with their URL), UI updates, layout changes',
        },
        backendChanges: {
          type: 'array',
          items: { type: 'string' },
          description: 'Backend-only changes — API routes, lib files, migrations, config',
        },
      },
      required: ['summary', 'changes'],
    },
  },
];

// ─── Tool execution ───────────────────────────────────────────────────────────

function print(msg) { process.stdout.write(msg + '\n'); }

function makeExecuteTool(state) {
  return async function executeTool(name, input) {
    switch (name) {
      case 'read_file': {
        const full = path.join(ROOT, input.path);
        if (!full.startsWith(ROOT)) return 'Error: path outside project root';
        if (!fs.existsSync(full)) return `Error: file not found: ${input.path}`;
        const content = fs.readFileSync(full, 'utf8');
        return content.length > 14000 ? content.slice(0, 14000) + '\n[truncated]' : content;
      }

      case 'write_file': {
        const full = path.join(ROOT, input.path);
        if (!full.startsWith(ROOT)) return 'Error: path outside project root';
        if (state.dryRun) {
          print(`  [dry-run] Would write: ${input.path}`);
          return `[dry-run] Would write ${input.path}`;
        }
        const isNew = !fs.existsSync(full);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, input.content, 'utf8');
        print(`  ✓ ${isNew ? 'Created' : 'Updated'}: ${input.path}`);
        state.filesWritten.push(input.path);
        return `Successfully ${isNew ? 'created' : 'updated'} ${input.path}`;
      }

      case 'list_files': {
        const full = path.join(ROOT, input.dir);
        if (!full.startsWith(ROOT)) return 'Error: path outside project root';
        if (!fs.existsSync(full)) return `Error: directory not found: ${input.dir}`;
        return fs.readdirSync(full, { withFileTypes: true })
          .map(e => `${e.isDirectory() ? '[dir] ' : ''}${e.name}`)
          .join('\n');
      }

      case 'generate_image': {
        if (state.dryRun) {
          print(`  [dry-run] Would generate: ${input.filename}`);
          return `[dry-run] Would generate public/${input.filename}`;
        }
        print(`  🎨 Generating: ${input.filename}...`);
        const resp = await openai.images.generate({
          model: 'dall-e-3',
          prompt: input.prompt,
          size: input.size || '1024x1024',
          style: input.style || 'natural',
          response_format: 'url',
        });
        const imgResp = await fetch(resp.data[0].url);
        const buf = Buffer.from(await imgResp.arrayBuffer());
        const savePath = path.join(ROOT, 'public', input.filename);
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, buf);
        print(`  ✓ Saved: public/${input.filename}`);
        state.filesWritten.push(`public/${input.filename}`);
        return `Image saved to public/${input.filename}. Use src="/${input.filename}" in code.`;
      }

      case 'shell': {
        const blocked = ['rm ', 'mv ', 'cp ', 'mkdir', 'touch', 'chmod', '>', '>>', 'npm install', 'npm run'];
        if (blocked.some(b => input.command.includes(b))) {
          return 'Error: write operations blocked. Use write_file instead.';
        }
        const r = spawnSync('bash', ['-c', input.command], { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
        return (r.stdout || '') + (r.stderr ? `\nSTDERR: ${r.stderr}` : '');
      }

      case 'require_action': {
        state.requiredActions.push(input);
        const icons = { migration: '🗄', env_var: '🔑', service_config: '⚙️', deploy: '🚀', other: '📋' };
        print(`  ${icons[input.type] || '📋'} Action required: ${input.title}`);
        return `Logged: "${input.title}"`;
      }

      case 'done': {
        state.summary       = input.summary || '';
        state.changes       = input.changes || [];
        state.visibleChanges = input.visibleChanges || [];
        state.backendChanges = input.backendChanges || [];
        return '__DONE__';
      }

      default:
        return `Unknown tool: ${name}`;
    }
  };
}

// ─── Claude agent loop ────────────────────────────────────────────────────────

async function runAgentLoop(taskDescription, codebaseCtx, state) {
  const systemPrompt = `You are an expert Next.js 14 / TypeScript / Tailwind developer making a single targeted improvement to the Glåüm Camp website.

**Your task (implement ONLY this, nothing else):**
${taskDescription}

**Project conventions:**
- Stack: Next.js 14 App Router · Clerk v7 auth · Supabase · Tailwind CSS · TypeScript
- Design: ink (#1A0A24) bg · gold (#C8A848) headings · purple (#D239F8) accents · TokyoDreams display font
- Server components use supabaseAdmin directly; client components fetch /api/...
- No shared layout header — each page manages its own header row
- Inline <style> with attribute selectors → use dangerouslySetInnerHTML
- Supabase queries return PromiseLike, NOT Promise — no .catch(); use try/catch
- Supabase nested selects return arrays — handle as arrays, not single objects
- Clerk v7: import Appearance from '@clerk/types', not '@clerk/nextjs/server'
- Resend email: import from 'resend'; FROM 'Glåüm Camp <notifications@glaum.camp>'

**Critical editing rules:**
- ALWAYS read a file before writing it
- For existing files: make targeted additions or edits — preserve everything else
- Do NOT rewrite a working page from scratch; add what's needed and leave the rest intact
- Call require_action immediately after creating a migration file or adding a new env var
- In done.visibleChanges list any new pages with their URL path so the developer knows where to look
- Mentally run tsc --noEmit before calling done — no implicit any, no missing props, no bad casts`;

  const messages = [
    {
      role: 'user',
      content: `Codebase context:\n${codebaseCtx}\n\nPlease implement the task. Read any additional files you need before editing them.`,
    },
  ];

  const executeTool = makeExecuteTool(state);
  let iterations = 0;
  let iterationsSinceWrite = 0;
  const MAX_ITER = 60;
  const STUCK_THRESHOLD = 5;

  while (!state.done && iterations < MAX_ITER) {
    iterations++;

    // Stuck detection — if Claude hasn't written anything in a while, intervene
    if (iterationsSinceWrite >= STUCK_THRESHOLD) {
      print(`  ⚠ No writes in ${iterationsSinceWrite} iterations — nudging Claude to act`);
      messages.push({
        role: 'user',
        content: `You have been reading and planning for ${iterationsSinceWrite} iterations without writing any files. Stop planning and start writing. Use write_file now to make the actual changes, or call done if you genuinely cannot proceed.`,
      });
      iterationsSinceWrite = 0;
      continue;
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        print(`  Claude: ${block.text.slice(0, 200)}${block.text.length > 200 ? '…' : ''}`);
      }
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      let wroteThisRound = false;

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        print(`  → ${block.name}(${JSON.stringify(block.input).slice(0, 80)}…)`);
        const result = await executeTool(block.name, block.input);

        if (result === '__DONE__') { state.done = true; break; }
        if (block.name === 'write_file') wroteThisRound = true;

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      iterationsSinceWrite = wroteThisRound ? 0 : iterationsSinceWrite + 1;

      if (!state.done && toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      }
    } else {
      // end_turn without calling done — treat as done but flag for audit
      state.done = true;
      if (!state.summary) {
        state.summary = response.content.find(b => b.type === 'text')?.text || 'Done.';
      }
    }
  }

  return { messages, systemPrompt };
}

// ─── Completion audit ─────────────────────────────────────────────────────────

async function runCompletionAudit(taskDescription, messages, systemPrompt, state) {
  if (state.dryRun) { print('  [dry-run] Skipping completion audit'); return; }

  const MAX_AUDIT_ROUNDS = 3;

  for (let round = 1; round <= MAX_AUDIT_ROUNDS; round++) {
    print(`\n  🔎 Completion audit (round ${round})...`);

    // Build a snapshot of the files that were written
    const fileSnapshots = state.filesWritten.map(rel => {
      const full = path.join(ROOT, rel);
      if (!fs.existsSync(full)) return `${rel}: (file not found)`;
      const content = fs.readFileSync(full, 'utf8');
      return `### ${rel}\n\`\`\`\n${content.slice(0, 6000)}${content.length > 6000 ? '\n[truncated]' : ''}\n\`\`\``;
    }).join('\n\n');

    const noWrites = state.filesWritten.length === 0;

    const auditPrompt = noWrites
      ? `The task was: "${taskDescription}"\n\nYou called done without writing any files. Please verify by reading the relevant files now — is this feature already fully implemented and working? If yes, call done with a summary explaining that it was already complete. If something is missing, make the changes now. Do NOT add extra changes just because you wrote nothing — only act if something is genuinely missing.`
      : `The task was: "${taskDescription}"\n\nYou wrote ${state.filesWritten.length} file(s). Here is their current content:\n\n${fileSnapshots}\n\nVerify the task is fully complete:\n- Are all required changes present in the files above?\n- Are there any files you intended to edit but didn't?\n- Is anything half-finished?\n\nIf the task is complete, call done. If not, make the remaining changes now.`;

    messages.push({ role: 'user', content: auditPrompt });

    const executeTool = makeExecuteTool(state);
    let auditDone = false;
    let auditIter = 0;

    while (!auditDone && auditIter < 15) {
      auditIter++;

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 8096,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });

      messages.push({ role: 'assistant', content: response.content });

      for (const block of response.content) {
        if (block.type === 'text' && block.text.trim()) {
          print(`  Claude: ${block.text.slice(0, 200)}${block.text.length > 200 ? '…' : ''}`);
        }
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          print(`  → ${block.name}(${JSON.stringify(block.input).slice(0, 80)}…)`);
          const result = await executeTool(block.name, block.input);

          if (result === '__DONE__') { auditDone = true; break; }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        }

        if (!auditDone && toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults });
        }
      } else {
        auditDone = true;
        if (!state.summary) {
          state.summary = response.content.find(b => b.type === 'text')?.text || 'Done.';
        }
      }
    }

    // If Claude wrote new files in this audit round, loop for another check
    // Otherwise we're satisfied
    const wroteInAudit = state.filesWritten.length > (noWrites ? 0 : state.filesWritten.length);
    if (!wroteInAudit) {
      print(`  ✓ Completion audit passed`);
      return;
    }
  }
}

// ─── TypeScript validation + self-healing ─────────────────────────────────────

async function runValidation(messages, systemPrompt, state) {
  if (state.dryRun) { print('  [dry-run] Skipping TypeScript check'); return true; }

  const MAX_ROUNDS = 3;

  for (let round = 1; round <= MAX_ROUNDS + 1; round++) {
    const r = spawnSync('npx', ['tsc', '--noEmit'], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    const errors = (r.stdout + r.stderr).trim();

    if (!errors) {
      print(`  ✓ TypeScript clean${round > 1 ? ' after repair' : ''}`);
      return true;
    }

    if (round > MAX_ROUNDS) {
      print(`  ⚠ TypeScript still has errors after ${MAX_ROUNDS} repair rounds — commit manually after review`);
      return false;
    }

    const errorLines = errors.split('\n').filter(l => l.includes('error TS')).slice(0, 30);
    print(`  ✗ ${errorLines.length} error(s) — repair round ${round}...`);

    messages.push({
      role: 'user',
      content: `TypeScript errors — please fix them. Read affected files first, then write corrected versions. Call done when fixed.\n\n\`\`\`\n${errorLines.join('\n')}\n\`\`\``,
    });

    const executeTool = makeExecuteTool(state);
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });
    const toolResults = [];

    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        print(`  Claude: ${block.text.slice(0, 200)}${block.text.length > 200 ? '…' : ''}`);
      }
      if (block.type !== 'tool_use') continue;
      print(`  → ${block.name}(${JSON.stringify(block.input).slice(0, 80)}…)`);
      const result = await executeTool(block.name, block.input);
      if (result === '__DONE__') break;
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: String(result) });
    }

    if (toolResults.length > 0) messages.push({ role: 'user', content: toolResults });
  }

  return false;
}

// ─── Migration auto-detection ─────────────────────────────────────────────────

function detectNewMigrations(filesWritten) {
  return filesWritten
    .filter(f => f.startsWith('supabase-migrations/') && f.endsWith('.sql'))
    .map(f => ({
      type: 'migration',
      title: `Run migration: ${path.basename(f)}`,
      description: `Apply via Supabase SQL Editor → paste contents of ${f} → Run.`,
      file: f,
    }));
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function runTask(taskDescription, {
  dryRun      = false,
  branchName  = null,
  codebaseCtx = null,
  logFile     = null,
  quiet       = false,
} = {}) {
  if (!quiet) {
    print(`\n  📌 Task: ${taskDescription}`);
  }

  const state = {
    dryRun,
    done:           false,
    summary:        '',
    changes:        [],
    visibleChanges: [],
    backendChanges: [],
    filesWritten:   [],
    requiredActions: [],
  };

  // Build context if not provided
  const ctx = codebaseCtx ?? buildCodebaseContext();

  // Run the agent
  const { messages, systemPrompt } = await runAgentLoop(taskDescription, ctx, state);

  // Verify the task is actually complete — catches "planned but didn't execute"
  await runCompletionAudit(taskDescription, messages, systemPrompt, state);

  // Auto-detect migrations that weren't flagged via require_action
  const autoMigrations = detectNewMigrations(state.filesWritten)
    .filter(m => !state.requiredActions.some(a => a.file === m.file));
  state.requiredActions.push(...autoMigrations);

  // TypeScript validation
  if (state.filesWritten.length > 0) {
    print('\n  🔍 Validating TypeScript...');
    const valid = await runValidation(messages, systemPrompt, state);
    state.tsClean = valid;
  } else {
    state.tsClean = true;
  }

  // Commit
  if (!dryRun && state.filesWritten.length > 0) {
    try {
      if (branchName) {
        // Ensure we're on the right branch
        execSync(`git -C "${ROOT}" checkout "${branchName}" 2>/dev/null || git -C "${ROOT}" checkout -b "${branchName}"`, { stdio: 'pipe' });
      }
      execSync(`git -C "${ROOT}" add -A`, { stdio: 'pipe' });
      const shortTask = taskDescription.slice(0, 72);
      execSync(`git -C "${ROOT}" commit -m "${shortTask.replace(/"/g, "'")}"`, { stdio: 'pipe' });
      if (!quiet) print(`  ✓ Committed: "${shortTask}"`);
    } catch (e) {
      if (!quiet) print(`  ⚠ Git commit failed: ${e.message}`);
    }
  }

  // Write log entry if a logFile is specified
  if (logFile) {
    const entry = [
      `## Task: ${taskDescription}`,
      '',
      `**Summary:** ${state.summary}`,
      '',
      state.filesWritten.length ? `**Files changed:**\n${state.filesWritten.map(f => `- ${f}`).join('\n')}` : '',
      state.visibleChanges.length ? `\n**Visible changes:**\n${state.visibleChanges.map(c => `- ${c}`).join('\n')}` : '',
      state.backendChanges.length ? `\n**Backend changes:**\n${state.backendChanges.map(c => `- ${c}`).join('\n')}` : '',
      state.requiredActions.length ? `\n**Actions required:**\n${state.requiredActions.map(a => `- ${a.title}`).join('\n')}` : '',
      '',
      '---',
      '',
    ].filter(l => l !== null).join('\n');

    fs.appendFileSync(logFile, entry);
  }

  return {
    task:           taskDescription,
    success:        state.tsClean,
    summary:        state.summary,
    filesWritten:   state.filesWritten,
    visibleChanges: state.visibleChanges,
    backendChanges: state.backendChanges,
    requiredActions: state.requiredActions,
  };
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const isCLI = process.argv[1] === fileURLToPath(import.meta.url);

if (isCLI) {
  const args    = process.argv.slice(2);
  const taskIdx = args.indexOf('--task');
  const task    = taskIdx !== -1 ? args[taskIdx + 1] : null;
  const dryRun  = args.includes('--dry-run');

  if (!task) {
    console.error('Usage: node scripts/collaborate.mjs --task "description" [--dry-run]');
    console.error('       For a full multi-task pass, use: node scripts/orchestrate.mjs');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) { console.error('✗ ANTHROPIC_API_KEY missing from .env.local'); process.exit(1); }
  if (!process.env.OPENAI_API_KEY)    { console.error('✗ OPENAI_API_KEY missing from .env.local');    process.exit(1); }

  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const branchName = `ai-collab-${timestamp}`;
  const logDir     = path.join(ROOT, 'scripts', 'logs');
  const logFile    = path.join(logDir, `collab-${timestamp}.md`);
  fs.mkdirSync(logDir, { recursive: true });

  print('');
  print('╔══════════════════════════════════════════╗');
  print('║  Glåüm Camp — AI Collaboration (single)  ║');
  print('╚══════════════════════════════════════════╝');
  print(`Task:   ${task}`);
  print(`Branch: ${branchName}`);
  print(`Log:    ${logFile}`);
  if (dryRun) print('Mode:   DRY RUN');
  print('');

  if (!dryRun) {
    try {
      execSync(`git -C "${ROOT}" checkout -b "${branchName}"`, { stdio: 'pipe' });
      print(`✓ Created branch: ${branchName}`);
    } catch (e) {
      print(`⚠ Branch creation failed: ${e.message}`);
    }
  }

  const result = await runTask(task, { dryRun, branchName, logFile }).catch(e => {
    print(`\n✗ Fatal: ${e.message}`);
    process.exit(1);
  });

  killDevPorts();

  print('\n══════════════════════════════════════════');
  print(result.success ? '✓ Complete' : '⚠ Complete with TypeScript warnings');
  print(`📄 Log: ${logFile}`);
  print('');

  if (result.visibleChanges?.length) {
    print('👁  Visible changes (check in browser):');
    result.visibleChanges.forEach(c => print(`   • ${c}`));
    print('');
  }
  if (result.backendChanges?.length) {
    print('⚙  Backend changes:');
    result.backendChanges.forEach(c => print(`   • ${c}`));
    print('');
  }

  if (result.requiredActions?.length) {
    print('╔══════════════════════════════════════════╗');
    print('║   ⚠  ACTION REQUIRED BEFORE DEPLOYING  ║');
    print('╚══════════════════════════════════════════╝');
    const icons = { migration: '🗄', env_var: '🔑', service_config: '⚙️', deploy: '🚀', other: '📋' };
    result.requiredActions.forEach((a, i) => {
      print(`\n${i + 1}. ${icons[a.type] || '📋'}  ${a.title}`);
      print(`   ${a.description}`);
      if (a.file) print(`   File: ${a.file}`);
    });
    print('');
  }

  print(`To review: git diff main..${branchName}`);
  print(`To apply:  git checkout main && git merge ${branchName}`);
  print(`To discard: git branch -D ${branchName}`);
}
