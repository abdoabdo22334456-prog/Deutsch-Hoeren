'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],P=Progress;
// Keep the original key to upgrade existing progress in place.
const KEY='deutsch-hoeren-text-v2';
let level='B1',page='active',lesson=null,exIndex=0,reviewLesson=false,visible=[],store=P.empty();
try{const raw=localStorage.getItem(KEY);if(raw)store=P.normalize(JSON.parse(raw),COURSE);}catch{}
level=COURSE.find(l=>l.id===store.last?.id)?.level||'B1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(s){$('#toast').textContent=s;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store));}catch{toast('الحفظ التلقائي غير متاح. استخدم «حفظ نسخة من تقدمي».');}}
function exKey(){return P.key(lesson,exIndex);}function current(){return lesson.exercises[exIndex];}
function progressMarkup(s){return '<span class="progress-caption">'+s.answered+' / '+s.total+' سؤال · '+s.percent+'٪</span><progress max="'+s.total+'" value="'+s.answered+'" aria-label="تمت الإجابة عن '+s.answered+' من '+s.total+' سؤال"></progress>';}
function renderHome(){
  const search=$('#search').value.toLocaleLowerCase(),all=COURSE.filter(l=>l.level===level),done=all.filter(l=>P.stats(store,l).complete).length;
  const items=all.filter(l=>P.stats(store,l).complete===(page==='completed')&&[l.title,l.group,l.id,l.chapter].join(' ').toLocaleLowerCase().includes(search));
  $('#hero').hidden=page==='completed';$('#catalog-title').textContent=page==='completed'?'الدروس المنتهية':'دروسي الحالية';
  $('#catalog-note').textContent=page==='completed'?'دروسك محفوظة هنا. تقدر تراجع الأخطاء فقط في أي وقت.':'الدروس اللي تخلصها بتنتقل تلقائيًا لصفحة المنتهي.';
  $('#overall').textContent=page==='completed'?done+' درس منتهي':(all.length-done)+' درس متبقي · '+done+' من '+all.length+' منتهي';
  $$('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false');});
  $$('[data-level]').forEach(b=>{b.classList.toggle('active',b.dataset.level===level);b.setAttribute('aria-pressed',b.dataset.level===level);});
  const list=$('#lessons');list.innerHTML='';let group='';
  for(const l of items){
    if(l.group!==group){group=l.group;const heading=document.createElement('h3');heading.className='group-title';heading.dir='ltr';heading.innerHTML='<span>'+esc(l.chapter)+'</span>'+esc(group);list.append(heading);const cards=document.createElement('div');cards.className='cards';list.append(cards);}
    const s=P.stats(store,l),card=document.createElement('article');card.className='card';card.dataset.lesson=l.id;
    card.innerHTML='<span class="card-top"><span>'+esc(l.level+' · '+l.id.split('-')[1])+'</span><span class="state-badge">'+(s.complete?'منتهي ✓':s.started?'قيد التقدم':'لم تبدأ')+'</span></span><h3 dir="ltr">'+esc(l.title)+'</h3>'+progressMarkup(s)+'<span class="review-count">تمت مراجعة '+s.exercises+' / '+l.exercises.length+' تدريب</span><div class="card-bottom"><span class="status">'+(s.complete?(s.wrong?s.wrong+' سؤال للمراجعة':'كل الإجابات صحيحة ✓'):s.answered===s.total?'باقي مراجعة الإجابات':'محفوظ تلقائيًا')+'</span></div><div class="card-actions"><button class="open-lesson">'+(s.complete?'عرض الدرس':s.started?'كمّل من مكانك ←':'ابدأ ←')+'</button>'+(s.complete&&s.wrong?'<button class="primary review-wrong">راجع الغلط فقط ('+s.wrong+')</button>':'')+'</div>';
    card.querySelector('.open-lesson').onclick=()=>openLesson(l.id,P.resumeIndex(store,l));
    if(s.complete&&s.wrong)card.querySelector('.review-wrong').onclick=()=>startLessonReview(l.id);
    list.lastElementChild.append(card);
  }
  if(!items.length)list.innerHTML='<p class="empty">'+(search?'مفيش دروس مطابقة للبحث.':page==='completed'?'أول درس تخلصه هيتحفظ هنا.':'خلصت كل دروس المستوى ✓ تقدر تلاقيها في صفحة المنتهي.')+'</p>';
  const active=all.filter(l=>!P.stats(store,l).complete),started=active.some(l=>P.stats(store,l).started);
  $('#continue').disabled=!active.length;$('#continue').textContent=started?'كمّل من مكانك ←':'ابدأ التدريب ←';
}
function home(destination=page){page=destination;$('#audio').pause();$('#study').hidden=true;$('#home').hidden=false;renderHome();window.scrollTo(0,0);}
function openLesson(id,idx=0,review=false){
  lesson=COURSE.find(l=>l.id===id);if(!lesson)return;level=lesson.level;reviewLesson=review;exIndex=Math.min(Math.max(idx,0),lesson.exercises.length-1);
  $('#home').hidden=true;$('#study').hidden=false;$('#lesson-meta').textContent=lesson.level+' · '+lesson.group;$('#lesson-title').textContent=lesson.title;
  $('#practice').hidden=true;$('#s1').classList.add('active');$('#s2').classList.remove('active');$('#audio-error').hidden=true;
  renderExercise();window.scrollTo(0,0);
}
function startLessonReview(id){
  const l=COURSE.find(l=>l.id===id);if(!l)return;const last=store.last?.id===id&&store.last.review?store.last.index:-1;
  const index=last>=0&&P.wrongIndices(store,l,last).length?last:l.exercises.findIndex((_,i)=>P.wrongIndices(store,l,i).length);
  if(index<0){toast('كل إجابات الدرس صحيحة ✓');return;}P.startRetry(store,l,index);save();openLesson(id,index,true);showPractice(false);
}
function showPractice(scroll=true){$('#practice').hidden=false;$('#s2').classList.add('active');if(scroll)$('#practice').scrollIntoView({behavior:'smooth',block:'start'});}
function loadAudio(){const a=$('#audio');a.pause();a.src=current().audio||lesson.audio;a.playbackRate=Number($('#speed').value);a.load();$('#audio-error').hidden=true;$('#audio-note').textContent='المقطع الخاص بالدرس · تقدر تسمعه أكتر من مرة';}
function images(sel,paths,alt){$(sel).innerHTML='';for(const p of paths){const img=new Image();img.src=p;img.alt=alt;img.loading='lazy';img.onclick=()=>{$('#zoom img').src=p;$('#zoom').showModal();};$(sel).append(img);}}
function updateStudyProgress(){
  const s=P.stats(store,lesson);$('#lesson-progress').innerHTML=progressMarkup(s)+'<span>تمت مراجعة '+s.exercises+' من '+lesson.exercises.length+' تدريب'+(s.complete?' · منتهي ومحفوظ ✓':' · قيد التقدم')+'</span>';
  $('#completion').hidden=!s.complete;$('#completion-note').textContent=s.wrong?'الدرس اتحفظ في صفحة المنتهي واختفى من دروسك الحالية. باقي '+s.wrong+' سؤال تقدر تعيدهم لو حبيت.':'الدرس اتحفظ في صفحة المنتهي. كل إجاباتك صحيحة ✓';
  $('#lesson-retry').hidden=!s.wrong;$('#lesson-retry').textContent='إعادة أخطاء الدرس فقط ('+s.wrong+')';$('#back').textContent=page==='completed'?'→ المنتهي':'→ دروسي الحالية';
}
function renderExercise(){
  store.last={id:lesson.id,index:exIndex,review:reviewLesson};save();const e=current(),retry=store.retries[exKey()],result=store.results[exKey()],locked=!!result&&!retry;
  visible=P.indices(store,lesson,exIndex).slice();if($('#audio').getAttribute('src')!==(e.audio||lesson.audio))loadAudio();
  $('#exercise-tabs').innerHTML=lesson.exercises.map((x,i)=>{if(reviewLesson&&i!==exIndex&&!P.wrongIndices(store,lesson,i).length)return '';return '<button data-ex="'+i+'" class="'+(i===exIndex?'active':'')+'">'+esc(x.label)+(store.results[P.key(lesson,i)]?' ✓':'')+'</button>';}).join('');
  $$('[data-ex]').forEach(b=>b.onclick=()=>{exIndex=Number(b.dataset.ex);if(reviewLesson)P.startRetry(store,lesson,exIndex);renderExercise();});
  $('#page-label').textContent='صفحة '+e.pages.join('، ');$('#mode-label').textContent=e.mode==='auto'?'تصحيح تلقائي':'تقييم كل إجابة بعد المقارنة';
  $('#answer-hint').textContent=retry?'بتعيد '+visible.length+' سؤال غلط فقط. الإجابات الصح محفوظة.':locked?'إجاباتك وتقييمك محفوظين. لو فيه أخطاء، تقدر تعيدها لوحدها.':e.mode==='auto'?'اقرأ السؤال واختار الإجابة حسب التسجيل. إجاباتك بتتحفظ أول بأول.':'اكتب إجابتك بالألماني، ثم قارنها بالنموذج وحدد الصح والغلط لكل سؤال.';
  $('#retry-banner').hidden=!retry;$('#retry-banner').textContent='مراجعة الغلط فقط · '+visible.length+' سؤال من '+e.items.length;
  images('#question-images',e.images,'رسم التمرين '+e.label);images('#model-images',e.solutions,'حل '+e.label);$('#model-text').textContent=e.modelText||'';
  $('#source-panel').hidden=!e.images.length&&!e.passage;$('.practice-grid').classList.toggle('text-only',!e.images.length);$('#passage-box').hidden=!e.passage;$('#passage').textContent=e.passage||'';$('#passage-box').open=false;$('#instruction').textContent=e.instruction||'';
  const values=P.values(store,lesson,exIndex);
  $('#answers').innerHTML=visible.map(i=>{const q=e.items[i],v=values[i];const content=q.options?q.options.map((opt,j)=>'<label><input type="'+(q.multi?'checkbox':'radio')+'" name="q'+i+'" value="'+j+'" '+((Array.isArray(v)?v.includes(j):v===j)?'checked ':'')+(locked?'disabled ':'')+'>'+esc(opt)+'</label>').join(''):'<textarea name="q'+i+'" aria-label="'+esc(q.label||('السؤال '+(i+1)))+'" placeholder="Deine Antwort …" '+(locked?'readonly':'')+'>'+esc(typeof v==='string'?v:'')+'</textarea>';return '<fieldset class="answer-row" data-q="'+i+'"><legend>'+esc(q.label||('Frage '+(i+1)))+'</legend>'+(q.image?'<img class="question-art" src="'+esc(q.image)+'" alt="'+esc(q.label)+'">':'')+'<p class="question-text">'+esc(q.prompt||'')+'</p>'+content+'</fieldset>';}).join('');
  $$('.question-art').forEach(img=>img.onclick=()=>{$('#zoom img').src=img.src;$('#zoom').showModal();});
  $('#answers').oninput=$('#answers').onchange=()=>{if(locked)return;readAnswers();save();clearResult();$('#check').hidden=false;updateStudyProgress();$('#draft-note').textContent='تم حفظ إجاباتك تلقائيًا ✓';};
  clearResult();$('#draft-note').textContent=locked?'التقييم محفوظ ✓':'إجاباتك بتتحفظ تلقائيًا، وتقدر ترجع تكمل في أي وقت.';
  $('#check').hidden=locked;$('#check').textContent=e.mode==='auto'?'راجع إجاباتي':'اعرض النموذج وقيّم إجاباتي';
  if(locked)showResult();else if(e.mode==='self'&&store.reviews[exKey()])showSelfReview();updateStudyProgress();
}
function readAnswers(){for(const i of visible){const q=current().items[i];let v;if(q.options){const checked=$$('[name="q'+i+'"]:checked').map(x=>Number(x.value));v=q.multi?checked:checked[0]??null;}else v=$('[name="q'+i+'"]').value;P.setAnswer(store,lesson,exIndex,i,v);}}
function clearResult(){
  $('#result').textContent='';$('#model').hidden=true;$('#self-grade').hidden=true;$('#self-grade').innerHTML='';$('#retry').hidden=true;$('#nextExercise').hidden=true;$('#s3').classList.remove('active');
  $$('.answer-row').forEach(r=>{r.classList.remove('correct','wrong');r.querySelector('.feedback')?.remove();});
}
function showResult(){
  const e=current(),r=store.results[exKey()];if(!r)return;const score=visible.filter(i=>r.checks[i]).length;
  for(const i of visible){const q=e.items[i],ok=r.checks[i],row=$('[data-q="'+i+'"]');row.classList.toggle('correct',ok);row.classList.toggle('wrong',!ok);row.querySelector('.feedback')?.remove();const f=document.createElement('span');f.className='feedback';f.textContent=ok?'✓ Richtig':e.mode==='auto'?'Richtige Antwort: '+q.key.map(k=>q.options[k]).join(' + '):'محدد للمراجعة حسب تقييمك';row.append(f);row.querySelectorAll('input').forEach(input=>input.disabled=true);row.querySelectorAll('textarea').forEach(input=>input.readOnly=true);}
  $('#result').textContent=(e.mode==='auto'?'نتيجتك: ':'حسب تقييمك: ')+score+' / '+visible.length+' إجابة صحيحة · تم الحفظ';
  $('#model').hidden=!(e.modelText||e.solutions.length);$('#self-grade').hidden=true;$('#check').hidden=true;$('#s3').classList.add('active');
  const wrong=P.wrongIndices(store,lesson,exIndex).length;$('#retry').hidden=!wrong;$('#retry').textContent='إعادة الغلط في التدريب ده فقط ('+wrong+')';
  $('#nextExercise').hidden=false;$('#nextExercise').textContent=reviewLesson?(lesson.exercises.some((_,i)=>i!==exIndex&&P.wrongIndices(store,lesson,i).length)?'أخطاء التدريب التالي ←':'رجوع للمنتهي ←'):lesson.exercises.some((_,i)=>!store.results[P.key(lesson,i)])?'كمّل التدريب التالي ←':(page==='completed'||P.stats(store,lesson).complete?'رجوع للمنتهي ←':'رجوع لدروسي الحالية ←');updateStudyProgress();
}
function check(){
  readAnswers();save();const e=current(),a=P.values(store,lesson,exIndex),missing=visible.find(i=>!P.filled(e.items[i],a[i]));
  if(missing!==undefined){const label=e.items[missing].label||('السؤال '+(missing+1));toast('جاوب على كل الأسئلة المعروضة الأول؛ '+label+' لسه فاضي.');$('[data-q="'+missing+'"] input, [data-q="'+missing+'"] textarea')?.focus();return;}
  if(e.mode==='auto'){P.commit(store,lesson,exIndex);save();showResult();}else{store.reviews[exKey()]??={};save();showSelfReview();}
}
function showSelfReview(){
  $('#model').hidden=false;$('#self-grade').hidden=false;$('#check').hidden=true;$('#result').textContent='قارن إجاباتك بالنموذج، وقيّم كل سؤال عشان نحتفظ بالغلط فقط.';
  const ratings=store.reviews[exKey()]||{};
  $('#self-grade').innerHTML='<p>اختلاف الصياغة مقبول لو المعنى صحيح. التقييم هنا بتحدده بنفسك.</p>'+visible.map(i=>'<fieldset class="self-rating"><legend dir="ltr">'+esc(current().items[i].label||('Frage '+(i+1)))+'</legend><p dir="ltr">'+esc(current().items[i].prompt)+'</p><label><input type="radio" name="rating'+i+'" data-rating="'+i+'" value="true" '+(ratings[i]===true?'checked':'')+'> إجابتي صحيحة</label><label><input type="radio" name="rating'+i+'" data-rating="'+i+'" value="false" '+(ratings[i]===false?'checked':'')+'> محتاج أعيده</label></fieldset>').join('')+'<button class="primary wide" id="save-self">حفظ التقييم</button>';
  $$('[data-rating]').forEach(input=>input.onchange=()=>{store.reviews[exKey()]??={};store.reviews[exKey()][Number(input.dataset.rating)]=input.value==='true';save();});
  $('#save-self').onclick=()=>{const ratings=store.reviews[exKey()]||{};if(visible.some(i=>typeof ratings[i]!=='boolean')){toast('حدد تقييم كل سؤال الأول.');return;}P.commit(store,lesson,exIndex,ratings);save();showResult();};
}
function nextExercise(){
  let index;if(reviewLesson){const candidates=lesson.exercises.map((_,i)=>i).filter(i=>i!==exIndex&&P.wrongIndices(store,lesson,i).length);index=candidates.find(i=>i>exIndex)??candidates[0];if(index===undefined){home(P.stats(store,lesson).complete?'completed':'active');return;}P.startRetry(store,lesson,index);}
  else{const candidates=lesson.exercises.map((_,i)=>i).filter(i=>!store.results[P.key(lesson,i)]);index=candidates.find(i=>i>exIndex)??candidates[0];if(index===undefined){home(page==='completed'?'completed':(P.stats(store,lesson).complete?'completed':'active'));return;}}
  exIndex=index;renderExercise();showPractice();
}
function nextLesson(){const list=COURSE.filter(l=>l.level===level&&l.id!==lesson.id&&(page==='completed'?P.stats(store,l).complete:!P.stats(store,l).complete)),currentIndex=COURSE.indexOf(lesson),next=list.find(l=>COURSE.indexOf(l)>currentIndex)||list[0];if(next)openLesson(next.id,P.resumeIndex(store,next));else{home(page);toast(page==='completed'?'وصلت لآخر درس في المنتهي.':'خلصت دروس المستوى. هتلاقيها في المنتهي.');}}
$('#answers').onsubmit=e=>e.preventDefault();$('#check').onclick=check;$('#answer-now').onclick=()=>showPractice();
$('#replay').onclick=()=>{$('#audio').currentTime=0;$('#audio').play().catch(()=>toast('اضغط تشغيل من مشغل الصوت.'));};
$('#rewind').onclick=()=>$('#audio').currentTime=Math.max(0,$('#audio').currentTime-10);$('#speed').onchange=()=>$('#audio').playbackRate=Number($('#speed').value);$('#audio').onerror=()=>$('#audio-error').hidden=false;$('#audio').onended=()=>showPractice(false);
$('#retry').onclick=()=>{P.startRetry(store,lesson,exIndex);save();renderExercise();showPractice();};$('#lesson-retry').onclick=()=>startLessonReview(lesson.id);
$('#nextExercise').onclick=nextExercise;$('#nextLesson').onclick=nextLesson;$('#back').onclick=()=>home();$('.brand').onclick=e=>{e.preventDefault();home('active');};
$$('[data-page]').forEach(b=>b.onclick=()=>home(b.dataset.page));$('#go-completed').onclick=()=>home('completed');$('#go-active').onclick=()=>home('active');
$$('[data-level]').forEach(b=>b.onclick=()=>{level=b.dataset.level;renderHome();});$('#search').oninput=renderHome;
$('#continue').onclick=()=>{const active=COURSE.filter(l=>l.level===level&&!P.stats(store,l).complete);const l=active.find(l=>l.id===store.last?.id)||active.find(l=>P.stats(store,l).started)||active[0];if(l)openLesson(l.id,P.resumeIndex(store,l));};
$('#closeZoom').onclick=()=>$('#zoom').close();$('#zoom').onclick=e=>{if(e.target===$('#zoom'))$('#zoom').close();};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(store,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='deutsch-hoeren-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
$('#import').onchange=async ev=>{try{const f=ev.target.files[0];if(!f)return;if(f.size>5000000)throw Error();store=P.normalize(JSON.parse(await f.text()),COURSE);level=COURSE.find(l=>l.id===store.last?.id)?.level||level;save();home('active');toast('تمت استعادة الإجابات والدروس المنتهية والمراجعات');}catch{toast('ملف التقدم غير صالح. اختار النسخة المحفوظة من البرنامج.');}ev.target.value='';};
renderHome();
