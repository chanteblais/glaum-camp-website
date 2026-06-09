#!/usr/bin/env node
/**
 * AI Collaboration Script — Glåüm Camp Website
 *
 * Usage:
 *   node scripts/collaborate.js                          # broad audit pass
 *   node scripts/collaborate.js --focus "mobile layout"  # targeted pass
 *   node scripts/collaborate.js --dry-run                # plan only, no file writes
 *
 * What it does:
 *   1. GPT-4o does a fresh-eyes audit of the codebase and produces a prioritized
 *      list of improvements (design, UX, features, bugs).
 *   2. Claude reads the audit + codebase and implements the improvements using
 *      tool calls (read_file, write_file, generate_image, shell).
 *   3. DALL-E 3 generates any images Claude requests inline.
 *   4. All changes land on a new git branch: ai-collab-{timestamp}
 *   5. A work log is written to scripts/logs/collab-{timestamp}.md
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// ─── Setup ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load env vars from .env.local
dotenv.config({ path: path.join(ROOT, '.env.local') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const args = process.argv.slice(2);
const focusIdx = args.indexOf('--focus');
const focus = focusIdx !== -1 ? args[focusIdx + 1] : null;
const dryRun = args.includes('--dry-run');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const branchName = `ai-collab-${timestamp}`;
const logDir = path.join(ROOT, 'scripts', 'logs');
const logFile = path.join(logDir, `collab-${timestamp}.md`);

fs.mkdirSync(logDir, { recursive: true });

let log = `# AI Collaboration Log — ${timestamp}\n\n`;
log += focus ? `**Focus:** ${focus}\n\n` : `**Mode:** Broad audit\n\n`;

function appendLog(section, content) {
  log += `## ${section}\n\n${content}\n\n`;
  fs.writeFileSync(logFile, log);
}

function print(msg) {
  process.stdout.write(msg + '\n');
}

// ─── Git branch ───────────────────────────────────────────────────────────────

function setupBranch() {
  if (dryRun) {
    print(`[dry-run] Would create branch: ${branchName}`);
    return;
  }
  try {
    execSync(`git -C "${ROOT}" checkout -b "${branchName}"`, { stdio: 'pipe' });
    print(`✓ Created branch: ${branchName}`);
  } catch (e) {
    print(`⚠ Could not create git branch (is this a git repo?): ${e.message}`);
  }
}

// ─── Codebase context ─────────────────────────────────────────────────────────

function buildCodebaseContext() {
  const keyFiles = [
    'docs/design-system.md',
    'docs/features.md',
    'docs/pre-prod.md',
    'app/page.tsx',
    'app/HomePageEditor.tsx',
    'app/profile/page.tsx',
    'app/messages/page.tsx',
    'components/HeaderClient.tsx',
    'lib/supabase.ts',
    'tailwind.config.ts',
  ];

  let ctx = '';
  for (const rel of keyFiles) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8').slice(0, 6000);
      ctx += `\n\n### ${rel}\n\`\`\`\n${content}\n\`\`\``;
    }
  }
  return ctx;
}

// ─── Tool definitions for Claude ─────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the project. Paths are relative to the project root.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root, e.g. app/page.tsx' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write or overwrite a file in the project. Creates parent directories as needed.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a directory (non-recursive, relative to project root).',
    input_schema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Relative directory path, e.g. app/api or components' },
      },
      required: ['dir'],
    },
  },
  {
    name: 'generate_image',
    description: 'Generate an image using DALL-E 3 and save it to the public/ directory. Returns the saved path.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed DALL-E 3 prompt describing the image' },
        filename: { type: 'string', description: 'Filename to save under public/, e.g. icons/schedule.png' },
        size: {
          type: 'string',
          enum: ['1024x1024', '1792x1024', '1024x1792'],
          description: 'Image dimensions. Default 1024x1024.',
        },
        style: {
          type: 'string',
          enum: ['vivid', 'natural'],
          description: 'DALL-E style. Default natural.',
        },
      },
      required: ['prompt', 'filename'],
    },
  },
  {
    name: 'shell',
    description: 'Run a safe read-only shell command (ls, cat, grep, find). Write operations are blocked.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to run' },
      },
      required: ['command'],
    },
  },
  {
    name: 'done',
    description: 'Signal that all improvements have been implemented. Provide a summary of what was done.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Summary of all changes made' },
        changes: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific changes made',
        },
      },
      required: ['summary', 'changes'],
    },
  },
];

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(name, input) {
  switch (name) {
    case 'read_file': {
      const full = path.join(ROOT, input.path);
      if (!full.startsWith(ROOT)) return 'Error: path outside project root';
      if (!fs.existsSync(full)) return `Error: file not found: ${input.path}`;
      const content = fs.readFileSync(full, 'utf8');
      return content.length > 12000 ? content.slice(0, 12000) + '\n[truncated]' : content;
    }

    case 'write_file': {
      const full = path.join(ROOT, input.path);
      if (!full.startsWith(ROOT)) return 'Error: path outside project root';
      if (dryRun) {
        print(`  [dry-run] Would write: ${input.path}`);
        return `[dry-run] Would write ${input.path}`;
      }
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, input.content, 'utf8');
      print(`  ✓ Wrote: ${input.path}`);
      return `Successfully wrote ${input.path}`;
    }

    case 'list_files': {
      const full = path.join(ROOT, input.dir);
      if (!full.startsWith(ROOT)) return 'Error: path outside project root';
      if (!fs.existsSync(full)) return `Error: directory not found: ${input.dir}`;
      const entries = fs.readdirSync(full, { withFileTypes: true });
      return entries.map(e => `${e.isDirectory() ? '[dir] ' : ''}${e.name}`).join('\n');
    }

    case 'generate_image': {
      if (dryRun) {
        print(`  [dry-run] Would generate image: ${input.filename}`);
        return `[dry-run] Would generate image at public/${input.filename}`;
      }
      print(`  🎨 Generating image: ${input.filename}...`);
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: input.prompt,
        size: input.size || '1024x1024',
        style: input.style || 'natural',
        response_format: 'url',
      });

      const url = response.data[0].url;
      const imgResponse = await fetch(url);
      const buffer = Buffer.from(await imgResponse.arrayBuffer());

      const savePath = path.join(ROOT, 'public', input.filename);
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, buffer);
      print(`  ✓ Saved image: public/${input.filename}`);
      return `Image saved to public/${input.filename}. Reference it in code as /${input.filename}`;
    }

    case 'shell': {
      // Safeguard: block write operations
      const blocked = ['rm ', 'mv ', 'cp ', 'mkdir', 'touch', 'chmod', 'chown', '>', '>>', 'npm install', 'npm run'];
      if (blocked.some(b => input.command.includes(b))) {
        return 'Error: write operations are not allowed via shell tool. Use write_file instead.';
      }
      const result = spawnSync('bash', ['-c', input.command], { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
      return (result.stdout || '') + (result.stderr ? `\nSTDERR: ${result.stderr}` : '');
    }

    case 'done': {
      return '__DONE__';
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Phase 1: GPT-4o audit ────────────────────────────────────────────────────

async function runGPTAudit(codebaseCtx) {
  print('\n📋 Phase 1: GPT-4o audit...');

  const focusClause = focus
    ? `Pay special attention to: **${focus}**. Lead your list with issues in this area, though still flag anything critical you notice elsewhere.`
    : 'Cover all areas: visual polish, UX flow, missing features, mobile responsiveness, accessibility, and production readiness.';

  const systemPrompt = `You are an expert UX designer and web developer doing a fresh-eyes audit of a community camp management web application called Glåüm Camp. You have no prior context — judge it purely on what you see in the code and documentation.

Your job is to produce a prioritized, actionable list of specific improvements. Be concrete and direct. Each item should name the exact file(s) to change and what to do.

${focusClause}

**About the project:**
- Next.js 14 App Router · Tailwind CSS · TypeScript · Clerk auth · Supabase
- Design aesthetic: dark mystical/gothic (ink background, gold headings, purple accents, Tokyo Dreams display font)
- It's a camp community platform: members apply, get approved, select roles/shifts, message each other
- Already has: email via Resend (installed but notification preferences not built), image gen via DALL-E available, polls, announcements, member directory, schedule, messaging

**Known gaps from the pre-prod checklist and feature wishlist:**
- Members do NOT get email notifications when they receive a message (Resend is installed but this isn't wired up)
- No notification preferences UI for members (opt-out of emails)
- Icon/graphic design could be more cohesive — department icons and event type icons are mostly emoji
- Various pre-prod items in docs/pre-prod.md still open

Return your audit as a JSON array of improvement objects:
[
  {
    "priority": 1,
    "category": "feature|polish|bug|mobile|accessibility",
    "title": "Short title",
    "description": "What to do and why",
    "files": ["app/foo.tsx", "lib/bar.ts"],
    "effort": "small|medium|large",
    "imageNeeded": false
  }
]

Return ONLY the JSON array, no prose around it.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the codebase context:\n${codebaseCtx}` },
    ],
    temperature: 0.4,
    max_tokens: 4000,
  });

  const raw = response.choices[0].message.content.trim();

  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  let audit;
  try {
    audit = JSON.parse(jsonStr);
  } catch {
    print('⚠ GPT-4o returned non-JSON, using raw text as audit');
    audit = [{ priority: 1, category: 'general', title: 'GPT-4o Audit', description: raw, files: [], effort: 'medium', imageNeeded: false }];
  }

  print(`  ✓ GPT-4o identified ${audit.length} improvements`);
  appendLog('GPT-4o Audit', '```json\n' + JSON.stringify(audit, null, 2) + '\n```');
  return audit;
}

// ─── Phase 2: Claude implementation ──────────────────────────────────────────

async function runClaudeImplementation(audit, codebaseCtx) {
  print('\n🔨 Phase 2: Claude implementing improvements...\n');

  const auditSummary = audit
    .slice(0, 12)
    .map((item, i) => `${i + 1}. [${item.priority}] ${item.title} (${item.effort}, ${item.category})\n   ${item.description}\n   Files: ${item.files?.join(', ') || 'TBD'}`)
    .join('\n\n');

  const focusNote = focus ? `\nThe user specifically requested focus on: **${focus}** — prioritize those items.\n` : '';

  const systemPrompt = `You are an expert Next.js/TypeScript/Tailwind developer implementing improvements to the Glåüm Camp website. You have full access to read and write files in the project.

**Project:** Next.js 14 App Router · Clerk v7 auth · Supabase · Tailwind CSS · TypeScript
**Design system:** Dark mystical aesthetic — ink (#1A0A24) background, gold (#C8A848) headings, purple (#D239F8) accents, TokyoDreams display font, Libre Baskerville body serif
**Key conventions:**
- No shared layout header — each page manages its own header row
- Server components use supabaseAdmin directly; client components fetch /api/...
- Inline <style> tags with attribute selectors must use dangerouslySetInnerHTML
- Always fetch applications and camp_signups separately and join in JS
- Resend is available for email (import from 'resend')
- Email FROM address: 'Glåüm Camp <notifications@glaum.camp>' (update if domain not yet verified)

**Your task:**
Work through the audit items below and implement the improvements. Start with high-priority, smaller-effort items. Read files before editing them. For each change, write the complete updated file content.

If you need a custom image or icon, use the generate_image tool with a detailed DALL-E 3 prompt matching the dark mystical aesthetic (dark backgrounds, gold/purple palette, ethereal quality).

When you have implemented everything meaningful in this pass, call the done tool with a summary.
${focusNote}
**GPT-4o's audit (prioritized):**
${auditSummary}`;

  const messages = [
    {
      role: 'user',
      content: `Here is the current codebase context to get you started (you can read more files as needed):\n${codebaseCtx}\n\nPlease implement the improvements from the audit. Start with the highest-priority, most impactful items.`,
    },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 40;
  let isDone = false;
  let finalSummary = '';
  const changesLog = [];

  while (!isDone && iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Add assistant response to history
    messages.push({ role: 'assistant', content: response.content });

    // Log any text output
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        print(`  Claude: ${block.text.slice(0, 200)}${block.text.length > 200 ? '...' : ''}`);
      }
    }

    // Process tool calls
    if (response.stop_reason === 'tool_use') {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        print(`  → ${block.name}(${JSON.stringify(block.input).slice(0, 80)}...)`);
        const result = await executeTool(block.name, block.input);

        if (result === '__DONE__') {
          isDone = true;
          finalSummary = block.input.summary || '';
          changesLog.push(...(block.input.changes || []));
          break;
        }

        if (block.name === 'write_file') {
          changesLog.push(`Updated ${block.input.path}`);
        }
        if (block.name === 'generate_image') {
          changesLog.push(`Generated image: public/${block.input.filename}`);
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      if (!isDone) {
        messages.push({ role: 'user', content: toolResults });
      }
    } else {
      // end_turn — Claude is done naturally
      isDone = true;
      finalSummary = response.content.find(b => b.type === 'text')?.text || 'Implementation complete.';
    }
  }

  appendLog('Changes Made', changesLog.map(c => `- ${c}`).join('\n'));
  appendLog('Summary', finalSummary);

  return { summary: finalSummary, changes: changesLog };
}

// ─── Git commit ───────────────────────────────────────────────────────────────

function commitChanges(changes) {
  if (dryRun) {
    print('\n[dry-run] Would commit changes');
    return;
  }
  try {
    execSync(`git -C "${ROOT}" add -A`, { stdio: 'pipe' });
    const msg = `AI collaboration pass: ${changes.length} improvements\n\nFocus: ${focus || 'broad audit'}\nLog: scripts/logs/collab-${timestamp}.md`;
    execSync(`git -C "${ROOT}" commit -m "${msg.replace(/"/g, "'")}"`, { stdio: 'pipe' });
    print(`✓ Committed to branch: ${branchName}`);
  } catch (e) {
    print(`⚠ Git commit failed: ${e.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  print('');
  print('╔═══════════════════════════════════════════╗');
  print('║   Glåüm Camp — AI Collaboration Script    ║');
  print('╚═══════════════════════════════════════════╝');
  print('');

  if (!process.env.ANTHROPIC_API_KEY) {
    print('✗ ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    print('✗ OPENAI_API_KEY not found in .env.local');
    process.exit(1);
  }

  if (focus) print(`Focus: ${focus}`);
  if (dryRun) print('Mode: DRY RUN (no files will be written)');
  print(`Log: ${logFile}`);
  print('');

  setupBranch();

  print('\n📁 Building codebase context...');
  const codebaseCtx = buildCodebaseContext();
  print('  ✓ Context built');

  const audit = await runGPTAudit(codebaseCtx);
  const { summary, changes } = await runClaudeImplementation(audit, codebaseCtx);

  commitChanges(changes);

  print('\n═══════════════════════════════════════════');
  print(`✓ Done! ${changes.length} changes on branch: ${branchName}`);
  print(`📄 Log: ${logFile}`);
  print('');
  print('Summary:');
  print(summary.slice(0, 500));
  print('');
  print(`To review: git diff main..${branchName}`);
  print(`To apply:  git checkout main && git merge ${branchName}`);
  print(`To discard: git branch -D ${branchName}`);
}

main().catch(e => {
  print(`\n✗ Fatal error: ${e.message}`);
  console.error(e);
  process.exit(1);
});
