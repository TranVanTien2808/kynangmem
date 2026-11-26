(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const history = [];
  let aiOnline = false;
  let lastAnswer = '';

  const fallback = [
    {
      match: /1858|pháp.*tấn công|liên quân/i,
      answer:
        'Năm 1858, liên quân Pháp – Tây Ban Nha tấn công Đà Nẵng, mở đầu cuộc xâm lược Việt Nam của thực dân Pháp. Bạn có thể tìm khu trưng bày “Đà Nẵng mở đầu mặt trận chống Pháp (1858–1860)” để tìm hiểu thêm.'
    },
    {
      match: /1975|chống mỹ|giải phóng/i,
      answer:
        'Năm 1975 đánh dấu thắng lợi của cuộc kháng chiến chống Mỹ, cứu nước và thống nhất đất nước. Tại tầng 2 có khu “Kháng chiến chống Mỹ (1955–1975)”. Hãy xem hiện vật và tư liệu tại phòng để biết thêm chi tiết.'
    },
    {
      match: /huy hiệu|điểm|kho báu|câu đố/i,
      answer:
        'Bạn nhận 100 điểm khi ghé phòng mới, 50 điểm khi trả lời đúng câu đố và 150 điểm khi hoàn thành nhiệm vụ kho báu. Huy hiệu sẽ mở khóa theo tiến độ khám phá.'
    },
    {
      match: /tiếp theo|chưa đi|chưa tham quan|gợi ý/i,
      answer: () => {
        const next = rooms.find(r => !state.visited.includes(r.id));
        return next
          ? 'Bạn có thể khám phá tiếp khu “' +
              next.name +
              '”. Hãy chọn phòng trên bản đồ hoặc quét QR tại đó.'
          : 'Bạn đã khám phá hết các phòng được khai báo ở tầng 2!';
      }
    },
    {
      match: /đang đứng|phòng hiện tại|ở đâu|khu vực này|giới thiệu phòng/i,
      answer: () => {
        const r = rooms.find(r => r.id === state.current);
        return r
          ? 'Theo vị trí đã cập nhật bằng ' +
              state.source +
              ', bạn đang ở khu “' +
              r.name +
              '”. Đây là tên khu trên sơ đồ, chưa phải nội dung thuyết minh chính thức. Bạn có thể xem bảng thông tin và hiện vật tại khu này.'
          : 'Mình chưa xác định được phòng hiện tại. Bạn hãy quét QR hoặc chọn một phòng trong chế độ mô phỏng.';
      }
    },
    {
      match: /qr|định vị|bluetooth|beacon/i,
      answer:
        'Website dùng QR để cập nhật phòng khi khách quét mã. Chế độ mô phỏng cho phép chọn phòng thủ công. Muốn tự cập nhật bằng Bluetooth Beacon cần ứng dụng Android đọc BLE và thiết bị phát tín hiệu.'
    },
    {
      match: /đà nẵng|bảo tàng/i,
      answer:
        'Bảo tàng Đà Nẵng giới thiệu những chủ đề về lịch sử và văn hóa địa phương. Trên sơ đồ tầng 2 của bản demo có các khu về phong trào yêu nước, các cuộc kháng chiến và chứng tích chiến tranh. Bạn muốn hỏi cụ thể về chủ đề nào?'
    }
  ];

  function append(role, text) {
    const el = document.createElement('div');
    el.className = 'ai-bubble ' + role;
    el.textContent = text;
    byId('aiMessages').appendChild(el);
    byId('aiMessages').scrollTop = byId('aiMessages').scrollHeight;
  }

  function offline(q) {
    const item = fallback.find(x => x.match.test(q));
    return item
      ? typeof item.answer === 'function'
        ? item.answer()
        : item.answer
      : 'Mình chưa có dữ liệu đáng tin cậy để trả lời câu hỏi này trong chế độ mẫu. Bạn có thể hỏi về sự kiện năm 1858, các khu trưng bày hoặc hành trình tham quan. Để trả lời câu hỏi mở, hãy chạy máy chủ AI và cấu hình API key.';
  }

  async function check() {
    try {
      const res = await fetch('/api/health', {
        signal: AbortSignal.timeout(2500)
      });
      if (!res.ok) throw Error('offline');
      const data = await res.json();
      aiOnline = Boolean(data.aiConfigured);
      byId('aiStatus').textContent = aiOnline
        ? '● AI đã kết nối'
        : '● Chế độ trả lời mẫu';
    } catch {
      aiOnline = false;
      byId('aiStatus').textContent = '● Chế độ trả lời mẫu';
    }
  }

  async function ask(q) {
    q = q.trim();
    if (!q) return;
    append('user', q);
    byId('aiInput').value = '';
    byId('aiSend').disabled = true;

    let answer = '';
    try {
      if (aiOnline) {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            room: rooms.find(r => r.id === state.current)?.name || null,
            visited: state.visited
              .map(id => rooms.find(r => r.id === id)?.name)
              .filter(Boolean),
            history: history.slice(-6)
          })
        });
        const data = await res.json();
        if (!res.ok) throw Error(data.error || 'Không thể kết nối AI');
        answer = data.answer || 'Không nhận được câu trả lời.';
      } else {
        answer = offline(q);
      }
    } catch (err) {
      answer =
        'Không gọi được AI: ' +
        err.message +
        '. Hãy kiểm tra máy chủ và API key.\n\nTrả lời mẫu: ' +
        offline(q);
    }

    lastAnswer = answer;
    history.push(
      { role: 'user', content: q },
      { role: 'assistant', content: answer }
    );
    if (history.length > 12) {
      history.splice(0, history.length - 12);
    }
    append('assistant', answer);
    byId('aiSend').disabled = false;
  }

  byId('aiForm').addEventListener('submit', e => {
    e.preventDefault();
    ask(byId('aiInput').value);
  });

  document.querySelectorAll('.ai-suggest').forEach(b =>
    b.addEventListener('click', () => ask(b.dataset.question))
  );

  byId('aiSpeak').onclick = () => {
    if (!lastAnswer) return alert('Hãy hỏi một câu trước.');
    if (!('speechSynthesis' in window)) {
      return alert('Trình duyệt không hỗ trợ đọc văn bản.');
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(lastAnswer);
    u.lang = 'vi-VN';
    u.rate = 0.94;
    speechSynthesis.speak(u);
  };

  byId('aiMic').onclick = () => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      return alert(
        'Trình duyệt này chưa hỗ trợ nhận giọng nói. Bạn hãy nhập câu hỏi bằng bàn phím.'
      );
    }
    const r = new Recognition();
    r.lang = 'vi-VN';
    r.onresult = e => {
      byId('aiInput').value = e.results[0][0].transcript;
      byId('aiInput').focus();
    };
    r.onerror = () =>
      alert('Không nhận được giọng nói. Kiểm tra quyền micro và HTTPS.');
    r.start();
  };

  check();
})();