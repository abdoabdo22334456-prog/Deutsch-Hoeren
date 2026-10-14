(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Progress=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key=(lesson,index)=>lesson.id+'-'+index;
  const empty=()=>({version:3,answers:{},results:{},retries:{},reviews:{},last:null});
  const filled=(q,value)=>q.options?(q.multi?Array.isArray(value)&&value.length>0:Number.isInteger(value)):typeof value==='string'&&value.trim().length>0;
  const correct=(q,value)=>{const a=Array.isArray(value)?value:[value];return a.length===q.key.length&&q.key.every(n=>a.includes(n));};
  function cleanAnswers(ex,values){const out={};if(!values||typeof values!=='object')return out;ex.items.forEach((q,i)=>{const v=values[i];if(q.options){const valid=n=>Number.isInteger(n)&&n>=0&&n<q.options.length;if(q.multi&&Array.isArray(v)&&v.every(valid))out[i]=[...new Set(v)];else if(!q.multi&&valid(v))out[i]=v;}else if(typeof v==='string')out[i]=v.slice(0,20000);});return out;}
  function normalize(raw,course){
    if(!raw||![2,3].includes(raw.version)||!raw.answers||!raw.results||typeof raw.answers!=='object'||typeof raw.results!=='object')throw Error('Invalid progress');
    const state=empty();
    for(const l of course)l.exercises.forEach((ex,index)=>{
      const k=key(l,index),a=cleanAnswers(ex,raw.answers[k]);if(Object.keys(a).length)state.answers[k]=a;
      const old=raw.results[k];
      if(old&&old.kind===ex.mode&&ex.items.every((q,i)=>filled(q,a[i]))){
        let checks;
        if(ex.mode==='auto'&&(raw.version===2?Number.isInteger(old.score)&&old.score>=0&&old.score<=ex.items.length:Array.isArray(old.checks)&&old.checks.length===ex.items.length&&old.checks.every(v=>typeof v==='boolean')))checks=ex.items.map((q,i)=>correct(q,a[i]));
        else if(raw.version===2&&['good','review'].includes(old.rating))checks=ex.items.map(()=>old.rating==='good');
        else if(Array.isArray(old.checks)&&old.checks.length===ex.items.length&&old.checks.every(v=>typeof v==='boolean'))checks=[...old.checks];
        if(checks)state.results[k]={kind:ex.mode,checks};
      }
      const retry=raw.retries?.[k];
      if(state.results[k]&&retry&&Array.isArray(retry.indices)){
        const indices=[...new Set(retry.indices.filter(i=>Number.isInteger(i)&&i>=0&&i<ex.items.length&&state.results[k].checks[i]===false))];
        if(indices.length){const draft=cleanAnswers(ex,retry.answers);state.retries[k]={indices,answers:Object.fromEntries(indices.filter(i=>i in draft).map(i=>[i,draft[i]]))};}
      }
      const review=raw.reviews?.[k];
      if(ex.mode==='self'&&review&&typeof review==='object'){
        const indices=state.retries[k]?.indices||ex.items.map((_,i)=>i);
        state.reviews[k]=Object.fromEntries(indices.filter(i=>typeof review[i]==='boolean').map(i=>[i,review[i]]));
      }
    });
    const last=raw.last,l=course.find(l=>l.id===last?.id);
    if(l&&Number.isInteger(last.index)&&last.index>=0&&last.index<l.exercises.length)state.last={id:l.id,index:last.index,review:!!last.review};
    return state;
  }
  function stats(state,l){let total=0,answered=0,reviewed=0,right=0,wrong=0,exercises=0; l.exercises.forEach((ex,index)=>{const k=key(l,index),r=state.results[k],a=state.answers[k]||{};total+=ex.items.length;answered+=ex.items.filter((q,i)=>filled(q,a[i])||typeof r?.checks[i]==='boolean').length;if(r){exercises++;reviewed+=ex.items.length;right+=r.checks.filter(Boolean).length;wrong+=r.checks.filter(v=>v===false).length;}});return{total,answered,reviewed,right,wrong,exercises,complete:exercises===l.exercises.length,started:answered>0,percent:total?Math.round(answered/total*100):0};}
  function wrongIndices(state,l,index){return(state.results[key(l,index)]?.checks||[]).flatMap((ok,i)=>ok===false?[i]:[]);}
  function startRetry(state,l,index){const k=key(l,index);if(state.retries[k])return state.retries[k];const indices=wrongIndices(state,l,index);if(!indices.length)return null;delete state.reviews[k];return state.retries[k]={indices,answers:{}};}
  function indices(state,l,index){return state.retries[key(l,index)]?.indices||l.exercises[index].items.map((_,i)=>i);}
  function values(state,l,index){const k=key(l,index);return state.retries[k]?.answers||state.answers[k]||{};}
  function setAnswer(state,l,index,i,value){const k=key(l,index),retry=state.retries[k];if(retry&&!retry.indices.includes(i))return;if(!retry&&state.results[k])return;const target=retry?retry.answers:(state.answers[k]??={});target[i]=value;delete state.reviews[k];}
  function commit(state,l,index,ratings){
    const ex=l.exercises[index],k=key(l,index),selected=indices(state,l,index),a=values(state,l,index);
    if(state.results[k]&&!state.retries[k])return state.results[k];
    if(selected.some(i=>!filled(ex.items[i],a[i])))throw Error('Unanswered questions');
    if(ex.mode==='self'&&selected.some(i=>typeof ratings?.[i]!=='boolean'))throw Error('Missing self ratings');
    const checks=state.results[k]?[...state.results[k].checks]:Array(ex.items.length).fill(false);
    state.answers[k]??={};selected.forEach(i=>{state.answers[k][i]=a[i];checks[i]=ex.mode==='auto'?correct(ex.items[i],a[i]):ratings[i];});
    state.results[k]={kind:ex.mode,checks};delete state.retries[k];delete state.reviews[k];return state.results[k];
  }
  function resumeIndex(state,l){if(state.last?.id===l.id&&(!state.results[key(l,state.last.index)]||state.retries[key(l,state.last.index)]))return state.last.index;const i=l.exercises.findIndex((_,i)=>!state.results[key(l,i)]);return i<0?0:i;}
  return{empty,key,filled,correct,normalize,stats,wrongIndices,startRetry,indices,values,setAnswer,commit,resumeIndex};
});
