// Parallel Planner with Review — four-phase orchestration loop
//
// This template drives a multi-phase workflow:
//   Phase 1 (Plan):             An opus agent analyzes open issues, builds a
//                               dependency graph, and outputs a <plan> JSON
//                               listing unblocked issues with branch names.
//   Phase 2 (Execute + Review): For each issue, a sandbox is created via
//                               createSandbox(). The implementer runs first
//                               (100 iterations). If it produces commits, a
//                               reviewer runs in the same sandbox on the same
//                               branch (1 iteration). All issue pipelines run
//                               concurrently via Promise.allSettled().
//   Phase 3 (Merge):            A single agent merges all completed branches
//                               into the current branch.
//
// The outer loop repeats up to MAX_ITERATIONS times so that newly unblocked
// issues are picked up after each round of merges.
//
// Usage:
//   npx tsx .sandcastle/main.mts
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.mts" }

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of plan→execute→merge cycles before stopping.
// Raise this if your backlog is large; lower it for a quick smoke-test run.
const MAX_ITERATIONS = 10;

// Maximum number of issues to merge in total across the whole run.
// Set to 1 for a "do one issue and stop" smoke test — useful when you want to
// preserve token quota or sanity-check the pipeline. Set to Infinity to drain
// the whole backlog (subject to MAX_ITERATIONS).
const MAX_MERGES = 1;

// Hooks run inside the sandbox before the agent starts each iteration.
// npm install ensures the sandbox always has fresh dependencies.
const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install" }] },
};

// Copy node_modules from the host into the worktree before each sandbox
// starts. Avoids a full npm install from scratch; the hook above handles
// platform-specific binaries and any packages added since the last copy.
const copyToWorktree = ["node_modules"];

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // The planning agent (opus, for deeper reasoning) reads the open issue list,
  // builds a dependency graph, and selects the issues that can be worked in
  // parallel right now (i.e., no blocking dependencies on other open issues).
  //
  // It outputs a <plan> JSON block — we parse that to drive Phase 2.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "planner",
    // One iteration is enough: the planner just needs to read and reason,
    // not write code.
    maxIterations: 1,
    // Opus for planning: dependency analysis benefits from deeper reasoning.
    agent: sandcastle.claudeCode("claude-opus-4-6"),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  // Extract the <plan>…</plan> block from the agent's stdout.
  const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!planMatch) {
    throw new Error(
      "Planning agent did not produce a <plan> tag.\n\n" + plan.stdout,
    );
  }

  // The plan JSON contains an array of issues, each with id, title, branch.
  const { issues } = JSON.parse(planMatch[1]!) as {
    issues: { id: string; title: string; branch: string }[];
  };

  if (issues.length === 0) {
    // No unblocked work — either everything is done or everything is blocked.
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // -------------------------------------------------------------------------
  // Phase 2 + 3: Execute, Review, and Merge — per issue
  //
  // Issues are processed sequentially (one at a time) to keep AI token usage
  // bounded — running implementers in parallel was burning through the quota
  // before any single issue completed.
  //
  // For each issue: create a sandbox, run the implementer, then (if commits
  // were produced) the reviewer in the same sandbox, then immediately merge
  // that branch into the current branch before moving on to the next issue.
  // Merging per-issue means the next implementer sees the latest main, which
  // reduces conflicts and keeps progress visible even if a later issue fails.
  //
  // A try/catch around each issue ensures one failing pipeline doesn't stop
  // the others.
  // -------------------------------------------------------------------------

  let mergedCount = 0;
  let stopAfterIteration = false;

  for (const issue of issues) {
    try {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: docker(),
        hooks,
        copyToWorktree,
      });

      let producedCommits = false;
      try {
        // Run the implementer
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.claudeCode("claude-opus-4-6"),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
        });

        // Only review if the implementer produced commits
        if (implement.commits.length > 0) {
          await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.claudeCode("claude-opus-4-6"),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
            },
          });
          producedCommits = true;
        }
      } finally {
        await sandbox.close();
      }

      if (!producedCommits) {
        console.log(
          `  ${issue.id} (${issue.branch}): no commits produced, skipping merge.`,
        );
        continue;
      }

      // -----------------------------------------------------------------------
      // Phase 3: Merge this single branch immediately.
      //
      // Running the merger per branch (instead of batching at the end) means
      // the next implementer pulls the latest main and sees this issue's work,
      // reducing merge conflicts across sequential issues.
      // -----------------------------------------------------------------------
      console.log(`\nMerging ${issue.branch}...`);
      await sandcastle.run({
        hooks,
        sandbox: docker(),
        name: "merger",
        maxIterations: 1,
        agent: sandcastle.claudeCode("claude-opus-4-6"),
        promptFile: "./.sandcastle/merge-prompt.md",
        promptArgs: {
          BRANCHES: `- ${issue.branch}`,
          ISSUES: `- ${issue.id}: ${issue.title}`,
        },
      });
      mergedCount++;
      console.log(`  ✓ ${issue.branch} merged.`);

      if (mergedCount >= MAX_MERGES) {
        console.log(
          `\nReached MAX_MERGES (${MAX_MERGES}). Stopping early.`,
        );
        stopAfterIteration = true;
        break;
      }
    } catch (reason) {
      console.error(
        `  ✗ ${issue.id} (${issue.branch}) failed: ${reason}`,
      );
    }
  }

  console.log(`\nIteration ${iteration} complete. ${mergedCount} branch(es) merged.`);

  if (stopAfterIteration) {
    break;
  }

  if (mergedCount === 0) {
    // Nothing got merged this cycle — re-planning won't help.
    console.log("No progress this iteration. Exiting.");
    break;
  }
}

console.log("\nAll done.");
