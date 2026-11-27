/* =========================================================
   ATELIER ARCHIVE — script.js
   ---------------------------------------------------------
   불러오는 순서: supabase-js(CDN) → db.js → script.js
   · 회원(가입·로그인·로그아웃·내 정보)과 상품은 Supabase 를 씁니다.
     연결 변수 db 와 표 이름 TABLE 은 db.js 에 있어요.
   · 장바구니와 주문은 아직 브라우저(localStorage)에 둡니다.
     장바구니에는 shop_products 표의 id 와 수량만 담아요.
   ========================================================= */

// ---------- 상품 (shop_products 표) ----------
// 읽어 올 열 이름 (표와 똑같이)
const PRODUCT_COLUMNS = "id, name, category, price, stock, image_url, is_active, created_at";
// image_url 이 비었거나 그림을 못 불러올 때 보여 줄 기본 그림
const DEFAULT_IMG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">' +
  '<rect width="400" height="500" fill="#f3ece2"/>' +
  '<path d="M150 170l50-30 50 30 40 30-25 40-25-15v125H160V225l-25 15-25-40z" fill="none" stroke="#d9c8b0" stroke-width="10" stroke-linejoin="round"/>' +
  '<text x="200" y="430" font-family="sans-serif" font-size="26" fill="#8a7d70" text-anchor="middle">NO IMAGE</text></svg>'
);

// ---------- 회원 등급 ----------
// code: DB(shop_profiles.grade)에 저장된 값 / name: 쇼핑몰 화면에 보여 줄 이름
// grade 는 DB 가 정해요. 화면에서는 읽어서 이름만 바꿔 보여 줍니다.
const GRADES = [
  { level: 1, code: "WELCOME", name: "WHITE", rate: 0.01 },
  { level: 2, code: "SILVER",  name: "IVORY", rate: 0.03 },
  { level: 3, code: "GOLD",    name: "BEIGE", rate: 0.05 },
  { level: 4, code: "VIP",     name: "CAMEL", rate: 0.07 }
];

// ---------- 쇼핑몰 설정값 ----------
const CATEGORIES = ["전체", "상의", "하의", "신발", "원피스"];
const SIGNUP_POINT = 3000;        // 가입 축하 포인트 (DB 가 넣어 줌 · 안내 문구용)
const FREE_SHIPPING = 50000;      // 무료 배송 기준
const SHIPPING_FEE = 3000;        // 기본 배송비
const SLIDE_INTERVAL = 6000;      // 슬라이드 교차 간격 (6초)
const NO_DB = "데이터베이스에 연결하지 못했어요. 잠시 후 새로 고침해 주세요.";

/* =========================================================
   브라우저 저장소 — 장바구니 · 주문만 (회원 정보 · 재고는 저장하지 않음)
   ========================================================= */
const KEY = {
  cart: "aa_cart_v2",   // [{ id: shop_products.id, qty }]
  orders: "aa_orders"
};
// 예전 버전이 남긴 이름들 (회원 목록·비밀번호·로그인 기록, 배열 id 로 담긴 장바구니, 화면에서 줄이던 재고)
const OLD_KEYS = ["aa_users", "aa_session", "aa_cart", "aa_stock"];

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

// 로그인 상태 (메모리에만 보관 · 새로 고침하면 getSession 으로 다시 확인)
const auth = {
  ready: false,   // 처음 로그인 확인이 끝났는지
  user: null,     // Supabase 로그인 사용자
  profile: null   // shop_profiles 의 내 한 줄
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
function showToast(message, duration = 2200) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), duration);
}

// 폼 제출 중에는 버튼을 잠가 두 번 눌리지 않게
function setBusy(form, busy) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = busy;
}

const ICON = {
  user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  join: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="8" r="4"/><path d="M2 21c1.5-4 4.5-6 8-6 1.6 0 3 .4 4.3 1.1"/><path d="M19 14v6M16 17h6"/></svg>',
  bag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  logout: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/></svg>'
};

/* =========================================================
   상품 (shop_products 에서 읽기만 · 넣고 고치는 일은 관리자만)
   ========================================================= */
function stockOf(p) {
  return Math.max(0, Number(p.stock) || 0);
}
function imgSrc(p) {
  const url = p && typeof p.image_url === "string" ? p.image_url.trim() : "";
  return url || DEFAULT_IMG;
}
// 경로가 틀려서 그림을 못 불러오면 기본 그림으로
function imgFallback(el) {
  el.onerror = null;
  el.src = DEFAULT_IMG;
}
function imgTag(p, lazy) {
  return `<img src="${esc(imgSrc(p))}" alt="${esc(p.name)}"${lazy ? ' loading="lazy"' : ""} onerror="imgFallback(this)">`;
}
// 검색어의 % _ \ 를 글자 그대로 찾도록
function escapeLike(word) {
  return word.replace(/[\\%_]/g, (m) => "\\" + m);
}

// 목록: 판매 중(is_active)인 상품, 분류 · 검색어 · 정렬 반영
async function fetchProducts({ category, keyword, sort }) {
  if (!db) return { data: null, error: { message: NO_DB } };
  let query = db
    .from(TABLE.products)
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true);

  if (category && category !== "전체") query = query.eq("category", category);

  const word = (keyword || "").trim();
  if (word) query = query.ilike("name", `%${escapeLike(word)}%`);   // 대소문자 구분 없이

  if (sort === "low") query = query.order("price", { ascending: true });
  else if (sort === "high") query = query.order("price", { ascending: false });
  else if (sort === "name") query = query.order("name", { ascending: true });
  query = query.order("id", { ascending: true });                  // 기본: id 순

  return await query;
}

// 상세: id 로 한 건만
async function fetchProduct(id) {
  if (!db) return { data: null, error: { message: NO_DB } };
  const num = Number(id);
  if (!Number.isInteger(num)) return { data: null, error: null };
  return await db
    .from(TABLE.products)
    .select(PRODUCT_COLUMNS)
    .eq("id", num)
    .eq("is_active", true)
    .maybeSingle();
}

// 장바구니용: 여러 id 를 한 번에
async function fetchProductsByIds(ids) {
  if (!ids.length) return { data: [], error: null };
  if (!db) return { data: null, error: { message: NO_DB } };
  return await db
    .from(TABLE.products)
    .select(PRODUCT_COLUMNS)
    .in("id", ids)
    .eq("is_active", true);
}

/* =========================================================
   회원 · 등급 (Supabase)
   ========================================================= */
// DB 의 grade 값으로 화면용 등급 찾기 (모르는 값이면 첫 등급)
function getGrade(code) {
  return GRADES.find((g) => g.code === code) || GRADES[0];
}
function getNextGrade(grade) {
  return GRADES.find((g) => g.level === grade.level + 1) || null;
}
function myGrade() {
  return getGrade(auth.profile ? auth.profile.grade : null);
}
function displayName() {
  if (auth.profile && auth.profile.name) return auth.profile.name;
  const meta = auth.user && auth.user.user_metadata;
  if (meta && meta.name) return meta.name;
  return auth.user ? auth.user.email : "";
}

// Supabase 오류 → 한글 안내문
function authErrorText(error) {
  const code = error.code || "";
  const msg = (error.message || "").toLowerCase();
  if (code === "user_already_exists" || msg.includes("already registered")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않아요.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "이메일 인증이 아직 안 됐어요. 받은 메일의 링크를 먼저 눌러 주세요.";
  if (code === "weak_password" || msg.includes("password should be")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (code === "email_address_invalid" || (msg.includes("email") && msg.includes("invalid"))) return "이메일 형식을 확인해 주세요.";
  if (code.startsWith("over_") || msg.includes("rate limit")) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (code === "signup_disabled") return "지금은 회원가입을 받을 수 없어요.";
  if (code === "PGRST116") return "회원 정보를 찾지 못했거나 저장할 권한이 없어요.";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "인터넷 연결을 확인해 주세요.";
  return `문제가 생겼어요. 잠시 후 다시 시도해 주세요. (${error.message})`;
}

// shop_profiles 에서 내 한 줄 읽기
async function loadProfile() {
  auth.profile = null;
  if (!db || !auth.user) return;
  const { data, error } = await db
    .from(TABLE.profiles)
    .select("id, email, name, phone, grade, points, role, created_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) {
    console.error(error.message);
    return;
  }
  auth.profile = data;
}

// 로그인 상태 확인 (페이지가 열릴 때 · 로그인/가입 직후)
async function loadAuth() {
  auth.user = null;
  auth.profile = null;
  if (!db) return;
  const { data, error } = await db.auth.getSession();
  if (error) {
    console.error(error.message);
    return;
  }
  auth.user = data.session ? data.session.user : null;
  await loadProfile();
}

/* 회원가입 */
async function signup({ name, email, password, phone }) {
  if (!db) return { ok: false, message: NO_DB };
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone: phone || null },
      emailRedirectTo: location.origin + location.pathname
    }
  });
  if (error) return { ok: false, message: authErrorText(error) };
  // 이메일 인증을 켜 둔 경우, 이미 가입된 이메일이면 오류 대신 빈 identities 가 와요
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, message: "이미 가입된 이메일이에요. 로그인해 주세요." };
  }
  // 이메일 인증을 켜 둔 경우: 메일 링크를 누르기 전까지 로그인되지 않아요
  if (!data.session) return { ok: true, needConfirm: true };
  await loadAuth();
  return { ok: true, needConfirm: false };
}

/* 로그인 · 로그아웃 */
async function login(email, password) {
  if (!db) return { ok: false, message: NO_DB };
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: authErrorText(error) };
  await loadAuth();
  return { ok: true };
}
async function logout() {
  if (db) {
    const { error } = await db.auth.signOut();
    if (error) console.error(error.message);
  }
  auth.user = null;
  auth.profile = null;
  renderHeader();
  showToast("로그아웃되었어요.");
  if (location.hash === "#home") router();
  else location.hash = "#home";
}

/* =========================================================
   장바구니 (브라우저에 id · 수량만 저장)
   ========================================================= */
function getCart() {
  return store.get(KEY.cart, []).filter((item) => item && item.id != null && item.qty > 0);
}
function saveCart(cart) {
  store.set(KEY.cart, cart);
  renderHeader();
}
function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}
// 장바구니 + 표의 상품 정보 합치기 (판매가 끝난 상품은 빼기)
async function loadCartItems() {
  const cart = getCart();
  const { data, error } = await fetchProductsByIds(cart.map((item) => item.id));
  if (error) return { items: null, removed: false, error };
  const map = new Map(data.map((p) => [p.id, p]));
  const items = cart
    .filter((item) => map.has(item.id))
    .map((item) => ({ product: map.get(item.id), qty: item.qty }));
  const removed = items.length !== cart.length;
  if (removed) saveCart(items.map((i) => ({ id: i.product.id, qty: i.qty })));
  return { items, removed, error: null };
}
function addToCart(product, qty) {
  const stock = stockOf(product);
  if (stock <= 0) {
    showToast("품절된 상품이에요.");
    return false;
  }
  const cart = getCart();
  const found = cart.find((item) => item.id === product.id);
  const already = found ? found.qty : 0;
  if (already + qty > stock) {
    showToast(`재고가 ${stock}개 남아 있어요. (장바구니에 ${already}개)`);
    return false;
  }
  if (found) found.qty += qty;
  else cart.push({ id: product.id, qty });
  saveCart(cart);
  return true;
}
function calcCart(items) {
  const subtotal = items.reduce((sum, i) => sum + Number(i.product.price) * i.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  return { subtotal, shipping, total: subtotal + shipping };
}

/* =========================================================
   화면: 머리말
   로그인 중: 이름 님 · 로그아웃 / 아니면: 로그인 · 회원가입
   ========================================================= */
function renderHeader() {
  const count = cartCount();
  let html = "";
  if (auth.user) {
    html += `<a href="#mypage" class="util-link" title="마이페이지">${ICON.user}<span class="util-text">${esc(displayName())} 님</span> <span class="grade-badge">${myGrade().name}</span></a>`;
    html += `<span class="util-text" aria-hidden="true">·</span>`;
    html += `<button type="button" class="util-link" id="logoutLink" title="로그아웃">${ICON.logout}<span class="util-text">로그아웃</span></button>`;
  } else {
    html += `<a href="#login" class="util-link" title="로그인">${ICON.user}<span class="util-text">로그인</span></a>`;
    html += `<span class="util-text" aria-hidden="true">·</span>`;
    html += `<a href="#signup" class="util-link" title="회원가입">${ICON.join}<span class="util-text">회원가입</span></a>`;
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

// 목록 그리기 — 늦게 도착한 예전 응답은 무시해요
let listSeq = 0;
async function renderProducts() {
  renderChips();
  const seq = ++listSeq;
  const word = state.keyword.trim();
  const filtered = Boolean(word) || state.category !== "전체";
  $("#shopSubtitle").textContent = state.category === "전체" ? "전체 상품" : state.category;
  $("#resultInfo").textContent = "불러오는 중…";
  $("#productGrid").innerHTML = `<div class="empty"><p>불러오는 중…</p></div>`;

  const { data, error } = await fetchProducts(state);
  if (seq !== listSeq) return;

  if (error) {
    console.error(error.message);
    $("#resultInfo").textContent = "";
    $("#productGrid").innerHTML = `<div class="empty"><p>상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p></div>`;
    return;
  }

  const list = data || [];
  $("#resultInfo").innerHTML = word
    ? `‘${esc(word)}’ 검색 결과 ${list.length}개 <button type="button" class="btn-text" id="clearSearch">검색어 지우기</button>`
    : `상품 ${list.length}개`;

  if (list.length === 0) {
    $("#productGrid").innerHTML = `<div class="empty"><p>상품이 없습니다.</p>${filtered ? `<button type="button" class="btn" id="resetFilter">전체 상품 보기</button>` : ""}</div>`;
    return;
  }

  $("#productGrid").innerHTML = list.map((p) => {
    const stock = stockOf(p);
    let badge = "";
    if (stock === 0) badge = `<span class="badge soldout">품절</span>`;
    else if (stock <= 3) badge = `<span class="badge">${stock}개 남음</span>`;
    return `
      <article class="product-card">
        <a href="#product/${p.id}">
          <div class="product-thumb">
            ${imgTag(p, true)}
            ${badge}
          </div>
          <div class="product-info">
            <span class="product-cat">${esc(p.category)}</span>
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
   화면: 상품 상세 (id 로 한 건)
   ========================================================= */
let detailSeq = 0;
async function renderDetail(id) {
  const box = $("#productDetail");
  const seq = ++detailSeq;
  box.innerHTML = `<a href="#shop" class="back-link">← 목록으로</a><div class="empty"><p>불러오는 중…</p></div>`;

  const { data: p, error } = await fetchProduct(id);
  if (seq !== detailSeq) return;

  if (error) {
    console.error(error.message);
    box.innerHTML = `<div class="empty"><p>상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p><a href="#shop" class="btn">목록으로</a></div>`;
    return;
  }
  if (!p) {
    box.innerHTML = `<div class="empty"><p>상품이 없습니다.</p><a href="#shop" class="btn">목록으로</a></div>`;
    return;
  }

  const stock = stockOf(p);
  const grade = myGrade();
  const rate = grade.rate;
  state.detailQty = 1;

  box.innerHTML = `
    <a href="#shop" class="back-link">← 목록으로</a>
    <div class="detail">
      <div class="detail-img">${imgTag(p, false)}</div>
      <div class="detail-info">
        <span class="product-cat">${esc(p.category)}</span>
        <h2>${esc(p.name)}</h2>
        <p class="detail-price">${won(p.price)}</p>
        <p class="detail-point">${auth.user ? `${grade.name} 등급` : `${GRADES[0].name} 등급 기준`} · ${Math.round(rate * 100)}% 적립 예정 (${pt(Math.floor(p.price * rate))})</p>
        <table class="spec">
          <tr><th>분류</th><td>${esc(p.category)}</td></tr>
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
          <button type="button" class="btn" id="dCart" ${stock === 0 ? "disabled" : ""}>${stock === 0 ? "품절" : "장바구니 담기"}</button>
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
    if (addToCart(p, state.detailQty)) showToast("장바구니에 담았어요.");
  });
  $("#dBuy").addEventListener("click", () => {
    const inCart = getCart().find((i) => i.id === p.id);
    // 이미 담겨 있으면 그대로 주문으로, 아니면 담고 이동
    if (inCart || addToCart(p, state.detailQty)) location.hash = "#checkout";
  });
  updateQty();
}

/* =========================================================
   화면: 장바구니
   ========================================================= */
let cartCache = [];   // 지금 화면에 그린 [{ product, qty }]

async function renderCart() {
  const area = $("#cartArea");
  if (getCart().length === 0) {
    cartCache = [];
    drawCart();
    return;
  }
  area.innerHTML = `<div class="empty"><p>불러오는 중…</p></div>`;
  const { items, removed, error } = await loadCartItems();
  if (error) {
    console.error(error.message);
    area.innerHTML = `<div class="empty"><p>장바구니 상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p></div>`;
    return;
  }
  if (removed) showToast("판매가 끝난 상품을 장바구니에서 뺐어요.");
  cartCache = items;
  drawCart();
}

function drawCart() {
  const area = $("#cartArea");
  if (cartCache.length === 0) {
    area.innerHTML = `<div class="empty"><p>장바구니가 비어 있어요.</p><a href="#shop" class="btn btn-dark" data-cat="전체">쇼핑하러 가기</a></div>`;
    return;
  }
  const { subtotal, shipping, total } = calcCart(cartCache);
  const left = FREE_SHIPPING - subtotal;

  area.innerHTML = `
    <div class="cart-layout">
      <ul class="cart-list">
        ${cartCache.map(({ product: p, qty }) => {
          const stock = stockOf(p);
          return `
          <li class="cart-item">
            <a href="#product/${p.id}">${imgTag(p, false)}</a>
            <div>
              <p class="cart-item-name"><a href="#product/${p.id}">${esc(p.name)}</a></p>
              <p class="cart-item-meta">${esc(p.category)} · ${won(p.price)} · ${stock > 0 ? `재고 ${stock}개` : "품절"}</p>
              <div class="qty">
                <button type="button" data-act="minus" data-id="${p.id}" aria-label="${esc(p.name)} 수량 빼기" ${qty <= 1 ? "disabled" : ""}>−</button>
                <span>${qty}</span>
                <button type="button" data-act="plus" data-id="${p.id}" aria-label="${esc(p.name)} 수량 더하기" ${qty >= stock ? "disabled" : ""}>+</button>
              </div>
            </div>
            <div class="cart-item-side">
              <span class="cart-item-sum">${won(p.price * qty)}</span>
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

function changeCartQty(id, diff) {
  const entry = cartCache.find((i) => i.product.id === id);
  if (!entry) return;
  const next = entry.qty + diff;
  if (next < 1) return;
  const stock = stockOf(entry.product);
  if (next > stock) {
    showToast(`재고가 ${stock}개 남아 있어요.`);
    return;
  }
  entry.qty = next;
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) item.qty = next;
  saveCart(cart);
  drawCart();
}
function removeFromCart(id) {
  saveCart(getCart().filter((i) => i.id !== id));
  cartCache = cartCache.filter((i) => i.product.id !== id);
  drawCart();
  showToast("장바구니에서 삭제했어요.");
}

/* =========================================================
   화면: 체험 결제
   ※ points 는 DB 가 막아 두어 화면에서 바꿀 수 없어요.
     포인트 사용·적립 반영은 주문 기능을 DB 로 옮길 때 연결합니다.
   ※ 재고(stock)도 화면에서 줄이지 않아요.
   ========================================================= */
async function renderCheckout() {
  const area = $("#checkoutArea");

  if (!auth.user) {
    area.innerHTML = `<div class="empty"><p>주문하려면 로그인이 필요해요.</p><a href="#login" class="btn btn-dark">로그인</a> <a href="#signup" class="btn">회원가입</a></div>`;
    sessionStorage.setItem("aa_after_login", "#checkout");
    return;
  }
  const emptyHtml = `<div class="empty"><p>주문할 상품이 없어요.</p><a href="#shop" class="btn btn-dark" data-cat="전체">쇼핑하러 가기</a></div>`;
  if (getCart().length === 0) { area.innerHTML = emptyHtml; return; }

  area.innerHTML = `<div class="empty"><p>불러오는 중…</p></div>`;
  const { items, removed, error } = await loadCartItems();
  if (error) {
    console.error(error.message);
    area.innerHTML = `<div class="empty"><p>주문 상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p></div>`;
    return;
  }
  if (removed) showToast("판매가 끝난 상품을 장바구니에서 뺐어요.");
  if (items.length === 0) { area.innerHTML = emptyHtml; return; }

  const profile = auth.profile || {};
  const { subtotal, shipping } = calcCart(items);
  const grade = myGrade();
  const points = profile.points || 0;
  const earn = Math.floor(subtotal * grade.rate);

  area.innerHTML = `
    <form class="checkout-layout" id="checkoutForm" novalidate>
      <div class="form-card">
        <h3>배송 정보</h3>
        <div class="field"><label for="coName">받는 분</label><input id="coName" value="${esc(profile.name || displayName())}" required></div>
        <div class="field"><label for="coPhone">연락처</label><input id="coPhone" type="tel" value="${esc(profile.phone || "")}" placeholder="010-0000-0000" required></div>
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
          <label for="coPoint">보유 ${pt(points)} · 포인트 사용은 주문 기능을 연결한 뒤 열려요</label>
          <div class="field-row">
            <input id="coPoint" type="number" value="0" disabled>
            <button type="button" class="btn" id="useAll" disabled>전액 사용</button>
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
          ${items.map(({ product: p, qty }) =>
            `<li><span>${esc(p.name)} × ${qty}</span><span>${won(p.price * qty)}</span></li>`
          ).join("")}
        </ul>
        <div class="summary-row"><span>상품 금액</span><span>${won(subtotal)}</span></div>
        <div class="summary-row"><span>배송비</span><span>${shipping ? won(shipping) : "무료"}</span></div>
        <div class="summary-row"><span>포인트 사용</span><span class="minus" id="coUsed">-0P</span></div>
        <div class="summary-row total"><span>최종 결제 금액</span><span id="coTotal">${won(subtotal + shipping)}</span></div>
        <p class="summary-note" id="coEarn">${grade.name} 등급 ${Math.round(grade.rate * 100)}% 적립 예정: ${pt(earn)}</p>
        <label class="check"><input type="checkbox" id="coAgree"> 주문 내용을 확인했어요 (체험 결제)</label>
        <p class="form-msg" id="coMsg" role="alert"></p>
        <button type="submit" class="btn btn-dark btn-block">체험 결제하기</button>
      </aside>
    </form>`;

  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    placeOrder(e.target);
  });
}

async function placeOrder(form) {
  const msg = $("#coMsg");
  const name = $("#coName").value.trim();
  const phone = $("#coPhone").value.trim();
  const addr = $("#coAddr").value.trim();

  if (!name || !phone || !addr) { msg.textContent = "받는 분, 연락처, 주소를 모두 입력해 주세요."; return; }
  if (!/^[0-9-]{9,13}$/.test(phone)) { msg.textContent = "연락처는 숫자와 - 만 입력해 주세요."; return; }
  if (!$("#coAgree").checked) { msg.textContent = "주문 내용 확인에 체크해 주세요."; return; }
  if (!auth.user) { location.hash = "#login"; return; }

  // 주문 직전에 표에서 가격 · 재고 다시 확인
  setBusy(form, true);
  const { items, error } = await loadCartItems();
  setBusy(form, false);
  if (error) { msg.textContent = "상품 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요."; return; }
  if (items.length === 0) { msg.textContent = "주문할 상품이 없어요. 장바구니를 확인해 주세요."; return; }
  for (const { product, qty } of items) {
    if (qty > stockOf(product)) {
      msg.textContent = `‘${product.name}’ 재고가 부족해요. 장바구니를 확인해 주세요.`;
      return;
    }
  }

  const { subtotal, shipping } = calcCart(items);
  const grade = myGrade();
  const now = new Date();

  // 주문 저장은 다음 단계에서 shop_orders · shop_order_items 로 옮길 예정
  const order = {
    orderId: "AA" + now.getTime().toString().slice(-9),
    email: auth.user.email,
    items: items.map(({ product: p, qty }) => ({ id: p.id, name: p.name, price: p.price, qty })),
    subtotal,
    shipping,
    usedPoints: 0,
    total: subtotal + shipping,
    grade: grade.name,
    rate: grade.rate,
    earnedPoints: Math.floor(subtotal * grade.rate),   // 적립 예정 (DB 반영 전)
    receiver: { name, phone, addr, memo: $("#coMemo").value },
    payMethod: document.querySelector('input[name="pay"]:checked').value,
    status: "주문 완료 (체험 결제)",
    createdAt: now.toISOString()
  };

  const orders = store.get(KEY.orders, []);
  orders.unshift(order);
  store.set(KEY.orders, orders);

  saveCart([]);
  location.hash = "#complete/" + order.orderId;
}

/* =========================================================
   화면: 주문 완료
   ========================================================= */
function renderComplete(orderId) {
  const order = store.get(KEY.orders, []).find((o) => o.orderId === orderId);
  const area = $("#completeArea");
  if (!order || !auth.user || order.email !== auth.user.email) {
    area.innerHTML = `<div class="empty"><p>주문 정보를 찾을 수 없어요.</p><a href="#mypage" class="btn">마이페이지</a></div>`;
    return;
  }

  area.innerHTML = `
    <div class="complete">
      <div class="complete-mark" aria-hidden="true">✓</div>
      <h2 class="page-title">주문이 완료되었어요</h2>
      <p class="muted">체험 결제라 실제 결제는 되지 않았고, 주문 내역만 저장했어요.</p>
      <div class="card">
        <div class="summary-row"><span>주문 번호</span><strong>${order.orderId}</strong></div>
        <div class="summary-row"><span>주문 일시</span><span>${formatDate(order.createdAt)}</span></div>
        <div class="summary-row"><span>상품</span><span>${order.items.map((i) => `${esc(i.name)} × ${i.qty}`).join("<br>")}</span></div>
        <div class="summary-row"><span>결제 수단</span><span>${esc(order.payMethod)}</span></div>
        <div class="summary-row"><span>포인트 사용</span><span>-${pt(order.usedPoints)}</span></div>
        <div class="summary-row"><span>적립 예정 포인트</span><span>+${pt(order.earnedPoints)}</span></div>
        <div class="summary-row total"><span>결제 금액</span><span>${won(order.total)}</span></div>
      </div>
      <div class="complete-actions">
        <a href="#mypage" class="btn btn-dark">주문 내역 보기</a>
        <a href="#shop" class="btn" data-cat="전체">쇼핑 계속하기</a>
      </div>
    </div>`;
}

/* =========================================================
   화면: 마이페이지 (shop_profiles 의 내 한 줄)
   이름 · 연락처만 고칠 수 있어요. grade · points · role 은 읽기만.
   ========================================================= */
async function renderMypage() {
  const area = $("#mypageArea");
  area.innerHTML = `<p class="muted">회원 정보를 불러오는 중이에요…</p>`;
  await loadProfile();
  if (!auth.user) { location.hash = "#login"; return; }

  const p = auth.profile;
  if (!p) {
    area.innerHTML = `
      <div class="mypage-head">
        <h2 class="page-title">마이페이지</h2>
        <button type="button" class="btn" id="logoutBtn">${ICON.logout} 로그아웃</button>
      </div>
      <div class="empty"><p>회원 정보를 불러오지 못했어요. 잠시 후 새로 고침해 주세요.</p></div>`;
    return;
  }

  const grade = getGrade(p.grade);
  const next = getNextGrade(grade);
  const progress = Math.round((grade.level / GRADES.length) * 100);
  const progressText = next ? `다음 등급은 ${next.name}이에요.` : "최고 등급이에요. 언제나 감사합니다!";
  const orders = store.get(KEY.orders, []).filter((o) => o.email === auth.user.email);

  area.innerHTML = `
    <div class="mypage-head">
      <h2 class="page-title">${esc(p.name || displayName())}님의 마이페이지</h2>
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
        <p class="stat-value">${pt(p.points || 0)}</p>
        <p class="progress-text">구매 금액의 ${Math.round(grade.rate * 100)}% 적립</p>
      </div>
      <div class="card">
        <p class="stat-label">이메일</p>
        <p class="stat-value" style="font-size:1.1rem">${esc(p.email || auth.user.email)}</p>
        <p class="progress-text">가입일 ${p.created_at ? formatDate(p.created_at).slice(0, 10) : "-"}</p>
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
              <p class="order-sum">${won(o.total)} <small>· ${esc(o.grade)} ${Math.round(o.rate * 100)}% 적립 예정 +${pt(o.earnedPoints)}</small></p>
            </li>`).join("")}
        </ul>`}
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <h3>등급별 적립 혜택</h3>
          <table class="grade-table">
            <thead><tr><th>등급</th><th>적립률</th></tr></thead>
            <tbody>
              ${GRADES.map((g) => `<tr class="${g.level === grade.level ? "is-mine" : ""}"><td>${g.name}</td><td>${Math.round(g.rate * 100)}%</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="card">
          <h3>회원 정보 수정</h3>
          <form id="profileForm" novalidate>
            <div class="field">
              <label for="pfName">이름</label>
              <input type="text" id="pfName" maxlength="20" autocomplete="name" value="${esc(p.name || "")}" required>
            </div>
            <div class="field">
              <label for="pfEmail">이메일 <small>(변경 불가)</small></label>
              <input type="email" id="pfEmail" value="${esc(p.email || auth.user.email)}" readonly>
            </div>
            <div class="field">
              <label for="pfPhone">휴대폰 번호 <small>(선택)</small></label>
              <input type="tel" id="pfPhone" placeholder="010-0000-0000" autocomplete="tel" value="${esc(p.phone || "")}">
            </div>
            <p class="form-msg" id="pfMsg" role="alert"></p>
            <button type="submit" class="btn btn-dark btn-block">저장하기</button>
          </form>
        </div>
      </div>
    </div>`;

  $("#profileForm").addEventListener("submit", saveProfile);
}

// 이름 · 연락처만 shop_profiles 에 저장
async function saveProfile(e) {
  e.preventDefault();
  const form = e.target;
  const msg = $("#pfMsg");
  const name = $("#pfName").value.trim();
  const phone = $("#pfPhone").value.trim();

  if (!name) { msg.textContent = "이름을 입력해 주세요."; return; }
  if (phone && !/^[0-9-]{9,13}$/.test(phone)) { msg.textContent = "휴대폰 번호는 숫자와 - 만 입력해 주세요."; return; }
  if (!db || !auth.user) { msg.textContent = NO_DB; return; }

  setBusy(form, true);
  const { data, error } = await db
    .from(TABLE.profiles)
    .update({ name, phone: phone || null })
    .eq("id", auth.user.id)
    .select("id, email, name, phone, grade, points, role, created_at")
    .single();
  setBusy(form, false);

  if (error) { msg.textContent = authErrorText(error); return; }
  msg.textContent = "";
  auth.profile = data;
  renderHeader();
  showToast("회원 정보를 저장했어요.");
  renderMypage();
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
  if (!auth.ready) return;   // 로그인 확인이 끝난 뒤에 화면을 그려요
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
      if (auth.user) { location.hash = "#mypage"; return; }
      showView("login"); break;
    case "signup":
      if (auth.user) { location.hash = "#mypage"; return; }
      showView("signup"); break;
    case "mypage":
      if (!auth.user) {
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

  // 클릭 (분류 · 검색어 지우기 · 장바구니 · 로그아웃)
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
    if (e.target.closest("#logoutLink") || e.target.closest("#logoutBtn")) {
      logout();
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
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = $("#loginMsg");
    const email = $("#loginEmail").value.trim().toLowerCase();
    const pw = $("#loginPw").value;
    if (!email || !pw) { msg.textContent = "이메일과 비밀번호를 입력해 주세요."; return; }

    setBusy(form, true);
    const result = await login(email, pw);
    setBusy(form, false);
    if (!result.ok) { msg.textContent = result.message; return; }

    msg.textContent = "";
    form.reset();
    renderHeader();
    showToast(`${displayName()}님, 반가워요!`);
    goAfterLogin();
  });

  // 회원가입
  $("#signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = $("#signupMsg");
    const name = $("#suName").value.trim();
    const email = $("#suEmail").value.trim().toLowerCase();
    const pw = $("#suPw").value;
    const pw2 = $("#suPw2").value;
    const phone = $("#suPhone").value.trim();

    if (!name) { msg.textContent = "이름을 입력해 주세요."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "이메일 형식을 확인해 주세요."; return; }
    if (pw.length < 6) { msg.textContent = "비밀번호는 6자 이상으로 입력해 주세요."; return; }
    if (pw !== pw2) { msg.textContent = "비밀번호가 서로 달라요."; return; }
    if (phone && !/^[0-9-]{9,13}$/.test(phone)) { msg.textContent = "휴대폰 번호는 숫자와 - 만 입력해 주세요."; return; }
    if (!$("#suAgree").checked) { msg.textContent = "필수 약관에 동의해 주세요."; return; }

    setBusy(form, true);
    const result = await signup({ name, email, password: pw, phone });
    setBusy(form, false);
    if (!result.ok) { msg.textContent = result.message; return; }

    msg.textContent = "";
    form.reset();
    if (result.needConfirm) {
      showToast("가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.", 6000);
      location.hash = "#login";
      return;
    }
    renderHeader();
    showToast(`가입을 환영해요! ${pt(SIGNUP_POINT)}가 적립되었어요.`);
    goAfterLogin();
  });

  window.addEventListener("hashchange", router);
}

/* =========================================================
   시작
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  OLD_KEYS.forEach((key) => store.remove(key));   // 예전 회원 정보 · 장바구니 · 재고 기록 지우기
  renderHeader();
  initHero();
  bindEvents();
  $("#resultInfo").textContent = "불러오는 중…";
  $("#productGrid").innerHTML = `<div class="empty"><p>불러오는 중…</p></div>`;

  try {
    await loadAuth();        // db.auth.getSession 으로 로그인 상태 확인
  } catch (e) {
    console.error(e.message);
  }
  auth.ready = true;
  renderHeader();
  router();
});
