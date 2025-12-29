/* start of edit 1 */
const game = {
  // setup
  originalPlayers: [],
  roles: {},
  leaderIndex: null,

  // toggles
  useMerlin: true,
  usePercival: true,
  useOberon: false,
  useMordred: false,

  // game state
  roundNumber: 1,
  failedProposals: 0,
  maxFailedProposals: 5,
  currentLeader: null,
  selectedTeam: [],
  missionVotes: [],
  missionResults: [],
  pastMissions: [],
  metadata: [],
  winningTeam: null,

  // UI flow helpers
  revealIndex: 0,
  missionVoteIndex: 0
};
/* end of edit 1 */


const app = document.getElementById("app");

function render(html) {
  app.innerHTML = html;
}

/* ---------- SETUP ---------- */

function renderSetup() {
  render(`
    <h1>The Resistance: Avalon</h1>
    <div class="card">
      ${Array.from({length: 10}, (_, i) =>
        `<input id="p${i}" placeholder="Player ${i+1}">`
      ).join("")}
    </div>

    <div class="card">
      <label><input type="checkbox" id="merlin" checked> Merlin & Assassin</label>
      <label><input type="checkbox" id="percival" checked> Percival & Morgana</label>
      <label><input type="checkbox" id="oberon"> Oberon</label>
      <label><input type="checkbox" id="mordred"> Mordred</label>
    </div>

    <button onclick="startGame()">Start Game</button>
  `);
}

function startGame() {
  const names = [];
  for (let i = 0; i < 10; i++) {
    const v = document.getElementById(`p${i}`).value.trim();
    if (v) names.push(v);
  }
  if (names.length < 5 || names.length > 10) {
    alert("Enter 5–10 players.");
    return;
  }

  game.originalPlayers = names;
  game.useMerlin = document.getElementById("merlin").checked;
  game.usePercival = document.getElementById("percival").checked;
  game.useOberon = document.getElementById("oberon").checked;
  game.useMordred = document.getElementById("mordred").checked;

  game.metadata.push(`Game start: players ${names.join(", ")}`);
  assignRoles();
}

/* ---------- ROLE ASSIGNMENT ---------- */

function assignRoles() {
  const n = game.originalPlayers.length;
  const evilCount = {5:2,6:2,7:3,8:3,9:3,10:4}[n];
  let roles = Array(evilCount).fill("Evil")
    .concat(Array(n - evilCount).fill("Good"));
  let specials = [];

  if (game.useMerlin) {
    roles.splice(roles.indexOf("Good"),1);
    roles.splice(roles.indexOf("Evil"),1);
    specials.push("Merlin","Assassin");
  }
  if (game.usePercival) {
    roles.splice(roles.indexOf("Good"),1);
    roles.splice(roles.indexOf("Evil"),1);
    specials.push("Percival","Morgana");
  }
  if (game.useOberon) {
    roles.splice(roles.indexOf("Evil"),1);
    specials.push("Oberon");
  }
  if (game.useMordred) {
    roles.splice(roles.indexOf("Evil"),1);
    specials.push("Mordred");
  }

  const deck = roles.concat(specials).sort(() => Math.random() - 0.5);
  game.roles = {};
  game.originalPlayers.forEach((p,i)=>game.roles[p]=deck[i]);

  game.leaderIndex = Math.floor(Math.random()*n);
  game.revealIndex = 0;
  game.metadata.push("Roles assigned.");
  renderRolePrivacy();
}

/* ---------- ROLE REVEAL ---------- */

function renderRolePrivacy() {
  if (game.revealIndex >= game.originalPlayers.length) {
    startTeamProposal();
    return;
  }
  const p = game.originalPlayers[game.revealIndex];
  render(`
    <div class="card">
      <h2>${p}</h2>
      <p>Pass the phone and press below to see your role.</p>
      <button onclick="renderRole()">Show Role</button>
    </div>
  `);
}

function renderRole() {
  const p = game.originalPlayers[game.revealIndex];
  const r = game.roles[p];
  let info = "";

  if (r === "Merlin") {
    const ev = Object.entries(game.roles)
      .filter(([_,v])=>["Evil","Assassin","Morgana","Oberon"].includes(v))
      .map(([k])=>k);
    info = `Evil players:<br>${ev.join("<br>")}`;
  }
  if (r === "Percival") {
    const ml = Object.entries(game.roles)
      .filter(([_,v])=>["Merlin","Morgana"].includes(v))
      .map(([k])=>k)
      .sort(()=>Math.random()-0.5);
    info = `Merlin is one of:<br>${ml.join("<br>")}`;
  }
  if (["Evil","Assassin","Morgana","Mordred"].includes(r)) {
    const mates = Object.entries(game.roles)
      .filter(([k,v])=>v !== "Oberon" && v !== "Good" && k!==p)
      .map(([k])=>k);
    info = `Other Evil:<br>${mates.join(", ")}`;
  }

  render(`
    <div class="card">
      <h2>${p}</h2>
      <h1>${r}</h1>
      <div>${info}</div>
      <button onclick="nextReveal()">Continue</button>
    </div>
  `);
}

function nextReveal() {
  game.revealIndex++;
  renderRolePrivacy();
}

/* ---------- TEAM PROPOSAL ---------- */

function startTeamProposal() {
  const n = game.originalPlayers.length;
  const sizes = {
    5:[2,3,2,3,3],6:[2,3,4,3,4],7:[2,3,3,4,4],
    8:[3,4,4,5,5],9:[3,4,4,5,5],10:[3,4,4,5,5]
  };

  game.currentLeader = game.originalPlayers[game.leaderIndex];
  game.leaderIndex = (game.leaderIndex + 1) % n;
  game.metadata.push(`Leader '${game.currentLeader}' selected`);

  const ts = sizes[n][game.roundNumber-1];

  render(`
    <h2>Round ${game.roundNumber}</h2>
    <div class="card">
      <p><b>Leader:</b> ${game.currentLeader}</p>
      <p><b>Team size:</b> ${ts}</p>
      <p><b>Failed proposals:</b> ${game.failedProposals}/5</p>
    </div>

    <div class="card">
      ${game.originalPlayers.map(p =>
        `<label><input type="checkbox" value="${p}"> ${p}</label>`
      ).join("")}
      <button onclick="submitTeam(${ts})">Submit Team</button>
    </div>

    <details><summary>Past Missions</summary>
      ${game.pastMissions.map((m,i)=>
        `Mission ${i+1}: ${m.pass?"Passed":"Failed"} (${m.fails} fails)`
      ).join("<br>")}
    </details>

    <details><summary>Metadata</summary>
      ${game.metadata.slice().reverse().join("<br>")}
    </details>
  `);
}

function submitTeam(req) {
  const checked = [...document.querySelectorAll("input[type=checkbox]:checked")]
    .map(x=>x.value);
  if (checked.length !== req) {
    alert(`Select exactly ${req} players.`);
    return;
  }
  game.selectedTeam = checked;
  game.metadata.push(`Proposal by ${game.currentLeader}: ${checked.join(", ")}`);
  renderVote();
}

/* ---------- TEAM VOTE ---------- */

function renderVote() {
  render(`
    <h2>Team Vote</h2>
    <button onclick="approveTeam()">Approved</button>
    <button class="danger" onclick="rejectTeam()">Rejected</button>
  `);
}

function rejectTeam() {
  game.failedProposals++;
  game.metadata.push(`Proposal rejected`);
  if (game.failedProposals >= 5) {
    game.metadata.push(`Mission auto-failed after 5 rejections`);
    game.pastMissions.push({
      leader: game.currentLeader,
      team: [],
      pass: false,
      fails: 0
    });
    game.missionResults.push(false);
    game.roundNumber++;
    game.failedProposals = 0;
  }
  startTeamProposal();
}

function approveTeam() {
  game.metadata.push(`Proposal approved`);
  game.missionVotes = [];
  game.missionVoteIndex = 0;
  renderMissionVote();
}

/* ---------- MISSION VOTING ---------- */

function renderMissionVote() {
  if (game.missionVoteIndex >= game.selectedTeam.length) {
    revealMission();
    return;
  }
  const p = game.selectedTeam[game.missionVoteIndex];
  const evil = ["Evil","Assassin","Morgana","Oberon","Mordred"].includes(game.roles[p]);
  render(`
    <h2>${p}, your mission vote</h2>
    <button onclick="submitMissionVote('Pass')">Pass</button>
    ${evil ? `<button class="danger" onclick="submitMissionVote('Fail')">Fail</button>` : ``}
  `);
}

function submitMissionVote(v) {
  game.missionVotes.push(v);
  game.missionVoteIndex++;
  renderMissionVote();
}

/* ---------- MISSION RESULT ---------- */

function revealMission() {
  const fails = game.missionVotes.filter(v=>v==="Fail").length;
  const passed = (game.roundNumber === 4 && game.originalPlayers.length >= 7)
    ? fails < 2
    : fails === 0;

  game.pastMissions.push({
    leader: game.currentLeader,
    team: game.selectedTeam,
    pass: passed,
    fails
  });
  game.missionResults.push(passed);

  render(`
    <h2>Mission Result</h2>
    <h1>${passed ? "PASSED" : "FAILED"}</h1>
    <p>Fails: ${fails}</p>
    <button onclick="nextAfterMission()">Continue</button>
  `);
}

function nextAfterMission() {
  const g = game.missionResults.filter(x=>x).length;
  const e = game.missionResults.filter(x=>!x).length;
  if (g >= 3 && game.useMerlin) {
    renderAssassinPhase();
  } else if (g >= 3) {
    game.winningTeam = "Good";
    renderFinal();
  } else if (e >= 3) {
    game.winningTeam = "Evil";
    renderFinal();
  } else {
    game.roundNumber++;
    game.failedProposals = 0;
    startTeamProposal();
  }
}

/* ---------- ASSASSIN ---------- */

function renderAssassinPhase() {
  render(`
    <h2>Assassin Phase</h2>
    ${game.originalPlayers
      .filter(p=>["Good","Merlin","Percival"].includes(game.roles[p]))
      .map(p=>`<label><input type="radio" name="kill" value="${p}"> ${p}</label>`)
      .join("")}
    <button onclick="resolveAssassin()">Assassinate</button>
  `);
}

function resolveAssassin() {
  const t = document.querySelector("input[name=kill]:checked");
  if (!t) return alert("Select one.");
  game.winningTeam = game.roles[t.value] === "Merlin" ? "Evil" : "Good";
  renderFinal();
}

/* ---------- FINAL ---------- */

function renderFinal() {
  render(`
    <h1>${game.winningTeam} Wins!</h1>
    <div class="card">
      ${game.originalPlayers.map(p=>`${p}: ${game.roles[p]}`).join("<br>")}
    </div>
  `);
}

renderSetup();
