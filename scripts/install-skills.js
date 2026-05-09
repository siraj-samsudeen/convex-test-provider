#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { cpSync, mkdirSync, readdirSync, statSync } from "fs";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skillsSource = join(packageRoot, "claude-skills");
const skillsDest = join(process.cwd(), ".claude", "skills");

mkdirSync(skillsDest, { recursive: true });

let count = 0;
for (const entry of readdirSync(skillsSource)) {
  const src = join(skillsSource, entry);
  if (statSync(src).isDirectory()) {
    cpSync(src, join(skillsDest, entry), { recursive: true });
    console.log(`  installed: ${entry}`);
    count++;
  }
}

console.log(`\n${count} skill(s) installed to .claude/skills/`);
