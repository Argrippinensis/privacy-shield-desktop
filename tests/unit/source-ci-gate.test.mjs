import test from 'node:test';import assert from 'node:assert/strict';
import {sourceCIDecision} from '../../scripts/check-source-ci.mjs';
const sha='a'.repeat(40),other='b'.repeat(40);
const run=(overrides={})=>({id:1,head_sha:sha,path:'.github/workflows/ci.yml',created_at:'2026-10-27T10:00:00Z',status:'completed',conclusion:'success',run_attempt:1,html_url:'https://github.com/example/project/actions/runs/1',...overrides});
test('Release gate requires successful CI for the exact commit and expected workflow',()=>{
 assert.equal(sourceCIDecision([run()],sha).state,'passed');
 assert.equal(sourceCIDecision([run({head_sha:other})],sha).state,'waiting');
 assert.equal(sourceCIDecision([run({path:'.github/workflows/build.yml'})],sha).state,'waiting');
 assert.equal(sourceCIDecision([],sha).state,'waiting');
});
test('A newer pending or failed run never inherits an older passing result',()=>{
 const newer=run({id:2,created_at:'2026-10-27T11:00:00Z',status:'in_progress',conclusion:null});
 assert.equal(sourceCIDecision([run(),newer],sha).state,'waiting');
 assert.equal(sourceCIDecision([run(),{...newer,status:'completed',conclusion:'failure'}],sha).state,'failed');
});
test('Reruns, cancellation and unknown conclusions fail closed until actual success',()=>{
 for(const conclusion of ['failure','cancelled','timed_out','neutral','skipped',null])assert.equal(sourceCIDecision([run(),run({run_attempt:2,conclusion})],sha).state,'failed',String(conclusion));
 assert.equal(sourceCIDecision([run({run_attempt:2,status:'queued',conclusion:null}),run()],sha).state,'waiting');
 assert.equal(sourceCIDecision([run({conclusion:'failure'}),run({run_attempt:2})],sha).state,'passed');
});
