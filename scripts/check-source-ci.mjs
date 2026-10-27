// A release may build alongside CI, but publishing requires CI for its exact commit.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
export function sourceCIDecision(runs,sha){
 const matching=runs.filter(r=>r.head_sha===sha&&r.path==='.github/workflows/ci.yml').sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||Number(b.id)-Number(a.id)||(b.run_attempt||1)-(a.run_attempt||1));
 const run=matching[0];
 if(!run||run.status!=='completed')return {state:'waiting',runId:run?.id??null};
 return {state:run.conclusion==='success'?'passed':'failed',runId:run.id,conclusion:run.conclusion,url:run.html_url};
}
async function main(){
 const repo=process.env.GITHUB_REPOSITORY,sha=process.env.GITHUB_SHA;
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||! /^[0-9a-f]{40}$/.test(sha||''))throw Error('Repository oder exakter Commit fehlt.');
 for(let i=0;i<120;i++){
  const data=JSON.parse(execFileSync('gh',['api',`repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=100`],{encoding:'utf8',maxBuffer:4*1024*1024}));
  const decision=sourceCIDecision(data.workflow_runs,sha);
  console.log(`Source-CI ${sha}: ${decision.state}, Lauf ${decision.runId??'(noch nicht vorhanden)'}`);
  if(decision.state==='passed')return;
  if(decision.state==='failed')throw Error(`Source-CI nicht erfolgreich: ${decision.url} (${decision.conclusion})`);
  if(i<119)await delay(10000);
 }
 throw Error('Source-CI für den exakten Commit nach 20 Minuten nicht bestätigt; kein Release.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
