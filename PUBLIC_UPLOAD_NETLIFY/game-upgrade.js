/* Game nâng cấp: dùng lại rooms, state, visit, save, render, renderQuiz, score của app.js.
   Nội dung câu đố demo, cần kiểm duyệt trước khi dùng trong bảo tàng. */
'use strict';

const GAME_KEY = 'museum-game-upgrade-v1';

const gameFresh = () => ({
  quizTimes: {},
  quizExpired: [],
  puzzleWon: false,
  puzzleWonRooms: [],
  cipherSolved: [],
  puzzleMoves: 0
});

let game = gameFresh();
try {
  const data = JSON.parse(localStorage.getItem(GAME_KEY));
  if (data && typeof data === 'object') {
    game = {
      ...gameFresh(),
      ...data,
      puzzleWonRooms: Array.isArray(data.puzzleWonRooms) ? data.puzzleWonRooms : []
    };
  }
} catch (e) {}

function gameSave() {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(game));
  } catch (e) {}
}

const extraBadges = [
  {
    id: 'speed',
    emoji: '⚡',
    name: 'Nhanh như chớp',
    desc: 'Đúng một câu trong 10 giây',
    check: () => Object.values(game.quizTimes).some(v => v >= 10)
  },
  {
    id: 'puzzle',
    emoji: '🧩',
    name: 'Bậc thầy ghép hình',
    desc: 'Hoàn thành ghép hình',
    check: () => game.puzzleWonRooms.length > 0
  },
  {
    id: 'cipher',
    emoji: '🔐',
    name: 'Giải mã lịch sử',
    desc: 'Giải hết 3 mật mã',
    check: () => game.cipherSolved.length === 3
  },
  {
    id: 'treasure',
    emoji: '💎',
    name: 'Thợ săn kho báu',
    desc: 'Tìm đủ 3 kho báu',
    check: () => state.treasures.length === 3
  }
];

function gameXp() {
  return (
    score() +
    Object.values(game.quizTimes).reduce((a, b) => a + Math.max(0, b) * 5, 0) +
    game.puzzleWonRooms.length * 250 +
    game.cipherSolved.length * 120
  );
}

const ranks = [
  'Tân binh',
  'Nhà khám phá',
  'Người truy tìm',
  'Sử gia trẻ',
  'Bậc thầy lịch sử',
  'Huyền thoại bảo tàng'
];

function updateGameUI() {
  const xp = gameXp();
  const level = Math.min(6, Math.floor(xp / 300) + 1);
  const progress = level === 6 ? 100 : ((xp % 300) / 300) * 100;

  document.getElementById('gameLevel').textContent = `Cấp ${level} · ${ranks[level - 1]}`;
  document.getElementById('gameXp').textContent = `${xp.toLocaleString('vi-VN')} XP`;
  document.getElementById('xpFill').style.width = progress + '%';
  document.getElementById('xpNext').textContent =
    level === 6 ? 'Đã đạt cấp tối đa!' : `Còn ${300 - (xp % 300)} XP để lên cấp ${level + 1}`;

  const count =
    badgeDefs.filter(b => b.check(state)).length +
    extraBadges.filter(b => b.check()).length;
  document.getElementById('badgeCount').textContent =
    count + '/' + (badgeDefs.length + extraBadges.length);

  const badges = document.getElementById('badges');
  for (const b of extraBadges) {
    const unlocked = b.check();
    const el = document.createElement('div');
    el.className = 'badge-item extra' + (unlocked ? ' unlocked' : ' locked');

    const emoji = document.createElement('span');
    emoji.className = 'emoji';
    emoji.textContent = b.emoji;

    const strong = document.createElement('strong');
    strong.textContent = b.name;

    const small = document.createElement('small');
    small.textContent = unlocked ? 'Đã mở khóa' : '🔒 ' + b.desc;

    el.append(emoji, strong, small);
    badges.append(el);
  }

  document.getElementById('treasureStory').textContent =
    state.treasures.length === 3
      ? '🏆 Kho báu cuối cùng đã được khám phá! Bạn là thợ săn kho báu.'
      : `🗺️ Hành trình: ${state.treasures.length}/3 manh mối. Quét QR tại đúng khu vực để thu thập tiếp.`;

  renderPuzzle();
  renderCipher();
}

const oldRender = render;
render = function () {
  oldRender();
  updateGameUI();
};

// Quiz có 20 giây mỗi phòng, không làm mất quyền tham quan nếu hết giờ.
let quizTicker = null;
let quizRoom = null;
let quizDeadline = 0;

function clearQuizClock() {
  if (quizTicker !== null) {
    clearInterval(quizTicker);
    quizTicker = null;
  }
}

function clockText(text, urgent = false) {
  const el = document.getElementById('quizClock');
  el.textContent = text;
  el.classList.toggle('urgent', urgent);
}

function timedQuiz() {
  const box = document.getElementById('quizBox');
  box.replaceChildren();
  clearQuizClock();

  const room = state.current;
  if (!room || !state.visited.includes(room)) {
    clockText('🔒 Quét QR để mở');
    box.textContent = 'Quét QR ở một phòng để bắt đầu thử thách.';
    return;
  }
  if (state.quizDone.includes(room)) {
    clockText('✅ Đã hoàn thành');
    box.textContent = 'Bạn đã trả lời đúng câu hỏi của phòng này.';
    return;
  }
  if (game.quizExpired.includes(room)) {
    clockText('⌛ Hết giờ');
    box.textContent = 'Đã hết 20 giây. Hãy tiếp tục hành trình đến phòng khác.';
    return;
  }

  const q = questions[room];
  if (!q) {
    box.textContent = 'Chưa có câu hỏi cho phòng này.';
    return;
  }

  const title = document.createElement('h3');
  title.textContent = q.q;
  box.append(title);

  let buttons = [];
  let answered = false;

  function expire() {
    if (answered) return;
    answered = true;
    clearQuizClock();
    if (!game.quizExpired.includes(room)) game.quizExpired.push(room);
    gameSave();
    clockText('⌛ Hết giờ', true);
    buttons.forEach(b => (b.disabled = true));
    toast('Hết thời gian! Hãy tiếp tục khám phá phòng khác.');
  }

  const started = performance.now();
  quizDeadline = started + 20000;
  quizRoom = room;

  q.a.forEach((answer, index) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = String.fromCharCode(65 + index) + '. ' + answer;

    btn.onclick = () => {
      if (answered || state.current !== room) return;
      if (performance.now() >= quizDeadline) {
        expire();
        return;
      }
      if (index !== q.correct) {
        btn.classList.add('wrong');
        btn.disabled = true;
        toast('Chưa chính xác, hãy thử lại!');
        return;
      }

      answered = true;
      clearQuizClock();
      const remaining = Math.max(0, Math.ceil((quizDeadline - performance.now()) / 1000));
      game.quizTimes[room] = remaining;
      state.quizDone.push(room);
      save();
      gameSave();
      render();
      toast('🎉 Đúng! +50 điểm và +' + remaining * 5 + ' XP tốc độ');
    };

    buttons.push(btn);
    box.append(btn);
  });

  function tick() {
    if (state.current !== room) {
      clearQuizClock();
      return;
    }
    const sec = Math.max(0, Math.ceil((quizDeadline - performance.now()) / 1000));
    clockText('⏱️ Còn ' + sec + ' giây', sec <= 5);
    if (sec === 0) expire();
  }

  tick();
  quizTicker = setInterval(tick, 200);
}

renderQuiz = timedQuiz;

// Ghép hình 3x3 theo từng khu vực. Hình minh họa đi kèm có thể thay bằng ảnh hiện vật được cấp phép.
const puzzleMeta = {
  dien: {
    title: rooms.find(r => r.id === 'dien')?.name || 'dien',
    object: 'Tư liệu hình ảnh Đà Nẵng thời kỳ phát triển',
    source: '#',
    photo: '11332.jpg'
  },
  khangchien: {
    title: rooms.find(r => r.id === 'khangchien')?.name || 'khangchien',
    object: 'Xe máy và thiết bị trưng bày thời kỳ kháng chiến',
    source: '#',
    photo: '11331.jpg'
  },
  giaothong: {
    title: rooms.find(r => r.id === 'giaothong')?.name || 'giaothong',
    object: 'Tủ trưng bày đồ gốm và dụng cụ sinh hoạt',
    source: '#',
    photo: '11334.jpg'
  },
  trungtich: {
    title: rooms.find(r => r.id === 'trungtich')?.name || 'trungtich',
    object: 'Vũ khí và vật chứng chiến tranh',
    source: '#',
    photo: '11328.jpg'
  },
  hoinhap: {
    title: rooms.find(r => r.id === 'hoinhap')?.name || 'hoinhap',
    object: 'Mô hình kiến trúc công trình',
    source: '#',
    photo: '11335.jpg'
  },
  khongphap: {
    title: rooms.find(r => r.id === 'khongphap')?.name || 'khongphap',
    object: 'Ảnh tư liệu kiến trúc thời kỳ Pháp thuộc',
    source: '#',
    photo: '11330.jpg'
  },
  traoyeunuoc: {
    title: rooms.find(r => r.id === 'traoyeunuoc')?.name || 'traoyeunuoc',
    object: 'Tư liệu văn bản lịch sử',
    source: '#',
    photo: '11337.jpg'
  },
  matran: {
    title: rooms.find(r => r.id === 'matran')?.name || 'matran',
    object: 'Mô hình thuyền buồm truyền thống',
    source: '#',
    photo: '11336.jpg'
  },
  chungtichgiua: {
    title: rooms.find(r => r.id === 'chungtichgiua')?.name || 'chungtichgiua',
    object: 'Vật dụng cá nhân và hiện vật chiến tranh',
    source: '#',
    photo: '11327.jpg'
  },
  cosodang: {
    title: rooms.find(r => r.id === 'cosodang')?.name || 'cosodang',
    object: 'Tư liệu phong trào yêu nước và hoạt động cách mạng',
    source: '#',
    photo: '11326.jpg'
  },
  phim: {
    title: rooms.find(r => r.id === 'phim')?.name || 'phim',
    object: 'Không gian trình chiếu phim tư liệu lịch sử',
    source: '#',
    photo: '11323.jpg'
  },
  chungtichduoi: {
    title: rooms.find(r => r.id === 'chungtichduoi')?.name || 'chungtichduoi',
    object: 'Không gian trưng bày dòng thời gian lịch sử',
    source: '#',
    photo: '11324.jpg'
  }
};

let puzzleOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
let selected = -1;
let puzzleStarted = false;
let puzzleRoom = null;

function shufflePuzzle() {
  const room = state.current;
  if (!room || !state.visited.includes(room)) return;

  puzzleRoom = room;
  puzzleOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = 8; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [puzzleOrder[i], puzzleOrder[j]] = [puzzleOrder[j], puzzleOrder[i]];
  }
  if (puzzleOrder.every((v, i) => v === i)) {
    [puzzleOrder[0], puzzleOrder[1]] = [puzzleOrder[1], puzzleOrder[0]];
  }

  puzzleStarted = true;
  selected = -1;
  game.puzzleMoves = 0;
  renderPuzzle();
}

function renderPuzzle() {
  const board = document.getElementById('puzzleBoard');
  board.replaceChildren();

  const room = state.current;
  const unlocked = !!room && state.visited.includes(room);
  if (puzzleRoom !== room) {
    puzzleRoom = room;
    puzzleStarted = false;
    selected = -1;
    puzzleOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  }

  const meta = puzzleMeta[room];
  const won = game.puzzleWonRooms.includes(room);
  const status = document.getElementById('puzzleStatus');
  status.textContent = !unlocked
    ? '🔒 Quét QR phòng để mở ghép hình'
    : won
    ? '🏆 Đã hoàn thành phòng này · +250 XP'
    : `🧩 ${meta ? meta.object : ''} · Lượt đổi: ${game.puzzleMoves} · ${
        puzzleStarted ? 'Chọn hai ô để đổi' : 'Nhấn Xáo trộn để bắt đầu'
      }`;

  document.getElementById('puzzleShuffle').disabled = !unlocked;

  const title = document.getElementById('puzzleRoomTitle');
  if (title) {
    title.textContent = unlocked ? `${meta.title} — ${meta.object}` : 'Chưa mở khóa phòng';
  }

  const reveal = document.getElementById('puzzleReveal');
  if (reveal) {
    reveal.hidden = !unlocked || !won;
    if (unlocked && won && meta) {
      reveal.querySelector('img').src = 'puzzle-images/' + room + '.jpg';
      reveal.querySelector('strong').textContent = meta.object;
    }
  }

  const source = document.getElementById('puzzleSource');
  if (source) {
    source.hidden = true;
  }

  for (let i = 0; i < 9; i++) {
    const v = puzzleOrder[i];
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'puzzle-tile' + (selected === i ? ' selected' : '');
    tile.style.backgroundImage = unlocked
      ? `url('puzzle-images/${encodeURIComponent(room)}.jpg')`
      : '';
    tile.style.backgroundPosition = `${(v % 3) * 50}% ${Math.floor(v / 3) * 50}%`;
    tile.setAttribute('aria-label', 'Ô ghép ' + (i + 1));
    tile.disabled = !unlocked || !puzzleStarted;

    tile.onclick = () => {
      if (selected < 0) {
        selected = i;
        renderPuzzle();
        return;
      }
      if (selected === i) {
        selected = -1;
        renderPuzzle();
        return;
      }

      [puzzleOrder[selected], puzzleOrder[i]] = [puzzleOrder[i], puzzleOrder[selected]];
      selected = -1;
      game.puzzleMoves++;

      if (puzzleOrder.every((v, k) => v === k)) {
        puzzleStarted = false;
        if (!game.puzzleWonRooms.includes(room)) {
          game.puzzleWonRooms.push(room);
          game.puzzleWon = true;
          gameSave();
          toast('🧩 Hoàn thành phòng! +250 XP');
        } else {
          toast('🧩 Ghép hình thành công!');
        }
      }
      render();
    };

    board.append(tile);
  }
}

document.getElementById('puzzleShuffle').onclick = shufflePuzzle;

// Mật mã lịch sử: nội dung demo dựa trên tên phòng, không bịa chi tiết hiện vật.
const ciphers = [
  {
    clue: 'Mật mã 1: Năm nào Đà Nẵng mở đầu mặt trận chống Pháp theo tên khu trưng bày?',
    answers: ['1858'],
    hint: 'Một mốc lịch sử có bốn chữ số, bắt đầu bằng 18.'
  },
  {
    clue: 'Mật mã 2: Điền mốc năm trong tên phòng “Các tổ chức cơ sở Đảng trước ...”',
    answers: ['1945'],
    hint: 'Năm Cách mạng Tháng Tám.'
  },
  {
    clue: 'Mật mã 3: Khu vực “Các phong trào yêu nước trước năm ...” ghi mốc nào?',
    answers: ['1930'],
    hint: 'Mốc năm thành lập Đảng Cộng sản Việt Nam.'
  }
];

function renderCipher() {
  const index = game.cipherSolved.length;
  const unlocked = state.visited.length > 0;
  const status = document.getElementById('cipherStatus');
  const clue = document.getElementById('cipherClue');
  const input = document.getElementById('cipherAnswer');

  document.getElementById('cipherCheck').disabled = !unlocked || index === 3;
  document.getElementById('cipherHint').disabled = !unlocked || index === 3;
  input.disabled = !unlocked || index === 3;

  status.textContent = !unlocked
    ? '🔒 Quét QR một phòng để mở'
    : index === 3
    ? '🏆 Đã giải đủ 3 mật mã! +360 XP'
    : `Mật mã ${index + 1}/3 · Mỗi câu đúng +120 XP`;

  clue.textContent = !unlocked
    ? 'Mật mã sẽ xuất hiện sau khi bạn quét QR.'
    : index === 3
    ? 'Chúc mừng! Bạn đã giải mã toàn bộ thử thách.'
    : ciphers[index].clue;
}

document.getElementById('cipherCheck').onclick = () => {
  const i = game.cipherSolved.length;
  if (!state.visited.length || i >= 3) return;

  const input = document.getElementById('cipherAnswer');
  const answer = input.value.trim().toLowerCase().normalize('NFC');
  if (ciphers[i].answers.includes(answer)) {
    game.cipherSolved.push(i);
    input.value = '';
    gameSave();
    render();
    toast('🔓 Giải mã chính xác! +120 XP');
  } else {
    toast('Chưa đúng, hãy thử lại nhé!');
  }
};

document.getElementById('cipherHint').onclick = () => {
  const i = game.cipherSolved.length;
  if (state.visited.length && i < 3) {
    toast('💡 ' + ciphers[i].hint);
  }
};

document.getElementById('cipherAnswer').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('cipherCheck').click();
  }
});

// Reset đồng bộ cả trò chơi nâng cấp và lịch sử tham quan.
const resetButton = document.getElementById('resetBtn');
const oldReset = resetButton.onclick;
resetButton.onclick = () => {
  if (confirm('Xóa toàn bộ tiến độ tham quan, XP, câu đố và huy hiệu trên thiết bị này?')) {
    game = gameFresh();
    gameSave();
    state = fresh();
    save();
    puzzleStarted = false;
    puzzleOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    selected = -1;
    clearQuizClock();
    render();
    toast('Đã bắt đầu hành trình mới');
  }
};

// Trang đã render trước khi nạp game-upgrade.js, nên cập nhật lần đầu.
render();
