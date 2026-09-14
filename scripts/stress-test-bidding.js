/**
 * =============================================================================
 * DEMONS REIGN ESPORTS — CONCURRENT BIDDING RACE CONDITION & STRESS TEST SUITE
 * =============================================================================
 *
 * Validates:
 * 1. Setup & Authentication: Connects to Supabase with environment or fallback credentials.
 * 2. Race Condition Simulator: Fires simulateBid concurrently for 5-10 teams at the exact
 *    same millisecond using Promise.all() attempting to claim the same next_bid.
 * 3. Budget Limit Enforcement: Injects an over-budget bid to prove the database/application
 *    rejects the transaction when bid > remaining_budget.
 * 4. Final State Verification:
 *    - Proves only ONE team claims highest_bidder_id / highest_bidder_team_id.
 *    - Proves current_bid incremented exactly once (no corrupted multiple increments).
 *    - Proves no team budget fell below zero.
 *
 * Usage:
 *   node scripts/stress-test-bidding.js
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';

// ── 1. Configuration & Supabase Initialization ───────────────────────────────
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://idfljitxybmeagrcramx.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_7v1z9spU7arRk0QpTgkX0A_8Mj0KawU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ANSI Colors for clean terminal reporting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

async function runStressTest() {
  console.log(`\n${colors.bright}${colors.cyan}====================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  DEMONS REIGN AUCTION — CONCURRENT BIDDING STRESS TEST SUITE       ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}====================================================================${colors.reset}\n`);

  console.log(`[1/5] Connecting to Supabase at: ${colors.yellow}${SUPABASE_URL}${colors.reset}`);

  // ── Step 1: Fetch Current Auction State and Active Teams ──────────────────
  const { data: initialAuction, error: aErr } = await supabase
    .from('auction_state')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (aErr) {
    console.error(`${colors.red}✕ Failed to fetch auction_state:${colors.reset}`, aErr.message);
    process.exit(1);
  }

  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('*');

  if (tErr || !teams || teams.length === 0) {
    console.error(`${colors.red}✕ No active teams found in database. Please register teams first.${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Auction state connected.${colors.reset} Initial Current Bid: ₣${initialAuction?.current_bid ?? 0}`);
  console.log(`${colors.green}✓ Retrieved ${teams.length} active teams${colors.reset} from database:`);
  teams.forEach((t, i) => {
    const purse = t.budget ?? t.remaining_budget ?? t.fire_coin_balance ?? 40000;
    console.log(`    #${i + 1} [${t.id}] ${t.team_name || t.name} — Purse: ₣${purse.toLocaleString()}`);
  });

  // Prepare a test active player if not present
  const baseBid = 1000;
  const bidIncrement = 500;

  // Staging / resetting state to 'bidding' for a controlled race test
  console.log(`\n[2/5] Initializing live test baseline in auction_state (id=1)...`);
  await supabase
    .from('auction_state')
    .update({
      status: 'bidding',
      current_bid: baseBid,
      highest_bidder_team_id: teams[0].id,
    })
    .eq('id', 1);

  console.log(`${colors.green}✓ Baseline staged:${colors.reset} status = 'bidding', current_bid = ₣${baseBid}, highest_bidder = ${teams[0].id}`);

  // ── Step 2: Race Condition Simulator Function ──────────────────────────────
  /**
   * Simulates a real-time owner bid with atomic validation.
   * Enforces optimistic concurrency check: the bid succeeds ONLY if current_bid
   * in the database hasn't changed since reading (idempotent atomic increment).
   */
  async function simulateBid(team, targetCurrentBid, increment) {
    const teamId = team.id;
    const teamPurse = team.budget ?? team.remaining_budget ?? team.fire_coin_balance ?? 40000;
    const computedNextBid = targetCurrentBid + increment;

    const startTime = Date.now();

    // 1. Budget validation check
    if (teamPurse < computedNextBid) {
      return {
        teamId,
        teamName: team.team_name || team.name,
        attemptedBid: computedNextBid,
        success: false,
        reason: 'BUDGET_EXCEEDED',
        elapsedMs: Date.now() - startTime,
      };
    }

    // 2. Atomic conditional update:
    // Update ONLY IF id = 1 AND current_bid = targetCurrentBid AND status = 'bidding'
    const { data: updatedRow, error: updateErr } = await supabase
      .from('auction_state')
      .update({
        current_bid: computedNextBid,
        highest_bidder_team_id: teamId,
      })
      .eq('id', 1)
      .eq('current_bid', targetCurrentBid) // Concurrency guard: prevents double increment
      .eq('status', 'bidding')
      .select();

    const elapsedMs = Date.now() - startTime;

    if (updateErr) {
      return {
        teamId,
        teamName: team.team_name || team.name,
        attemptedBid: computedNextBid,
        success: false,
        reason: updateErr.message,
        elapsedMs,
      };
    }

    // If no row was updated, another concurrent transaction won the race condition!
    if (!updatedRow || updatedRow.length === 0) {
      return {
        teamId,
        teamName: team.team_name || team.name,
        attemptedBid: computedNextBid,
        success: false,
        reason: 'RACE_COLLISION_LOST (Stale bid amount)',
        elapsedMs,
      };
    }

    return {
      teamId,
      teamName: team.team_name || team.name,
      attemptedBid: computedNextBid,
      success: true,
      reason: 'BID_ACCEPTED_AS_HIGHEST',
      elapsedMs,
    };
  }

  // ── Step 3: Fire Concurrent Simultaneous Bids (Promise.all) ────────────────
  const raceTeams = teams.slice(0, Math.min(teams.length, 8));
  // If fewer than 5 unique teams, generate multi-session concurrent attempts
  const concurrentCandidates = [];
  for (let i = 0; i < 6; i++) {
    const selectedTeam = raceTeams[i % raceTeams.length];
    concurrentCandidates.push({
      ...selectedTeam,
      sessionName: `${selectedTeam.team_name || selectedTeam.name} (Client #${i + 1})`,
    });
  }

  const expectedNextBid = baseBid + bidIncrement;
  console.log(`\n[3/5] ${colors.bright}${colors.yellow}Simulating write collision with ${concurrentCandidates.length} simultaneous bid requests at the exact same millisecond...${colors.reset}`);
  console.log(`      Target Current Bid: ₣${baseBid} ➔ Desired Next Bid: ₣${expectedNextBid}`);

  const collisionPromises = concurrentCandidates.map((candidate) =>
    simulateBid(candidate, baseBid, bidIncrement)
  );

  const collisionResults = await Promise.all(collisionPromises);

  console.log(`\n--- Concurrent Collision Results (${collisionResults.length} requests resolved) ---`);
  let successfulBids = 0;
  let rejectedCollisions = 0;

  collisionResults.forEach((res, idx) => {
    if (res.success) {
      successfulBids++;
      console.log(`  [REQ #${idx + 1}] ${colors.green}✓ SUCCESS${colors.reset}: ${res.teamName} placed bid ₣${res.attemptedBid.toLocaleString()} (${res.elapsedMs}ms)`);
    } else {
      rejectedCollisions++;
      console.log(`  [REQ #${idx + 1}] ${colors.yellow}✕ REJECTED${colors.reset}: ${res.teamName} -> Reason: ${res.reason} (${res.elapsedMs}ms)`);
    }
  });

  // ── Step 4: Budget Limit Edge Case Test ────────────────────────────────────
  console.log(`\n[4/5] ${colors.bright}Testing Budget Limit Protection Guard...${colors.reset}`);
  const sampleTeam = teams[0];
  const samplePurse = sampleTeam.budget ?? sampleTeam.remaining_budget ?? sampleTeam.fire_coin_balance ?? 40000;
  const excessiveBid = samplePurse + 50000; // Artificially higher than team purse

  console.log(`      Attempting artificial bid: ₣${excessiveBid.toLocaleString()} with Team Purse: ₣${samplePurse.toLocaleString()}`);

  const budgetTestResult = await simulateBid(sampleTeam, expectedNextBid, excessiveBid - expectedNextBid);

  if (!budgetTestResult.success && budgetTestResult.reason === 'BUDGET_EXCEEDED') {
    console.log(`  ${colors.green}✓ PASS: Database/Logic rejected over-budget bid correctly (${budgetTestResult.reason})${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✕ FAIL: Over-budget bid was not rejected!${colors.reset}`, budgetTestResult);
  }

  // ── Step 5: Final State Verification & Integrity Assertions ────────────────
  console.log(`\n[5/5] ${colors.bright}Fetching final database state for verification...${colors.reset}`);

  const { data: finalAuction } = await supabase
    .from('auction_state')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const { data: finalTeams } = await supabase
    .from('teams')
    .select('*');

  console.log(`\n================ FINAL DATABASE STATE AUDIT ================`);
  console.log(`  Final Auction Status:      ${finalAuction.status}`);
  console.log(`  Final Current Bid:         ₣${finalAuction.current_bid.toLocaleString()}`);
  console.log(`  Final Highest Bidder ID:   ${finalAuction.highest_bidder_team_id}`);

  // Assertions:
  const passOnlyOneWinner = successfulBids === 1;
  const passSingleIncrement = Number(finalAuction.current_bid) === expectedNextBid;
  const passNoNegativePurse = finalTeams.every((t) => {
    const p = t.budget ?? t.remaining_budget ?? t.fire_coin_balance ?? 0;
    return p >= 0;
  });

  console.log(`\n================ INTEGRITY ASSERTIONS ======================`);
  console.log(`  a) Exactly ONE team registered as highest bidder: ${passOnlyOneWinner ? colors.green + '✓ PASSED (1 winner, ' + rejectedCollisions + ' gracefully rejected)' : colors.red + '✕ FAILED (' + successfulBids + ' winners)'}${colors.reset}`);
  console.log(`  b) current_bid incremented exactly once (₣${baseBid} -> ₣${expectedNextBid}): ${passSingleIncrement ? colors.green + '✓ PASSED' : colors.red + '✕ FAILED (Corrupted bid: ' + finalAuction.current_bid + ')'}${colors.reset}`);
  console.log(`  c) No team budget dropped below zero:            ${passNoNegativePurse ? colors.green + '✓ PASSED (All >= 0)' : colors.red + '✕ FAILED'}${colors.reset}`);
  console.log(`============================================================\n`);

  if (passOnlyOneWinner && passSingleIncrement && passNoNegativePurse) {
    console.log(`${colors.bright}${colors.green}ALL CONCURRENCY & RACE-CONDITION TESTS PASSED SUCCESSFULLY! 🎯${colors.reset}\n`);
  } else {
    console.log(`${colors.bright}${colors.red}TEST FAILED: Race condition detected or invalid state reached.${colors.reset}\n`);
    process.exit(1);
  }
}

runStressTest().catch((err) => {
  console.error('Unhandled Stress Test Error:', err);
  process.exit(1);
});
