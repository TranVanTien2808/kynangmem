'use strict';
// Các tọa độ tương đối theo ảnh gốc 640 x 402; cần khảo sát thực tế để hiệu chỉnh.
const rooms=[
{id:'dien',name:'Đà Nẵng TP Anh Hùng',x:232,y:49},
{id:'khangchien',name:'Kháng chiến chống Mỹ (1955–1975)',x:149,y:85},
{id:'giaothong',name:'Không gian thông tầng',x:315,y:95},
{id:'trungtich',name:'Chứng tích chiến tranh (trên)',x:452,y:82},
{id:'hoinhap',name:'Khu hội thảo',x:558,y:98},
{id:'khongphap',name:'Kháng chiến chống Pháp (1946–1954)',x:116,y:146},
{id:'traoyeunuoc',name:'Các phong trào yêu nước trước năm 1930',x:188,y:146},
{id:'matran',name:'Đà Nẵng mở đầu mặt trận chống Pháp (1858–1860)',x:308,y:161},
{id:'chungtichgiua',name:'Chứng tích chiến tranh (giữa)',x:437,y:146},
{id:'cosodang',name:'Các tổ chức cơ sở Đảng trước 1945',x:156,y:238},
{id:'phim',name:'Phòng chiếu phim',x:291,y:239},
{id:'chungtichduoi',name:'Chứng tích chiến tranh (dưới)',x:475,y:239}
];
// Câu hỏi mẫu có thể chỉnh sửa. Không thay thế thuyết minh chính thức.
const questions={
 dien:{q:'Khu vực “Đà Nẵng TP Anh Hùng” gắn với địa danh nào?',a:['Đà Nẵng','Hà Nội','Huế'],correct:0},
 khangchien:{q:'Giai đoạn kháng chiến chống Mỹ trên tên phòng kéo dài đến năm nào?',a:['1945','1975','1858'],correct:1},
 giaothong:{q:'“Không gian thông tầng” có vai trò nào trong sơ đồ tham quan?',a:['Là khu vực kết nối không gian','Là nhà ga','Là bãi đỗ xe'],correct:0},
 trungtich:{q:'Khu vực này có tên gọi nào trên sơ đồ?',a:['Trưng bày thiên văn','Chứng tích chiến tranh','Thực vật học'],correct:1},
 hoinhap:{q:'Tên khu vực này trên bản đồ là gì?',a:['Khu hội thảo','Phòng thể thao','Nhà hàng'],correct:0},
 khongphap:{q:'Giai đoạn kháng chiến chống Pháp ghi trên sơ đồ bắt đầu từ năm nào?',a:['1946','1975','1930'],correct:0},
 traoyeunuoc:{q:'Khu vực này đề cập đến phong trào yêu nước trước mốc nào?',a:['1975','1930','2000'],correct:1},
 matran:{q:'Theo tên khu trưng bày, mặt trận chống Pháp ở Đà Nẵng mở đầu năm nào?',a:['1858','1945','1975'],correct:0},
 chungtichgiua:{q:'Khu vực bạn đang khám phá mang chủ đề gì?',a:['Chứng tích chiến tranh','Thời trang','Sinh vật biển'],correct:0},
 cosodang:{q:'Tên khu vực nhắc đến các tổ chức cơ sở Đảng trước năm nào?',a:['1945','2000','1975'],correct:0},
 phim:{q:'Ở khu vực phòng chiếu phim, hoạt động nào phù hợp nhất?',a:['Xem phim tư liệu','Bơi lội','Nấu ăn'],correct:0},
 chungtichduoi:{q:'Chủ đề chung của khu vực này là gì?',a:['Chứng tích chiến tranh','Hóa học','Thiên văn'],correct:0}
};
const treasureMissions=[
{id:'t1',target:'matran',title:'Dấu mốc 1858',clue:'Hãy tìm khu trưng bày nhắc đến mặt trận chống Pháp mở đầu ở Đà Nẵng.'},
{id:'t2',target:'phim',title:'Cuộn phim ký ức',clue:'Hãy đến nơi có thể xem phim tư liệu.'},
{id:'t3',target:'traoyeunuoc',title:'Dấu ấn yêu nước',clue:'Hãy tìm khu vực nói về các phong trào yêu nước trước năm 1930.'}
];
const badgeDefs=[
{id:'first',emoji:'🌟',name:'Bước chân đầu tiên',desc:'Ghé thăm 1 phòng',check:s=>s.visited.length>=1},
{id:'explorer',emoji:'🧭',name:'Nhà thám hiểm',desc:'Ghé thăm 6 phòng',check:s=>s.visited.length>=6},
{id:'scholar',emoji:'📚',name:'Hiểu biết lịch sử',desc:'Trả lời đúng 3 câu',check:s=>s.quizDone.length>=3},
{id:'master',emoji:'🏆',name:'Khám phá tầng 2',desc:'Ghé thăm đủ 12 phòng',check:s=>s.visited.length===rooms.length}
];
const storageKey='danang-museum-adventure-qr-only-v3';
// QR-only: phòng chỉ được mở khóa khi URL chứa location=ID hợp lệ.
// URL QR chỉ chứng minh đã mở liên kết, KHÔNG xác minh vị trí vật lý.
const fresh=()=>({current:null,visited:[],quizDone:[],treasures:[],history:[],source:'Mô phỏng / QR'});
let state=fresh();
try{const s=JSON.parse(localStorage.getItem(storageKey));if(s&&Array.isArray(s.visited)&&Array.isArray(s.quizDone)&&Array.isArray(s.treasures)&&Array.isArray(s.history)){state={...fresh(),...s};state.visited=state.visited.filter(id=>rooms.some(r=>r.id===id));state.quizDone=state.quizDone.filter(id=>rooms.some(r=>r.id===id));state.treasures=state.treasures.filter(id=>treasureMissions.some(t=>t.id===id));if(!rooms.some(r=>r.id===state.current))state.current=null}}catch(e){console.warn('Không thể đọc lịch sử:',e)}
const $=id=>document.getElementById(id),getRoom=id=>rooms.find(r=>r.id===id);
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state))}catch(e){console.warn('Không lưu được dữ liệu:',e)}}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300)}
let newlyUnlocked=null;
function visit(id,source='Mô phỏng'){const room=getRoom(id);if(!room)return false;
if(source!=='QR Code'){toast('🔒 Phòng chỉ mở khóa bằng mã QR đặt tại phòng.');return false;}const first=!state.visited.includes(id);state.current=id;state.source=source;if(first){state.visited.push(id);newlyUnlocked=id}state.history.push({id,time:new Date().toISOString(),source});const found=treasureMissions.filter(t=>t.target===id&&!state.treasures.includes(t.id));found.forEach(t=>state.treasures.push(t.id));save();render();if(first)toast('✨ Mở khóa '+room.name+' · +100 điểm');else if(found.length)toast('💎 Tìm thấy kho báu! +150 điểm');if(found.length&&first)setTimeout(()=>toast('💎 Hoàn thành '+found.map(t=>t.title).join(', ')+' · +'+(150*found.length)+' điểm'),3400);return true}
function score(){return state.visited.length*100+state.quizDone.length*50+state.treasures.length*150}
function render(){const pct=Math.round(state.visited.length/rooms.length*100);$('points').textContent=score().toLocaleString('vi-VN');$('visitedCount').textContent=state.visited.length+'/'+rooms.length;$('percentage').textContent=pct+'%';$('badgeCount').textContent=badgeDefs.filter(b=>b.check(state)).length+'/'+badgeDefs.length;$('treasureCount').textContent=state.treasures.length+'/'+treasureMissions.length;$('progressFill').style.width=pct+'%';$('currentRoom').textContent=getRoom(state.current)?.name||'Chưa xác định';$('positionSource').textContent=state.current?'Cập nhật từ: '+state.source:'Quét QR hoặc chọn phòng để mô phỏng.';$('roomSelect').value=state.current||'';$('welcome').textContent=pct===100?'🏆 Bạn đã khám phá toàn bộ tầng 2!':state.visited.length?'Hành trình đang tiếp diễn!':'Chào mừng nhà khám phá!';$('message').textContent=state.visited.length?`Bạn đã khám phá ${state.visited.length} khu vực. Còn ${rooms.length-state.visited.length} khu vực chưa tham quan.`:'Chọn vị trí hoặc quét QR tại một phòng để bắt đầu hành trình.';
const pins=$('pins');pins.replaceChildren();for(const r of rooms){const b=document.createElement('button');b.type='button';b.className='pin'+(state.visited.includes(r.id)?' visited':'')+(state.current===r.id?' current':'')+(newlyUnlocked===r.id?' new':'');b.style.left=(r.x/640*100)+'%';b.style.top=(r.y/402*100)+'%';b.textContent=state.current===r.id?'●':state.visited.includes(r.id)?'✓':'·';b.title=state.visited.includes(r.id)?r.name:'🔒 '+r.name+' — quét QR để mở';b.setAttribute('aria-label',(state.visited.includes(r.id)?'Đã mở khóa ':'Chưa mở khóa ')+r.name);b.onclick=()=>toast(state.visited.includes(r.id)?'Phòng đã mở khóa. Hãy quét QR tại phòng khác để di chuyển.':'🔒 Hãy quét mã QR tại phòng để mở khóa.');pins.appendChild(b)}newlyUnlocked=null;
const badges=$('badges');badges.replaceChildren();for(const b of badgeDefs){const unlocked=b.check(state);const item=document.createElement('div');item.className='badge-item'+(unlocked?' unlocked':'');item.innerHTML=`<span class="emoji">${b.emoji}</span><strong>${b.name}</strong><small>${unlocked?'Đã mở khóa':'🔒 '+b.desc}</small>`;badges.appendChild(item)}
const treasures=$('treasures');treasures.replaceChildren();for(const t of treasureMissions){const done=state.treasures.includes(t.id),el=document.createElement('div');el.className='treasure'+(done?' done':'');const name=document.createElement('strong');name.textContent=(done?'💎 ':'🔒 ')+t.title;const desc=document.createElement('small');desc.textContent=done?'Đã tìm thấy · +150 điểm':t.clue;el.append(name,desc);treasures.appendChild(el)}
const list=$('roomList');list.replaceChildren();for(const r of rooms){const row=document.createElement('div');row.className='room-item';const label=document.createElement('span');label.textContent=(state.current===r.id?'📍 ':state.visited.includes(r.id)?'✅ ':'⬜ ')+r.name;const button=document.createElement('button');button.className='outline';button.textContent=state.visited.includes(r.id)?'Đã mở':'🔒 Chưa quét';button.disabled=true;row.append(label,button);list.appendChild(row)}renderQuiz()}
function renderQuiz(){const box=$('quizBox');box.replaceChildren();if(!state.current){box.textContent='Hãy đến một phòng để mở câu hỏi đầu tiên.';return}const r=getRoom(state.current),q=questions[r.id],done=state.quizDone.includes(r.id);const title=document.createElement('h3');title.textContent=q.q;box.appendChild(title);if(done){const p=document.createElement('p');p.textContent='✅ Đã trả lời đúng · +50 điểm. Hãy khám phá phòng khác!';box.appendChild(p);return}q.a.forEach((answer,index)=>{const btn=document.createElement('button');btn.className='choice';btn.textContent=String.fromCharCode(65+index)+'. '+answer;btn.onclick=()=>{if(index===q.correct){state.quizDone.push(r.id);save();render();toast('🎉 Chính xác! +50 điểm')}else{btn.classList.add('wrong');toast('Chưa đúng, hãy thử đáp án khác nhé!')}};box.appendChild(btn)})}
for(const r of rooms){for(const id of ['roomSelect']){const opt=document.createElement('option');opt.value=r.id;opt.textContent=r.name;$(id).appendChild(opt)}}const blank=document.createElement('option');blank.value='';blank.textContent='-- Chọn phòng --';$('roomSelect').prepend(blank);
$('visitBtn').disabled=true;$('visitBtn').textContent='🔒 Chỉ quét QR';$('roomSelect').disabled=true;
$('nextBtn').onclick=()=>{const r=rooms.find(r=>!state.visited.includes(r.id));if(r){$('roomSelect').value=r.id;toast('Gợi ý tiếp theo: '+r.name+' (chưa tự ghi nhận đã đến)')}else toast('Bạn đã tham quan đủ các phòng!')};
$('audioBtn').onclick=()=>{if(!('speechSynthesis'in window)){toast('Trình duyệt không hỗ trợ đọc văn bản.');return}if(!state.current){toast('Hãy chọn phòng trước khi nghe.');return}const r=getRoom(state.current);speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(`Chào mừng bạn đến với khu vực ${r.name}. Đây là lời giới thiệu mẫu cho website trải nghiệm Bảo tàng Đà Nẵng. Hãy quan sát các hiện vật và bảng thuyết minh tại khu vực để tìm hiểu thêm. Chúc bạn có một hành trình khám phá thú vị.`);speech.lang='vi-VN';speech.rate=.92;speechSynthesis.speak(speech)};
$('resetBtn').onclick=()=>{if(confirm('Xóa toàn bộ điểm, huy hiệu, câu đố và lịch sử trên trình duyệt này?')){state=fresh();save();render();toast('Đã bắt đầu hành trình mới')}};
$('exportBtn').onclick=()=>{const lines=['NHẬT KÝ KHÁM PHÁ BẢO TÀNG ĐÀ NẴNG - TẦNG 2',`Điểm: ${score()}`,`Đã tham quan: ${state.visited.length}/${rooms.length}`,...state.history.map(h=>`${new Date(h.time).toLocaleString('vi-VN')} | ${getRoom(h.id)?.name||h.id} | ${h.source}`)];const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nhat-ky-bao-tang.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)};
let zoom=100;function updateZoom(){const content=$('mapContent');content.style.width=zoom+'%';$('zoomLabel').textContent=zoom+'%'}$('zoomIn').onclick=()=>{zoom=Math.min(220,zoom+25);updateZoom()};$('zoomOut').onclick=()=>{zoom=Math.max(100,zoom-25);updateZoom()};$('zoomReset').onclick=()=>{zoom=100;updateZoom()};
$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
// Cầu nối để ứng dụng Android WebView nhận vị trí từ BLE scanner.
// Chỉ gọi với mã phòng đã được xác nhận sau khi lọc RSSI; không phải trình duyệt tự quét Beacon.
window.onBeaconRoom=function(roomId){toast('Chế độ QR-only: Beacon không mở khóa phòng.');return false};
const scanned=new URLSearchParams(window.location.search).get('location');
if(scanned&&getRoom(scanned))visit(scanned,'QR Code');
else {render();if(scanned)toast('Mã QR không hợp lệ: không tìm thấy phòng.');}
