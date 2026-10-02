document.querySelector('.menu-toggle').addEventListener('click',()=>{const nav=document.querySelector('#mobile-nav'),open=nav.hidden;nav.hidden=!open;document.querySelector('.menu-toggle').setAttribute('aria-expanded',String(open));});
document.querySelectorAll('#mobile-nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('#mobile-nav').hidden=true;document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');}));
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const labels={photos:'fotografier',persons:'personer',properties:'fastigheter',organizations:'verksamheter'};
const singular={photos:'bild',persons:'person',properties:'fastighet',organizations:'organisation'};
const idFields={photos:'photo_id',persons:'person_id',properties:'property_id',organizations:'organization_id'};
const dataCache={},promises={};let kind='photos',page=1,filtered=[],readerRequest=0,previousFocus=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleOf=(r,k)=>k==='photos'?(r.short_description||r.title):k==='persons'?r.fullname:k==='properties'?(r.address||r.cadastral_id):r.name;
const dateOf=r=>[r.date_from||r.date_of_birth||r.operation_years_from,r.date_to||r.date_of_death||r.operation_years_to].filter(Boolean).filter((v,i,a)=>i===0||v!==a[0]).join('–');
const imageOf=r=>[381,1476,759,124,782,761,625].includes(Number(r.photo_id))?'assets/'+(Number(r.photo_id)===381?'vannashistoria.jpg':'photo-'+r.photo_id+'.jpg'):'https://vannashistoria.se'+encodeURI(r.url||'/photos/'+r.filename);
async function getData(k){if(dataCache[k])return dataCache[k];if(!promises[k])promises[k]=fetch('data/'+k+'.json').then(r=>{if(!r.ok)throw Error('load');return r.json()}).then(d=>dataCache[k]=d).catch(e=>{delete promises[k];throw e});return promises[k]}
function plain(html){const doc=new DOMParser().parseFromString(html||'','text/html');return doc.body.textContent||''}
function safeMarkup(markup){
 const doc=new DOMParser().parseFromString(markup||'','text/html');
 const allowed=new Set(['P','A','EM','STRONG','H2','H3','H4','H5','HR','BR','OL','UL','LI','BLOCKQUOTE','TABLE','THEAD','TBODY','TR','TD','TH']);
 doc.querySelectorAll('script,style,iframe,object,form,input,button').forEach(e=>e.remove());
 Array.from(doc.body.querySelectorAll('*')).reverse().forEach(e=>{
  if(!allowed.has(e.tagName)){e.replaceWith(...e.childNodes);return}
  const href=e.getAttribute('href');Array.from(e.attributes).forEach(a=>e.removeAttribute(a.name));
  if(e.tagName==='A'&&href){try{let normalized=href.replace(/organisatiion|organisaton|företag|f%C3%B6retag/gi,'organisation').replace(/fatighet/gi,'fastighet').replace(/personn/gi,'person');
   const url=new URL(normalized,'https://vannashistoria.se');if(!['http:','https:','mailto:','tel:'].includes(url.protocol))return;
   const match=url.hostname==='vannashistoria.se'&&decodeURIComponent(url.pathname).match(/\/(bild|person|fastighet|organisation)\/\(?(\d+)(?:\D|$)/i);
   if(match){e.href='#'+match[1].toLowerCase()+'/'+match[2];e.dataset.record=match[1].toLowerCase()+'/'+match[2]}
   else{e.href=url.href;if(url.protocol.startsWith('http')){e.target='_blank';e.rel='noopener noreferrer'}}
  }catch{}}
 });return doc.body.innerHTML;
}
const pageSize=12;
async function selectKind(next,focus=false){
 kind=next;page=1;$$('[data-kind]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.kind===kind));b.tabIndex=b.dataset.kind===kind?0:-1;if(focus&&b.dataset.kind===kind)b.focus()});
 $('#archive-results').setAttribute('aria-labelledby','tab-'+kind);$('#archive-results').setAttribute('aria-busy','true');
 $('#result-count').textContent='Läser in '+labels[kind]+'…';
 try{await getData(kind);if(kind===next)renderArchive()}catch{$('#archive-results').innerHTML='<div class="empty-state"><h3>Samlingen kunde inte hämtas.</h3><p>Försök igen, eller besök <a href="https://vannashistoria.se">originalarkivet</a>.</p><button class="text-link" id="retry-archive">Försök igen</button></div>';$('#retry-archive').onclick=()=>selectKind(kind)}
 finally{$('#archive-results').setAttribute('aria-busy','false')}
}
function renderArchive(){
 const query=$('#archive-search').value.trim().toLocaleLowerCase('sv');
 const all=dataCache[kind]||[];
 filtered=all.filter(r=>!query||[titleOf(r,kind),r.keywords,r.title,r.address,r.cadastral_id,r.biography,r.description,plain(r.html_biography||r.html_description)].filter(Boolean).join(' ').toLocaleLowerCase('sv').includes(query));
 const sort=$('#archive-sort').value;
 if(sort==='az')filtered.sort((a,b)=>titleOf(a,kind).localeCompare(titleOf(b,kind),'sv'));
 else if(sort==='old'||sort==='new')filtered.sort((a,b)=>{let x=parseInt(dateOf(a)),y=parseInt(dateOf(b));return(!Number.isFinite(x)?1:!Number.isFinite(y)?-1:(x-y)*(sort==='new'?-1:1))});
 else if(kind==='photos'&&!query){const featured=[759,1476,381,625,124,782,761,1775,1774,1773,789];filtered.sort((a,b)=>{const x=featured.indexOf(Number(a.photo_id)),y=featured.indexOf(Number(b.photo_id));return(x<0?9999:x)-(y<0?9999:y)})}
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
 $('#result-count').textContent=filtered.length.toLocaleString('sv-SE')+' '+labels[kind]+(query?' matchar ”'+$('#archive-search').value.trim()+'”':' i samlingen');
 $('#clear-search').hidden=!query;
 const items=filtered.slice((page-1)*pageSize,page*pageSize);
 const rows=items.map(r=>{
  const id=r[idFields[kind]],title=esc(titleOf(r,kind));
  if(kind==='photos')return '<button class="archive-card" data-record="bild/'+id+'"><img class="archive-img" src="'+esc(imageOf(r))+'" alt="'+title+'" loading="lazy" width="320" height="210"><h3>'+title+'</h3><p>'+esc(dateOf(r)||'Årtal ej fastställt')+'</p></button>';
  const subtitle=kind==='persons'?[r.title,dateOf(r)].filter(Boolean).join(' · '):kind==='properties'?[r.cadastral_id,r.neighbourhood_1899].filter(Boolean).join(' · '):dateOf(r)||'Ur verksamhetsarkivet';
  return '<button class="archive-row" data-record="'+singular[kind]+'/'+id+'"><h3>'+title+'</h3><p>'+esc(subtitle)+'</p><span>Läs mer</span></button>';
 }).join('');
 $('#archive-results').innerHTML=items.length?'<div class="'+(kind==='photos'?'archive-grid':'archive-list')+'">'+rows+'</div>':'<div class="empty-state"><h3>Inga träffar den här gången.</h3><p>Prova ett efternamn, en kortare stavning eller en annan del av samlingen.</p></div>';
 $('#page-info').textContent='Sida '+page+' av '+pages;$('#prev-page').disabled=page<=1;$('#next-page').disabled=page>=pages;
}
$$('[data-kind]').forEach(b=>b.onclick=()=>selectKind(b.dataset.kind));
$$('[role=tablist]').forEach(list=>list.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=Array.from(list.querySelectorAll('[role=tab]'));let ix=tabs.indexOf(document.activeElement);if(ix<0)return;e.preventDefault();ix=e.key==='Home'?0:e.key==='End'?tabs.length-1:(ix+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[ix].focus();tabs[ix].click()}));
let searchTimer;$('#archive-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;renderArchive()},160)});
$('#archive-sort').onchange=()=>{page=1;renderArchive()};$('#clear-search').onclick=()=>{$('#archive-search').value='';page=1;renderArchive();$('#archive-search').focus()};
$('#prev-page').onclick=()=>{page--;renderArchive();$('#samlingen').scrollIntoView()};$('#next-page').onclick=()=>{page++;renderArchive();$('#samlingen').scrollIntoView()};
const reader=$('#reader');
function showReader(){if(!reader.open){previousFocus=document.activeElement;reader.showModal();document.body.style.overflow='hidden'}reader.scrollTop=0}
function closeReader(){readerRequest++;reader.close();document.body.style.overflow='';if(location.hash.match(/^#(bild|person|fastighet|organisation)\//))history.replaceState(null,'','#samlingen');previousFocus?.focus({preventScroll:true})}
$('.close-reader').onclick=closeReader;reader.addEventListener('cancel',e=>{e.preventDefault();closeReader()});reader.addEventListener('click',e=>{if(e.target===reader){const r=reader.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeReader()}});
async function openRecord(type,id,updateHash=true){
 const k=Object.keys(singular).find(k=>singular[k]===type);if(!k)return;
 const request=++readerRequest;
 $('#reader-body').innerHTML='<h2 id="reader-title" class="reader-loading">Öppnar berättelsen…</h2>';showReader();
 if(updateHash)history.pushState(null,'','#'+type+'/'+id);
 try{
  const records=await getData(k);const r=records.find(x=>Number(x[idFields[k]])===Number(id));
  if(request!==readerRequest)return;
  if(!r){$('#reader-body').innerHTML='<h2 id="reader-title">Uppgiften finns i originalarkivet.</h2><p>Den här hänvisningen saknar en post i den tillgängliga samlingen.</p><a class="text-link" href="https://vannashistoria.se/'+type+'/'+Number(id)+'" target="_blank" rel="noopener">Öppna originalets hänvisning</a>';return}
  const title=titleOf(r,k),rich=r.html_biography||r.html_description;
  const description=rich?safeMarkup(rich):'<p>'+esc(r.biography||r.description||'Ingen utförligare beskrivning har registrerats för den här posten.')+'</p>';
  $('#reader-body').innerHTML='<p class="reader-kicker">'+esc(labels[k])+' · Vännäs historia</p><h2 id="reader-title" class="reader-title">'+esc(title)+'</h2><div class="reader-meta">'+[dateOf(r),r.cadastral_id,r.title&&k==='persons'?r.title:null,r.place_of_birth?'Födelseort: '+r.place_of_birth:null,r.neighbourhood_1899?'Kvarter 1899: '+r.neighbourhood_1899:null,r.lot_number_1899?'Tomtnummer 1899: '+r.lot_number_1899:null,r.neighbourhood?'Kvarter: '+r.neighbourhood:null].filter(Boolean).map(v=>'<span>'+esc(v)+'</span>').join('')+'</div>'+(k==='photos'?'<img class="reader-image" src="'+esc(imageOf(r))+'" alt="'+esc(title)+'">':'')+'<div class="reader-copy">'+description+'</div><div id="record-relations"></div><a class="reader-source" href="https://vannashistoria.se/'+type+'/'+Number(id)+'" target="_blank" rel="noopener">Källa: visa posten i originalarkivet</a>';
  loadRelations(k,id,request);
 }catch{if(request===readerRequest)$('#reader-body').innerHTML='<h2 id="reader-title">Berättelsen kunde inte öppnas.</h2><p>Kontrollera anslutningen och försök igen.</p><a class="text-link" href="https://vannashistoria.se/'+type+'/'+Number(id)+'" target="_blank" rel="noopener">Läs i originalarkivet</a>'}
}
async function loadRelations(k,id,request){
 try{
  const relations=await getData('relations');const refs=await getData('references');const rel=relations[k]?.[id];if(!rel||request!==readerRequest)return;
  const kinds=['persons','properties','organizations'];for(const rk of kinds)if(rel[rk]?.length)await getData(rk);
  if(rel.photos?.length)await getData('photos');
  if(request!==readerRequest)return;
  let html='';
  for(const rk of kinds){const ids=rel[rk];if(!ids?.length)continue;html+='<div class="reader-related"><h3>'+({persons:'Personer med koppling till bilden',properties:'Fastigheter i bilden',organizations:'Verksamheter i bilden'}[rk])+'</h3><div class="related-links">'+ids.map(id=>{const item=dataCache[rk].find(x=>Number(x[idFields[rk]])===Number(id));return item?'<button data-record="'+singular[rk]+'/'+id+'">'+esc(titleOf(item,rk))+'</button>':''}).join('')+'</div></div>'}
  if(rel.photographer){rel.photographers=[rel.photographer];await getData('persons');html+='<div class="reader-related"><h3>Fotograf</h3><div class="related-links">'+rel.photographers.map(v=>{const pid=typeof v==='object'?v.person_id:v,p=dataCache.persons.find(x=>Number(x.person_id)===Number(pid));return p?'<button data-record="person/'+pid+'">'+esc(p.fullname)+'</button>':esc(typeof v==='object'?v.fullname||'':v)}).join('')+'</div></div>'}
  if(rel.photos?.length){html+='<div class="reader-related"><h3>Fotografier med koppling till berättelsen</h3><div class="related-photos">'+rel.photos.map(id=>{const p=dataCache.photos.find(r=>Number(r.photo_id)===Number(id));return p?'<button data-record="bild/'+id+'"><img src="'+esc(imageOf(p))+'" alt="" loading="lazy">'+esc(titleOf(p,'photos'))+'</button>':''}).join('')+'</div></div>'}
  if(rel.transactions){const tx=Array.isArray(rel.transactions)?rel.transactions:[rel.transactions];html+='<details class="references"><summary>Fastighetens överlåtelser</summary><div class="reader-copy">'+tx.map(t=>'<p>'+[['Förvärvsår',t.year_for_acquisition],['Areal',t.square_meters?t.square_meters+' m²':null],['Köpeskilling',t.price],['Avgift per år',t.price_per_year]].filter(v=>v[1]).map(v=>esc(v[0]+': '+v[1])).join('<br>')+'</p>').join('');for(const role of ['buyers','sellers'])if(rel[role]?.length){html+='<p><strong>'+(role==='buyers'?'Köpare':'Säljare')+'</strong></p><div class="related-links">'+rel[role].map(r=>{const rid=r.buyer_id||r.seller_id,rt=(r.type_of_buyer||r.type_of_seller)==='Person'?'person':'organisation';return '<button data-record="'+rt+'/'+rid+'">'+esc(r.name)+'</button>'}).join('')+'</div>'}html+='</div></details>'}
  if(rel.references?.length)html+='<details class="references"><summary>Källhänvisningar ('+rel.references.length+')</summary><ol>'+rel.references.map(id=>{const r=refs[id];return r?'<li>'+esc([r.firstname,r.lastname,r.title,r.year_of_publication,r.edition,r.publisher,r.place_of_publication].filter(Boolean).join(', '))+'</li>':''}).join('')+'</ol></details>';
  if(request===readerRequest)$('#record-relations').innerHTML=html;
 }catch{if(request===readerRequest&&$('#record-relations'))$('#record-relations').innerHTML='<p class="source-note">Fördjupande hänvisningar kan läsas i originalarkivet.</p>'}
}
async function openPage(name){const request=++readerRequest;$('#reader-body').innerHTML='<h2 id="reader-title">Läser in…</h2>';showReader();try{const pages=await getData('pages');if(request!==readerRequest)return;$('#reader-body').innerHTML='<h2 id="reader-title" class="reader-title">'+(name==='about'?'Bakom Vännäs historia':'Nyheter och uppdateringar')+'</h2><div class="reader-copy">'+safeMarkup(pages[name])+'</div><a class="reader-source" href="https://vannashistoria.se/'+(name==='about'?'om':'nyheter')+'" target="_blank" rel="noopener">Läs på originalwebbplatsen</a>'}catch{$('#reader-body').innerHTML='<h2 id="reader-title">Sidan kunde inte hämtas.</h2><p>Försök igen om en stund.</p>'}}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-photo],[data-person],[data-record],[data-page],[data-category]');if(!b)return;
 if(b.dataset.record){e.preventDefault();const [t,id]=b.dataset.record.split('/');openRecord(t,id)}
 else if(b.dataset.photo)openRecord('bild',b.dataset.photo);
 else if(b.dataset.person)openRecord('person',b.dataset.person);
 else if(b.dataset.page)openPage(b.dataset.page);
 else if(b.dataset.category){$('#archive-search').value='';selectKind(b.dataset.category)}
});
const milestones={
 '1889':{heading:'Nya människor. Nya möjligheter.',description:'Karl Olof Lindström och Eva Karolina Dahlberg kommer till Vännäs tillsammans med sonen Per Olof och hans hustru Tekla Antonia. Bönder, hantverkare och entreprenörer som bosätter sig på Nyby.',image:'assets/photo-1476.jpg',caption:'En annan del av det tidiga hantverkslivet: J. P. Lindström med sömmerskor, cirka 1899–1905.',photo:1476},
 '1891':{heading:'Järnvägen förändrar allt.',description:'Järnvägen kommer till Vännäs. Runt stationen växer ett samhälle fram, med nya arbeten, handelsbodar och människor som söker en framtid här.',image:'assets/photo-759.jpg',caption:'Vännäs järnvägsstation, fotograferad 1892–1894.',photo:759},
 '1913':{heading:'Familjer knyter nya band.',description:'Vendla Karolina Elisabet Lindström gifter sig med lokföraren och småbrukaren Johan Vilhelm Ahnfeldt. Efter ett par år i Kiruna bosätter de sig på Myran. Familjehistorien blir en del av ortens historia.',image:'assets/photo-761.jpg',caption:'Järnvägsbron över Ume älv, fotograferad 1918.',photo:761},
 '1931':{heading:'En plats för gemensamma röster.',description:'Ett fotografi bevarar Ådalsdemonstrationen på Oskars torg 1931. Här möts människorna, rörelserna och samhällslivet i en enda bild.',image:'assets/photo-124.jpg',caption:'Ådalsdemonstration på Oskars torg, 1931.',photo:124},
 '1938':{heading:'Ett samhälle tar form.',description:'Från luften framträder gatorna, kvarteren och husen. Flygbilden från 1938 visar centrala Vännäs, ett nytt perspektiv på alla berättelser som finns här nere.',image:'assets/photo-782.jpg',caption:'Flygbild över centrala Vännäs, 1938.',photo:782}
};
$$('[data-year]').forEach(b=>b.onclick=()=>{const m=milestones[b.dataset.year];$$('[data-year]').forEach(t=>{t.setAttribute('aria-selected',String(t===b));t.tabIndex=t===b?0:-1});$('#timeline-panel').setAttribute('aria-labelledby',b.id);$('#timeline-year').textContent=b.dataset.year;$('#timeline-heading').textContent=m.heading;$('#timeline-description').textContent=m.description;$('#timeline-image').src=m.image;$('#timeline-image').alt=m.caption;$('#timeline-caption').textContent=m.caption;$('#timeline-detail').dataset.photo=m.photo});
let map,layer,mapKind='properties';
async function drawMap(next='properties'){mapKind=next;$$('[data-map]').forEach(b=>{b.classList.toggle('active',b.dataset.map===next);b.setAttribute('aria-pressed',String(b.dataset.map===next))});
 try{const records=await getData(next);if(mapKind!==next)return;if(!map){if(!window.L)throw Error('map');$('#history-map').innerHTML='';map=L.map('history-map',{scrollWheelZoom:false}).setView([63.9067,19.753],14);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map)}
 if(layer)map.removeLayer(layer);layer=L.layerGroup().addTo(map);
 records.filter(r=>Number(r.x_lon)>62&&Number(r.x_lon)<66&&Number(r.y_lat)>15&&Number(r.y_lat)<24).forEach(r=>{const node=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p'),btn=document.createElement('button');h.textContent=titleOf(r,next);p.textContent=next==='properties'?r.cadastral_id:dateOf(r);btn.textContent='Läs berättelsen';btn.onclick=()=>openRecord(singular[next],r[idFields[next]]);node.append(h,p,btn);L.circleMarker([r.x_lon,r.y_lat],{radius:next==='photos'?4:6,color:'#fffdf8',weight:1,fillColor:next==='photos'?'#293e33':'#b93724',fillOpacity:.88}).bindPopup(node).addTo(layer)})
 }catch{$('#history-map').innerHTML='<div class="empty-state"><h3>Kartan kunde inte läsas in.</h3><a class="text-link" href="https://vannashistoria.se/karta" target="_blank" rel="noopener">Öppna originalets karta</a>'}
}
$$('[data-map]').forEach(b=>b.onclick=()=>drawMap(b.dataset.map));$('#map-reset').onclick=()=>map?.setView([63.9067,19.753],14);
const mapObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){drawMap();mapObserver.disconnect()}},{rootMargin:'300px'});mapObserver.observe($('#history-map'));
function route(){const m=location.hash.match(/^#(bild|person|fastighet|organisation)\/(\d+)$/);if(m)openRecord(m[1],m[2],false);else if(reader.open)closeReader()}
window.addEventListener('popstate',route);
selectKind('photos');route();
