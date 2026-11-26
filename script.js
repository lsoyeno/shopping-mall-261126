/* =========================================================
   ATELIER ARCHIVE — script.js
   ---------------------------------------------------------
   [데이터] 맨 위 배열 2개(PRODUCTS, GRADES)는 나중에
   데이터베이스 테이블(products, grades)로 그대로 옮기면 됩니다.
   지금은 회원·장바구니·주문을 브라우저 localStorage 에 저장해요.
   ========================================================= */

// ---------- 상품 데이터 (products 테이블) ----------
const PRODUCTS = [
  { id: 1, name: "빈티지 레이스 칼라 블라우스", category: "상의", price: 39000, stock: 12, img: "img/product-1.svg", size: "FREE (가슴단면 52cm · 총장 60cm)", condition: "A (사용감 적음)", desc: "둥근 레이스 칼라가 포인트인 아이보리 블라우스. 얇은 면 소재라 봄·가을 단독으로, 겨울엔 니트 안에 받쳐 입기 좋아요." },
  { id: 2, name: "울 케이블 니트 가디건", category: "상의", price: 52000, stock: 8, img: "img/product-2.svg", size: "M (가슴단면 54cm · 총장 63cm)", condition: "A- (보풀 약간)", desc: "도톰한 울 혼방 케이블 짜임 가디건. 우드 단추가 달린 카멜 컬러로 어떤 하의와도 잘 어울려요." },
  { id: 3, name: "하이웨스트 워싱 데님 팬츠", category: "하의", price: 45000, stock: 10, img: "img/product-3.svg", size: "27 (허리 34cm · 총장 98cm)", condition: "A (자연 워싱)", desc: "허리선이 높아 다리가 길어 보이는 스트레이트 핏 데님. 자연스러운 워싱이 빈티지 무드를 더해요." },
  { id: 4, name: "체크 플리츠 미디 스커트", category: "하의", price: 38000, stock: 9, img: "img/product-4.svg", size: "S (허리 33cm · 총장 72cm)", condition: "A (사용감 적음)", desc: "브릭 레드 체크의 주름 미디 스커트. 니트, 블라우스와 함께 클래식하게 연출해 보세요." },
  { id: 5, name: "브라운 레더 페니 로퍼", category: "신발", price: 68000, stock: 6, img: "img/product-5.svg", size: "235mm (굽 2.5cm)", condition: "B+ (밑창 교체 완료)", desc: "천연 가죽 페니 로퍼. 밑창을 새로 갈아 편하게 신을 수 있고, 양말과 함께 신으면 더 멋스러워요." },
  { id: 6, name: "스웨이드 앵클 부츠", category: "신발", price: 79000, stock: 5, img: "img/product-6.svg", size: "240mm (굽 3cm)", condition: "A- (앞코 미세 사용감)", desc: "부드러운 카멜 스웨이드 앵클 부츠. 원피스와 데님 어디에나 어울리는 가을·겨울 필수템이에요." },
  { id: 7, name: "플로럴 프린트 티어드 원피스", category: "원피스", price: 58000, stock: 7, img: "img/product-7.svg", size: "FREE (가슴단면 46cm · 총장 118cm)", condition: "A (사용감 적음)", desc: "작은 꽃무늬가 흩뿌려진 3단 티어드 원피스. 가디건을 걸치면 계절 내내 입을 수 있어요." },
  { id: 8, name: "코듀로이 버튼 원피스", category: "원피스", price: 62000, stock: 4, img: "img/product-8.svg", size: "M (가슴단면 44cm · 총장 112cm)", condition: "A (사용감 적음)", desc: "골이 고운 브라운 코듀로이 멜빵 원피스. 블라우스나 터틀넥과 레이어드하기 좋아요." }
];

// ---------- 회원 등급 데이터 (grades 테이블) ----------
// minSpent: 누적 구매 금액 기준 / rate: 적립률
const GRADES = [
  { level: 1, name: "WHITE", minSpent: 0, rate: 0.01 },
  { level: 2, name: "IVORY", minSpent: 100000, rate: 0.03 },
  { level: 3, name: "BEIGE", minSpent: 300000, rate: 0.05 },
  { level: 4, name: "CAMEL", minSpent: 600000, rate: 0.07 }
];

// ---------- 쇼핑몰 설정값 ----------
const CATEGORIES = ["전체", "상의", "하의", "신발", "원피스"];
const SIGNUP_POINT = 3000;        // 가입 축하 포인트
const FREE_SHIPPING = 50000;      // 무료 배송 기준
const SHIPPING_FEE = 3000;        // 기본 배송비
const SLIDE_INTERVAL = 6000;      // 슬라이드 교차 간격 (6초)

/* =========================================================
   저장소 (나중에 서버 API 호출로 바꿀 부분)
   ========================================================= */
const KEY = {
  users: "aa_users",
  session: "aa_session",
  cart: "aa_cart",
  orders: "aa_orders",
  stock: "aa_stock"
};

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      showToast("브라우저 저장 공간을 사용할 수 없어요.");
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
  }
};

/* ---------- 상태 ---------- */
const state = {
  category: "전체",
  keyword: "",
  sort: "default",
  detailQty: 1
};

/* =========================================================
   공통 도우미
   ========================================================= */
const $ = (sel) => document.querySelector(sel);

function won(n) {
  return Number(n).toLocaleString("ko-KR") + "원";
}
function pt(n) {
  return Number(n).toLocaleString("ko-KR") + "P";
}
// 사용자가 입력한 글자를 화면에 안전하게 넣기
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatDate(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

let toastTimer = null;
function showToast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2200);
}

const ICON = {
  user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  bag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  logout: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/></svg>'
};

/* =========================================================
   상품 · 재고
   ========================================================= */
function getProduct(id) {
  return PRODUCTS.find((p) => p.id === Number(id));
}
// 판매된 수량을 반영한 남은 재고
function getStock(id) {
  const sold = store.get(KEY.stock, {});
  const product = getProduct(id);
  if (!product) return 0;
  return Math.max(0, product.stock - (sold[id] || 0));
}
function reduceStock(id, qty) {
  const sold = store.get(KEY.stock, {});
  sold[id] = (sold[id] || 0) + qty;
  store.set(KEY.stock, sold);
}

/* =========================================================
   회원 · 등급 · 포인트
   ========================================================= */
function getUsers() { return store.get(KEY.users, []); }
function saveUsers(users) { store.set(KEY.users, users); }

function currentUser() {
  const email = store.get(KEY.session, null);
  if (!email) return null;
  return getUsers().find((u) => u.email === email) || null;
}
function updateUser(user) {
  const users = getUsers().map((u) => (u.email === user.email ? user : u));
  saveUsers(users);
}

// 누적 구매 금액으로 등급 찾기
function getGrade(totalSpent) {
  let grade = GRADES[0];
  GRADES.forEach((g) => { if (totalSpent >= g.minSpent) grade = g; });
  return grade;
}
function getNextGrade(grade) {
  return GRADES.find((g) => g.level === grade.level + 1) || null;
}

function addPointLog(user, amount, memo) {
  user.pointLog = user.pointLog || [];
  user.pointLog.unshift({ date: new Date().toISOString(), amount, memo });
}

/* 회원가입 */
function signup({ name, email, password, phone }) {
  const users = getUsers();
  if (users.some((u) => u.email === email)) {
    return { ok: false, message: "이미 가입된 이메일이에요." };
  }
  const user = {
    email,
    name,
    // ※ 연습용으로 브라우저에 저장합니다. 데이터베이스로 옮길 때는
    //   반드시 서버에서 비밀번호를 암호화(해시)해서 저장하세요.
    password,
    phone,
    points: 0,
    totalSpent: 0,
    joinedAt: new Date().toISOString(),
    pointLog: []
  };
  user.points += SIGNUP_POINT;
  addPointLog(user, SIGNUP_POINT, "신규 가입 축하 포인트");
  users.push(user);
  saveUsers(users);
  store.set(KEY.session, email);
  return { ok: true };
}

/* 로그인 · 로그아웃 */
function login(email, password) {
  const user = getUsers().find((u) => u.email === email && u.password === password);
  if (!user) return false;
  store.set(KEY.session, email);
  return true;
}
function logout() {
  store.remove(KEY.session);
  renderHeader();
  showToast("로그아웃되었어요.");
  location.hash = "#home";
}

/* =========================================================
   장바구니
   ========================================================= */
function getCart() {
  // 없어진 상품은 걸러내기
  return store.get(KEY.cart, []).filter((item) => getProduct(item.id));
}
function saveCart(cart) {
  store.set(KEY.cart, cart);
  renderHeader();
}
function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}
function addToCart(id, qty) {
  const stock = getStock(id);
  if (stock <= 0) {
    showToast("품절된 상품이에요.");
    return false;
  }
  const cart = getCart();
  const found = cart.find((item) => item.id === id);
  const already = found ? found.qty : 0;
  if (already + qty > stock) {
    showToast(`재고가 ${stock}개 남아 있어요. (장바구니에 ${already}개)`);
    return false;
  }
  if (found) found.qty += qty;
  else cart.push({ id, qty });
  saveCart(cart);
  return true;
}
function changeCartQty(id, diff) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  const next = item.qty + diff;
  if (next < 1) return;
  if (next > getStock(id)) {
    showToast(`재고가 ${getStock(id)}개 남아 있어요.`);
    return;
  }
  item.qty = next;
  saveCart(cart);
  renderCart();
}
function removeFromCart(id) {
  saveCart(getCart().filter((i) => i.id !== id));
  renderCart();
  showToast("장바구니에서 삭제했어요.");
}
function calcCart(cart) {
  const subtotal = cart.reduce((sum, item) => sum + getProduct(item.id).price * item.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  return { subtotal, shipping, total: subtotal + shipping };
}

/* =========================================================
   화면: 머리말
   ========================================================= */
function renderHeader() {
  const user = currentUser();
  const count = cartCount();
  let html = "";
  if (user) {
    const grade = getGrade(user.totalSpent);
    html += `<a href="#mypage" class="util-link" title="마이페이지">${ICON.user}<span class="util-text">${esc(user.name)}님</span> <span class="grade-badge">${grade.name}</span></a>`;
  } else {
    html += `<a href="#login" class="util-link" title="로그인">${ICON.user}<span class="util-text">로그인</span></a>`;
  }
  html += `<a href="#cart" class="util-link" title="장바구니">${ICON.bag}<span class="util-text">장바구니</span> <span class="cart-count">${count}</span></a>`;
  $("#headerUtil").innerHTML = html;
}

/* =========================================================
   화면: 첫 화면 슬라이드 (6초마다 교차)
   ========================================================= */
function initHero() {
  const slides = document.querySelectorAll(".hero-slide");
  const dotsBox = $("#heroDots");
  let index = 0;
  let timer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero-dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `${i + 1}번 슬라이드`);
    dot.addEventListener("click", () => { show(i); restart(); });
    dotsBox.appendChild(dot);
  });
  const dots = dotsBox.querySelectorAll(".hero-dot");

  function show(i) {
    slides[index].classList.remove("is-active");
    dots[index].classList.remove("is-active");
    dots[index].setAttribute("aria-selected", "false");
    index = (i + slides.length) % slides.length;
    slides[index].classList.add("is-active");
    dots[index].classList.add("is-active");
    dots[index].setAttribute("aria-selected", "true");
  }
  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), SLIDE_INTERVAL);
  }
  dots[0].setAttribute("aria-selected", "true");
  restart();
}

/* =========================================================
   화면: 상품 목록 · 검색 · 필터 · 정렬
   ========================================================= */
function renderChips() {
  $("#filterChips").innerHTML = CATEGORIES.map((c) =>
    `<button type="button" class="chip${c === state.category ? " is-active" : ""}" data-cat="${c}" aria-pressed="${c === state.category}">${c}</button>`
  ).join("");
  document.querySelectorAll("#categoryNav a").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.cat === state.category);
  });
}

function filteredProducts() {
  const word = state.keyword.trim().toLowerCase();
  let list = PRODUCTS.filter((p) => {
    const okCat = state.category === "전체" || p.category === state.category;
    const okWord = !word || p.name.toLowerCase().includes(word) || p.category.includes(word);
    return okCat && okWord;
  });
  if (state.sort === "low") list = list.slice().sort((a, b) => a.price - b.price);
  if (state.sort === "high") list = list.slice().sort((a, b) => b.price - a.price);
  if (state.sort === "name") list = list.slice().sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return list;
}

function renderProducts() {
  renderChips();
  const list = filteredProducts();
  const word = state.keyword.trim();
  $("#shopSubtitle").textContent = state.category === "전체" ? "전체 상품" : state.category;
  $("#resultInfo").innerHTML = word
    ? `‘${esc(word)}’ 검색 결과 ${list.length}개 <button type="button" class="btn-text" id="clearSearch">검색어 지우기</button>`
    : `상품 ${list.length}개`;

  if (list.length === 0) {
    $("#productGrid").innerHTML = `<div class="empty"><p>조건에 맞는 상품이 없어요.</p><button type="button" class="btn" id="resetFilter">전체 상품 보기</button></div>`;
    return;
  }

  $("#productGrid").innerHTML = list.map((p) => {
    const stock = getStock(p.id);
    let badge = "";
    if (stock === 0) badge = `<span class="badge soldout">SOLD OUT</span>`;
    else if (stock <= 3) badge = `<span class="badge">${stock}개 남음</span>`;
    return `
      <article class="product-card">
        <a href="#product/${p.id}">
          <div class="product-thumb">
            <img src="${p.img}" alt="${esc(p.name)}" loading="lazy">
            ${badge}
          </div>
          <div class="product-info">
            <span class="product-cat">${p.category}</span>
            <h3 class="product-name">${esc(p.name)}</h3>
            <p class="product-price">${won(p.price)}</p>
          </div>
        </a>
      </article>`;
  }).join("");
}

function resetFilters() {
  state.category = "전체";
  state.keyword = "";
  $("#searchInput").value = "";
  renderProducts();
}

/* =========================================================
   화면: 상품 상세
   ========================================================= */
function renderDetail(id) {
  const p = getProduct(id);
  const box = $("#productDetail");
  if (!p) {
    box.innerHTML = `<div class="empty"><p>상품을 찾을 수 없어요.</p><a href="#shop" class="btn">목록으로</a></div>`;
    return;
  }
  const stock = getStock(p.id);
  const user = currentUser();
  const rate = getGrade(user ? user.totalSpent : 0).rate;
  state.detailQty = 1;

  box.innerHTML = `
    <a href="#shop" class="back-link">← 목록으로</a>
    <div class="detail">
      <div class="detail-img"><img src="${p.img}" alt="${esc(p.name)}"></div>
      <div class="detail-info">
        <span class="product-cat">${p.category}</span>
        <h2>${esc(p.name)}</h2>
        <p class="detail-price">${won(p.price)}</p>
        <p class="detail-point">${user ? `${getGrade(user.totalSpent).name} 등급` : "WHITE 등급 기준"} · ${Math.round(rate * 100)}% 적립 예정 (${pt(Math.floor(p.price * rate))})</p>
        <p class="detail-desc">${esc(p.desc)}</p>
        <table class="spec">
          <tr><th>사이즈</th><td>${esc(p.size)}</td></tr>
          <tr><th>상태</th><td>${esc(p.condition)}</td></tr>
          <tr><th>재고</th><td>${stock > 0 ? `${stock}개` : "품절"}</td></tr>
          <tr><th>배송</th><td>${won(FREE_SHIPPING)} 이상 무료 · 기본 ${won(SHIPPING_FEE)}</td></tr>
        </table>
        <div class="detail-qty">
          <div class="qty">
            <button type="button" id="dMinus" aria-label="수량 빼기">−</button>
            <span id="dQty">1</span>
            <button type="button" id="dPlus" aria-label="수량 더하기">+</button>
          </div>
          <span class="detail-total" id="dTotal">${won(p.price)}</span>
        </div>
        <div class="detail-actions">
          <button type="button" class="btn" id="dCart" ${stock === 0 ? "disabled" : ""}>장바구니 담기</button>
          <button type="button" class="btn btn-dark" id="dBuy" ${stock === 0 ? "disabled" : ""}>${stock === 0 ? "품절" : "바로 구매"}</button>
        </div>
      </div>
    </div>`;

  const updateQty = () => {
    $("#dQty").textContent = state.detailQty;
    $("#dTotal").textContent = won(p.price * state.detailQty);
    $("#dMinus").disabled = state.detailQty <= 1;
    $("#dPlus").disabled = state.detailQty >= stock;
  };
  $("#dMinus").addEventListener("click", () => { if (state.detailQty > 1) { state.detailQty--; updateQty(); } });
  $("#dPlus").addEventListener("click", () => { if (state.detailQty < stock) { state.detailQty++; updateQty(); } });
  $("#dCart").addEventListener("click", () => {
    if (addToCart(p.id, state.detailQty)) showToast("장바구니에 담았어요.");
  });
  $("#dBuy").addEventListener("click", () => {
    const inCart = getCart().find((i) => i.id === p.id);
    // 이미 담겨 있으면 그대로 주문으로, 아니면 담고 이동
    if (inCart || addToCart(p.id, state.detailQty)) location.hash = "#checkout";
  });
  updateQty();
}

/* =========================================================
   화면: 장바구니
   ========================================================= */
function renderCart() {
  const cart = getCart();
  const area = $("#cartArea");
  if (cart.length === 0) {
    area.innerHTML = `<div class="empty"><p>장바구니가 비어 있어요.</p><a href="#shop" class="btn btn-dark" data-cat="전체">쇼핑하러 가기</a></div>`;
    return;
  }
  const { subtotal, shipping, total } = calcCart(cart);
  const left = FREE_SHIPPING - subtotal;

  area.innerHTML = `
    <div class="cart-layout">
      <ul class="cart-list">
        ${cart.map((item) => {
          const p = getProduct(item.id);
          const stock = getStock(p.id);
          return `
          <li class="cart-item">
            <a href="#product/${p.id}"><img src="${p.img}" alt="${esc(p.name)}"></a>
            <div>
              <p class="cart-item-name"><a href="#product/${p.id}">${esc(p.name)}</a></p>
              <p class="cart-item-meta">${p.category} · ${won(p.price)} · 재고 ${stock}개</p>
              <div class="qty">
                <button type="button" data-act="minus" data-id="${p.id}" aria-label="${esc(p.name)} 수량 빼기" ${item.qty <= 1 ? "disabled" : ""}>−</button>
                <span>${item.qty}</span>
                <button type="button" data-act="plus" data-id="${p.id}" aria-label="${esc(p.name)} 수량 더하기" ${item.qty >= stock ? "disabled" : ""}>+</button>
              </div>
            </div>
            <div class="cart-item-side">
              <span class="cart-item-sum">${won(p.price * item.qty)}</span>
              <button type="button" class="btn-text" data-act="remove" data-id="${p.id}">삭제</button>
            </div>
          </li>`;
        }).join("")}
      </ul>
      <aside class="card">
        <h3>결제 예정 금액</h3>
        <div class="summary-row"><span>상품 금액</span><span>${won(subtotal)}</span></div>
        <div class="summary-row"><span>배송비</span><span>${shipping ? won(shipping) : "무료"}</span></div>
        <div class="summary-row total"><span>합계</span><span id="cartTotal">${won(total)}</span></div>
        <p class="summary-note">${left > 0 ? `${won(left)} 더 담으면 무료 배송이에요.` : "무료 배송 조건을 채웠어요."}</p>
        <a href="#checkout" class="btn btn-dark btn-block">주문하기</a>
      </aside>
    </div>`;
}

/* =========================================================
   화면: 체험 결제
   ========================================================= */
function renderCheckout() {
  const area = $("#checkoutArea");
  const user = currentUser();
  const cart = getCart();

  if (!user) {
    area.innerHTML = `<div class="empty"><p>주문하려면 로그인이 필요해요.</p><a href="#login" class="btn btn-dark">로그인</a> <a href="#signup" class="btn">회원가입</a></div>`;
    sessionStorage.setItem("aa_after_login", "#checkout");
    return;
  }
  if (cart.length === 0) {
    area.innerHTML = `<div class="empty"><p>주문할 상품이 없어요.</p><a href="#shop" class="btn btn-dark" data-cat="전체">쇼핑하러 가기</a></div>`;
    return;
  }

  const { subtotal, shipping } = calcCart(cart);
  const grade = getGrade(user.totalSpent);
  const maxUse = Math.min(user.points, subtotal);

  area.innerHTML = `
    <form class="checkout-layout" id="checkoutForm" novalidate>
      <div class="form-card">
        <h3>배송 정보</h3>
        <div class="field"><label for="coName">받는 분</label><input id="coName" value="${esc(user.name)}" required></div>
        <div class="field"><label for="coPhone">연락처</label><input id="coPhone" type="tel" value="${esc(user.phone || "")}" placeholder="010-0000-0000" required></div>
        <div class="field"><label for="coAddr">주소</label><input id="coAddr" placeholder="도로명 주소와 상세 주소" required></div>
        <div class="field"><label for="coMemo">배송 메모 <small>(선택)</small></label>
          <select id="coMemo">
            <option>문 앞에 놓아 주세요</option>
            <option>경비실에 맡겨 주세요</option>
            <option>배송 전 연락 부탁드려요</option>
          </select>
        </div>

        <h3>포인트 사용</h3>
        <div class="field">
          <label for="coPoint">보유 ${pt(user.points)} · 최대 ${pt(maxUse)} 사용 가능</label>
          <div class="field-row">
            <input id="coPoint" type="number" min="0" max="${maxUse}" step="1" value="0" inputmode="numeric">
            <button type="button" class="btn" id="useAll">전액 사용</button>
          </div>
        </div>

        <h3>결제 수단 <small class="muted">(체험용)</small></h3>
        <div class="pay-options">
          <label class="pay-option"><input type="radio" name="pay" value="체험 카드" checked> 체험 카드</label>
          <label class="pay-option"><input type="radio" name="pay" value="체험 계좌이체"> 체험 계좌이체</label>
        </div>
      </div>

      <aside class="card">
        <h3>주문 상품</h3>
        <ul class="checkout-items">
          ${cart.map((item) => {
            const p = getProduct(item.id);
            return `<li><span>${esc(p.name)} × ${item.qty}</span><span>${won(p.price * item.qty)}</span></li>`;
          }).join("")}
        </ul>
        <div class="summary-row"><span>상품 금액</span><span>${won(subtotal)}</span></div>
        <div class="summary-row"><span>배송비</span><span>${shipping ? won(shipping) : "무료"}</span></div>
        <div class="summary-row"><span>포인트 사용</span><span class="minus" id="coUsed">-0P</span></div>
        <div class="summary-row total"><span>최종 결제 금액</span><span id="coTotal">${won(subtotal + shipping)}</span></div>
        <p class="summary-note" id="coEarn"></p>
        <label class="check"><input type="checkbox" id="coAgree"> 주문 내용을 확인했어요 (체험 결제)</label>
        <p class="form-msg" id="coMsg" role="alert"></p>
        <button type="submit" class="btn btn-dark btn-block">체험 결제하기</button>
      </aside>
    </form>`;

  const pointInput = $("#coPoint");
  const usedPoint = () => {
    let v = Math.floor(Number(pointInput.value) || 0);
    if (v < 0) v = 0;
    if (v > maxUse) v = maxUse;
    return v;
  };
  const refresh = () => {
    const used = usedPoint();
    const payBase = subtotal - used;               // 적립 기준 (배송비 제외)
    $("#coUsed").textContent = "-" + pt(used);
    $("#coTotal").textContent = won(payBase + shipping);
    $("#coEarn").textContent = `${grade.name} 등급 ${Math.round(grade.rate * 100)}% 적립 예정: ${pt(Math.floor(payBase * grade.rate))}`;
  };
  pointInput.addEventListener("input", refresh);
  pointInput.addEventListener("blur", () => { pointInput.value = usedPoint(); refresh(); });
  $("#useAll").addEventListener("click", () => { pointInput.value = maxUse; refresh(); });
  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    placeOrder(usedPoint());
  });
  refresh();
}

function placeOrder(usedPoints) {
  const msg = $("#coMsg");
  const name = $("#coName").value.trim();
  const phone = $("#coPhone").value.trim();
  const addr = $("#coAddr").value.trim();

  if (!name || !phone || !addr) { msg.textContent = "받는 분, 연락처, 주소를 모두 입력해 주세요."; return; }
  if (!/^[0-9-]{9,13}$/.test(phone)) { msg.textContent = "연락처는 숫자와 - 만 입력해 주세요."; return; }
  if (!$("#coAgree").checked) { msg.textContent = "주문 내용 확인에 체크해 주세요."; return; }

  const user = currentUser();
  const cart = getCart();
  // 주문 직전에 재고 다시 확인
  for (const item of cart) {
    if (item.qty > getStock(item.id)) {
      msg.textContent = `‘${getProduct(item.id).name}’ 재고가 부족해요. 장바구니를 확인해 주세요.`;
      return;
    }
  }

  const { subtotal, shipping } = calcCart(cart);
  const used = Math.min(usedPoints, user.points, subtotal);
  const payBase = subtotal - used;
  const grade = getGrade(user.totalSpent);
  const earned = Math.floor(payBase * grade.rate);
  const now = new Date();

  const order = {
    orderId: "AA" + now.getTime().toString().slice(-9),
    email: user.email,
    items: cart.map((item) => {
      const p = getProduct(item.id);
      return { id: p.id, name: p.name, price: p.price, qty: item.qty };
    }),
    subtotal,
    shipping,
    usedPoints: used,
    total: payBase + shipping,
    grade: grade.name,
    rate: grade.rate,
    earnedPoints: earned,
    receiver: { name, phone, addr, memo: $("#coMemo").value },
    payMethod: document.querySelector('input[name="pay"]:checked').value,
    status: "주문 완료 (체험 결제)",
    createdAt: now.toISOString()
  };

  // 저장: 주문 · 재고 · 회원 포인트
  const orders = store.get(KEY.orders, []);
  orders.unshift(order);
  store.set(KEY.orders, orders);
  cart.forEach((item) => reduceStock(item.id, item.qty));

  const beforeGrade = grade.name;
  if (used > 0) {
    user.points -= used;
    addPointLog(user, -used, `주문 ${order.orderId} 포인트 사용`);
  }
  user.points += earned;
  addPointLog(user, earned, `주문 ${order.orderId} 구매 적립 (${Math.round(grade.rate * 100)}%)`);
  user.totalSpent += payBase;
  if (!user.phone) user.phone = phone;
  updateUser(user);

  saveCart([]);
  const afterGrade = getGrade(user.totalSpent).name;
  sessionStorage.setItem("aa_grade_up", afterGrade !== beforeGrade ? afterGrade : "");
  location.hash = "#complete/" + order.orderId;
}

/* =========================================================
   화면: 주문 완료
   ========================================================= */
function renderComplete(orderId) {
  const order = store.get(KEY.orders, []).find((o) => o.orderId === orderId);
  const user = currentUser();
  const area = $("#completeArea");
  if (!order || !user || order.email !== user.email) {
    area.innerHTML = `<div class="empty"><p>주문 정보를 찾을 수 없어요.</p><a href="#mypage" class="btn">마이페이지</a></div>`;
    return;
  }
  const gradeUp = sessionStorage.getItem("aa_grade_up");
  sessionStorage.removeItem("aa_grade_up");

  area.innerHTML = `
    <div class="complete">
      <div class="complete-mark" aria-hidden="true">✓</div>
      <h2 class="page-title">주문이 완료되었어요</h2>
      <p class="muted">체험 결제라 실제 결제는 되지 않았고, 주문 내역만 저장했어요.</p>
      ${gradeUp ? `<p class="notice">축하해요! 회원 등급이 <strong>${gradeUp}</strong>(으)로 올랐어요.</p>` : ""}
      <div class="card">
        <div class="summary-row"><span>주문 번호</span><strong>${order.orderId}</strong></div>
        <div class="summary-row"><span>주문 일시</span><span>${formatDate(order.createdAt)}</span></div>
        <div class="summary-row"><span>상품</span><span>${order.items.map((i) => `${esc(i.name)} × ${i.qty}`).join("<br>")}</span></div>
        <div class="summary-row"><span>결제 수단</span><span>${esc(order.payMethod)}</span></div>
        <div class="summary-row"><span>포인트 사용</span><span>-${pt(order.usedPoints)}</span></div>
        <div class="summary-row"><span>적립 포인트</span><span>+${pt(order.earnedPoints)}</span></div>
        <div class="summary-row total"><span>결제 금액</span><span>${won(order.total)}</span></div>
      </div>
      <div class="complete-actions">
        <a href="#mypage" class="btn btn-dark">주문 내역 보기</a>
        <a href="#shop" class="btn" data-cat="전체">쇼핑 계속하기</a>
      </div>
    </div>`;
}

/* =========================================================
   화면: 마이페이지
   ========================================================= */
function renderMypage() {
  const user = currentUser();
  const area = $("#mypageArea");
  if (!user) { location.hash = "#login"; return; }

  const grade = getGrade(user.totalSpent);
  const next = getNextGrade(grade);
  const orders = store.get(KEY.orders, []).filter((o) => o.email === user.email);
  let progress = 100;
  let progressText = "최고 등급이에요. 언제나 감사합니다!";
  if (next) {
    progress = Math.min(100, Math.round(((user.totalSpent - grade.minSpent) / (next.minSpent - grade.minSpent)) * 100));
    progressText = `${next.name}까지 ${won(next.minSpent - user.totalSpent)} 남았어요.`;
  }

  area.innerHTML = `
    <div class="mypage-head">
      <h2 class="page-title">${esc(user.name)}님의 마이페이지</h2>
      <button type="button" class="btn" id="logoutBtn">${ICON.logout} 로그아웃</button>
    </div>

    <div class="mypage-grid">
      <div class="card">
        <p class="stat-label">회원 등급</p>
        <p class="stat-value">${grade.name}</p>
        <div class="progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
        <p class="progress-text">${progressText}</p>
      </div>
      <div class="card">
        <p class="stat-label">보유 포인트</p>
        <p class="stat-value">${pt(user.points)}</p>
        <p class="progress-text">구매 금액의 ${Math.round(grade.rate * 100)}% 적립 중</p>
      </div>
      <div class="card">
        <p class="stat-label">누적 구매 금액</p>
        <p class="stat-value">${won(user.totalSpent)}</p>
        <p class="progress-text">가입일 ${formatDate(user.joinedAt).slice(0, 10)} · ${esc(user.email)}</p>
      </div>
    </div>

    <div class="mypage-cols">
      <div class="card">
        <h3>주문 내역 (${orders.length})</h3>
        ${orders.length === 0 ? `<p class="muted">아직 주문 내역이 없어요.</p>` : `
        <ul class="order-list">
          ${orders.map((o) => `
            <li class="order-item">
              <div class="order-top"><span>${formatDate(o.createdAt)} · ${o.orderId}</span><span class="order-status">${esc(o.status)}</span></div>
              <p class="order-names">${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join(", ")}</p>
              <p class="order-sum">${won(o.total)} <small>· ${o.grade} ${Math.round(o.rate * 100)}% 적립 +${pt(o.earnedPoints)}</small></p>
            </li>`).join("")}
        </ul>`}
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <h3>등급별 적립 혜택</h3>
          <table class="grade-table">
            <thead><tr><th>등급</th><th>누적 구매</th><th>적립률</th></tr></thead>
            <tbody>
              ${GRADES.map((g) => `<tr class="${g.level === grade.level ? "is-mine" : ""}"><td>${g.name}</td><td>${g.minSpent === 0 ? "가입 시" : won(g.minSpent) + " 이상"}</td><td>${Math.round(g.rate * 100)}%</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="card">
          <h3>포인트 내역</h3>
          <ul class="point-list">
            ${(user.pointLog || []).map((l) => `
              <li><span>${esc(l.memo)}<span class="point-date">${formatDate(l.date)}</span></span>
              <span class="${l.amount < 0 ? "minus" : "plus"}">${l.amount < 0 ? "" : "+"}${pt(l.amount)}</span></li>`).join("")}
          </ul>
        </div>
      </div>
    </div>`;
  $("#logoutBtn").addEventListener("click", logout);
}

/* =========================================================
   화면 전환 (주소의 # 로 구분)
   #home  #shop  #product/1  #cart  #checkout  #complete/주문번호
   #login  #signup  #mypage
   ========================================================= */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => {
    v.hidden = v.dataset.view !== name;
  });
}

function router() {
  const hash = location.hash.replace("#", "") || "home";
  const [page, param] = hash.split("/");

  switch (page) {
    case "home":
      showView("home");
      renderProducts();
      window.scrollTo(0, 0);
      return;
    case "shop":
      showView("home");
      renderProducts();
      $("#shop").scrollIntoView();
      return;
    case "product":
      showView("product"); renderDetail(param); break;
    case "cart":
      showView("cart"); renderCart(); break;
    case "checkout":
      showView("checkout"); renderCheckout(); break;
    case "complete":
      showView("complete"); renderComplete(param); break;
    case "login":
      if (currentUser()) { location.hash = "#mypage"; return; }
      showView("login"); break;
    case "signup":
      if (currentUser()) { location.hash = "#mypage"; return; }
      showView("signup"); break;
    case "mypage":
      if (!currentUser()) {
        sessionStorage.setItem("aa_after_login", "#mypage");
        showToast("로그인이 필요해요.");
        location.hash = "#login";
        return;
      }
      showView("mypage"); renderMypage(); break;
    default:
      location.hash = "#home";
      return;
  }
  window.scrollTo(0, 0);
}

/* =========================================================
   이벤트 연결
   ========================================================= */
function goAfterLogin() {
  const next = sessionStorage.getItem("aa_after_login") || "#mypage";
  sessionStorage.removeItem("aa_after_login");
  location.hash = next;
}

function bindEvents() {
  // 검색
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.keyword = $("#searchInput").value;
    state.category = "전체";
    if (location.hash === "#shop") router();
    else location.hash = "#shop";
  });

  // 정렬
  $("#sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderProducts();
  });

  // 분류 링크·칩·버튼 (data-cat 이 붙은 모든 요소)
  document.addEventListener("click", (e) => {
    const catEl = e.target.closest("[data-cat]");
    if (catEl) {
      state.category = catEl.dataset.cat;
      if (catEl.classList.contains("chip")) {
        renderProducts();
      } else if (location.hash === "#shop") {
        e.preventDefault();
        router();
      }
      return;
    }
    if (e.target.closest("#clearSearch") || e.target.closest("#resetFilter")) {
      resetFilters();
      return;
    }
    // 장바구니 수량·삭제
    const actEl = e.target.closest("[data-act]");
    if (actEl) {
      const id = Number(actEl.dataset.id);
      if (actEl.dataset.act === "plus") changeCartQty(id, 1);
      if (actEl.dataset.act === "minus") changeCartQty(id, -1);
      if (actEl.dataset.act === "remove") removeFromCart(id);
    }
  });

  // 로그인
  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#loginEmail").value.trim().toLowerCase();
    const pw = $("#loginPw").value;
    if (!email || !pw) { $("#loginMsg").textContent = "이메일과 비밀번호를 입력해 주세요."; return; }
    if (!login(email, pw)) { $("#loginMsg").textContent = "이메일 또는 비밀번호가 맞지 않아요."; return; }
    $("#loginMsg").textContent = "";
    e.target.reset();
    renderHeader();
    showToast(`${currentUser().name}님, 반가워요!`);
    goAfterLogin();
  });

  // 회원가입
  $("#signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#signupMsg");
    const name = $("#suName").value.trim();
    const email = $("#suEmail").value.trim().toLowerCase();
    const pw = $("#suPw").value;
    const pw2 = $("#suPw2").value;
    const phone = $("#suPhone").value.trim();

    if (!name) { msg.textContent = "이름을 입력해 주세요."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "이메일 형식을 확인해 주세요."; return; }
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) { msg.textContent = "비밀번호는 영문과 숫자를 섞어 8자 이상으로 입력해 주세요."; return; }
    if (pw !== pw2) { msg.textContent = "비밀번호가 서로 달라요."; return; }
    if (phone && !/^[0-9-]{9,13}$/.test(phone)) { msg.textContent = "휴대폰 번호는 숫자와 - 만 입력해 주세요."; return; }
    if (!$("#suAgree").checked) { msg.textContent = "필수 약관에 동의해 주세요."; return; }

    const result = signup({ name, email, password: pw, phone });
    if (!result.ok) { msg.textContent = result.message; return; }
    msg.textContent = "";
    e.target.reset();
    renderHeader();
    showToast(`가입을 환영해요! ${pt(SIGNUP_POINT)}가 적립되었어요.`);
    goAfterLogin();
  });

  window.addEventListener("hashchange", router);
}

/* =========================================================
   시작
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  initHero();
  bindEvents();
  router();
});
