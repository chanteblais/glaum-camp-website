#!/usr/bin/env node
/**
 * orchestrate.mjs — Multi-task AI orchestration
 *
 * GPT-4o plans a prioritized list of improvements, then collaborate.mjs
 * executes them one at a time. Each task gets its own commit. Stops if
 * TypeScript validation fails on any task.
 *
 * Usage:
 *   node scripts/orchestrate.mjs                          # broad pass
 *   node scripts/orchestrate.mjs --focus "mobile layout"  # targeted pass
 *   node scripts/orchestrate.mjs --max-tasks 3            # limit task count
 *   node scripts/orchestrate.mjs --dry-run                # plan only
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { runTask, buildCodebaseContext } from './collaborate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env.local') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function print(msg) { process.stdout.write(msg + '\n'); }

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

// ─── Parse args ───────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const focusIdx    = args.indexOf('--focus');
const focus       = focusIdx !== -1 ? args[focusIdx + 1] : null;
const maxTasksIdx = args.indexOf('--max-tasks');
const maxTasks    = maxTasksIdx !== -1 ? parseInt(args[maxTasksIdx + 1], 10) : 8;
const dryRun      = args.includes('--dry-run');

// ─── GPT-4o planning ─────────────────────────────────────────────────────────

async function planTasks(codebaseCtx) {
  print('\n📋 Planning with GPT-4o...');

  const focusClause = focus
    ? `Focus on: **${focus}**. Lead with items in this area, still flag anything critical elsewhere.`
    : 'Cover all areas: UX/polish, missing features, mobile, accessibility, production readiness.';

  const systemPrompt = `You are an expert UX designer and full-stack developer auditing a community camp management web app called Glåüm Camp.

${focusClause}

**About the project:**
- Next.js 14 App Router · TypeScript · Tailwind CSS · Clerk v7 auth · Supabase · Resend email
- Dark mystical aesthetic: ink background, gold headings, purple accents, TokyoDreams display font
- Community platform: members apply, get approved, pick roles/shifts, message each other, see schedule

**Known gaps:**
- No notification preferences UI (opt-in/out of email types)
- Department/event icons are mostly emoji — no cohesive icon set
- Various pre-prod checklist items still open (docs/pre-prod.md)

Produce a prioritized list of specific, self-contained improvements. Each item must be something that can be implemented in isolation — one feature, one fix, one polish pass. Do not bundle multiple unrelated changes into one item.

Return ONLY a JSON array:
[
  {
    "priority": 1,
    "category": "feature|polish|bug|mobile|accessibility|production",
    "title": "Short imperative title (max 60 chars)",
    "task": "Precise implementation instructions for an AI developer. Name exact files, describe exact changes.",
    "effort": "small|medium|large",
    "dependsOn": []
  }
]`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Codebase context:\n${codebaseCtx}` },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const raw = response.choices[0].message.content.trim();
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  let tasks;
  try {
    tasks = JSON.parse(jsonStr);
  } catch {
    print('⚠ GPT-4o returned non-JSON — using single generic task');
    tasks = [{ priority: 1, category: 'general', title: 'Improve overall quality', task: raw, effort: 'medium', dependsOn: [] }];
  }

  print(`  ✓ Planned ${tasks.length} tasks`);
  return tasks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  print('');
  print('╔══════════════════════════════════════════╗');
  print('║  Glåüm Camp — AI Orchestration           ║');
  print('╚══════════════════════════════════════════╝');

  if (!process.env.ANTHROPIC_API_KEY) { print('✗ ANTHROPIC_API_KEY missing from .env.local'); process.exit(1); }
  if (!process.env.OPENAI_API_KEY)    { print('✗ OPENAI_API_KEY missing from .env.local');    process.exit(1); }

  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const branchName = `ai-collab-${timestamp}`;
  const logDir     = path.join(ROOT, 'scripts', 'logs');
  const logFile    = path.join(logDir, `orchestrate-${timestamp}.md`);
  fs.mkdirSync(logDir, { recursive: true });

  print(`Branch: ${branchName}`);
  print(`Log:    ${logFile}`);
  if (focus)   print(`Focus:  ${focus}`);
  if (dryRun)  print('Mode:   DRY RUN');

  // Init log
  fs.writeFileSync(logFile, `# Orchestration Log — ${timestamp}\n\n${focus ? `**Focus:** ${focus}` : '**Mode:** Broad audit'}\n\n---\n\n`);

  // Create branch
  if (!dryRun) {
    try {
      execSync(`git -C "${ROOT}" checkout -b "${branchName}"`, { stdio: 'pipe' });
      print(`✓ Created branch: ${branchName}`);
    } catch (e) {
      print(`⚠ Branch creation failed: ${e.message}`);
    }
  }

  // Kill any stale dev servers before starting
  killDevPorts();

  // Build context once — shared across all tasks
  print('\n📁 Building codebase context...');
  const codebaseCtx = buildCodebaseContext();
  print('  ✓ Done');

  // Plan
  const allTasks = await planTasks(codebaseCtx);
  const tasksToRun = allTasks.slice(0, maxTasks);

  fs.appendFileSync(logFile, `## Plan (${tasksToRun.length} tasks)\n\n${
    tasksToRun.map((t, i) => `${i + 1}. **${t.title}** (${t.effort}, ${t.category})\n   ${t.task}`).join('\n\n')
  }\n\n---\n\n`);

  print(`\n🚀 Running ${tasksToRun.length} tasks (max ${maxTasks})...\n`);

  // Execute tasks
  const results = [];
  const allRequiredActions = [];

  for (let i = 0; i < tasksToRun.length; i++) {
    const t = tasksToRun[i];
    print(`\n[${i + 1}/${tasksToRun.length}] ${t.title}`);
    print(`  Category: ${t.category} · Effort: ${t.effort}`);

    let result;
    try {
      result = await runTask(t.task, {
        dryRun,
        branchName,
        codebaseCtx,
        logFile,
        quiet: false,
      });
    } catch (err) {
      print(`  ✗ Task threw an error: ${err.message}`);
      result = { task: t.task, success: false, summary: err.message, filesWritten: [], requiredActions: [] };
    }

    results.push({ title: t.title, ...result });
    allRequiredActions.push(...(result.requiredActions || []));

    if (!result.success) {
      print(`\n  ⚠ TypeScript validation failed — stopping to prevent cascading errors.`);
      print(`  Fix the issues on branch ${branchName} before continuing.`);
      break;
    }
  }

  // Kill dev server after all tasks
  print('\n🧹 Cleaning up dev ports...');
  killDevPorts();

  // ─── Final summary ───────────────────────────────────────────────────────

  const completed  = results.filter(r => r.success);
  const failed     = results.filter(r => !r.success);
  const allVisible = results.flatMap(r => r.visibleChanges || []);
  const allBackend = results.flatMap(r => r.backendChanges || []);

  print('\n══════════════════════════════════════════');
  print(`✓ ${completed.length}/${tasksToRun.length} tasks completed`);
  if (failed.length) print(`✗ ${failed.length} task(s) stopped due to TypeScript errors`);
  print(`📄 Log: ${logFile}`);
  print('');

  if (allVisible.length) {
    print('👁  Visible changes (check these in the browser):');
    allVisible.forEach(c => print(`   • ${c}`));
    print('');
  }

  if (allBackend.length) {
    print('⚙  Backend / infrastructure changes:');
    allBackend.forEach(c => print(`   • ${c}`));
    print('');
  }

  if (allRequiredActions.length) {
    // Dedupe by title
    const seen = new Set();
    const unique = allRequiredActions.filter(a => {
      if (seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    });

    print('╔══════════════════════════════════════════╗');
    print('║   ⚠  ACTION REQUIRED BEFORE DEPLOYING  ║');
    print('╚══════════════════════════════════════════╝');
    const icons = { migration: '🗄', env_var: '🔑', service_config: '⚙️', deploy: '🚀', other: '📋' };
    unique.forEach((a, i) => {
      print(`\n${i + 1}. ${icons[a.type] || '📋'}  ${a.title}`);
      print(`   ${a.description}`);
      if (a.file) print(`   File: ${a.file}`);
    });
    print('');

    fs.appendFileSync(logFile, `## ⚠ Actions Required\n\n${
      unique.map((a, i) => `### ${i + 1}. ${a.title}\n**Type:** ${a.type}${a.file ? `\n**File:** \`${a.file}\`` : ''}\n\n${a.description}`).join('\n\n')
    }\n\n`);
  }

  print(`To review: git diff main..${branchName}`);
  print(`To apply:  git checkout main && git merge ${branchName}`);
  print(`To discard: git branch -D ${branchName}`);
}

main().catch(e => {
  print(`\n✗ Fatal: ${e.message}`);
  console.error(e);
  process.exit(1);
});
