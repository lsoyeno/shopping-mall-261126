/* =========================================================
   ATELIER ARCHIVE — db.js
   ---------------------------------------------------------
   Supabase 연결 코드를 한 곳에 모아 둔 파일이에요.
   불러오는 순서: supabase-js(CDN) → db.js → script.js
   다른 파일에서는 db 변수로 데이터베이스를 사용하면 돼요.
     예) db.from("shop_products").select("*")
   ※ 여기에는 공개(Publishable) 키만 넣어요.
     Secret key 나 DB 비밀번호는 절대 이 파일에 넣지 마세요.
   ========================================================= */

const SUPABASE_URL = "https://fkmtihtcexgargtkjhec.supabase.co";
const SUPABASE_KEY = "sb_publishable_L__oLj0ot3tHJSnAXSduDg_Tdai6389";

// 표 이름 (SQL 로 만든 이름과 똑같이)
const TABLE = {
  profiles: "shop_profiles",       // 회원
  products: "shop_products",       // 상품
  orders: "shop_orders",           // 주문
  orderItems: "shop_order_items"   // 주문 상세
};

// ---------- 연결 ----------
// CDN 의 supabase-js 가 window.supabase 를 만들어 줘요.
let db = null;
if (window.supabase && typeof window.supabase.createClient === "function") {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error("supabase-js 를 불러오지 못했어요. html 의 <script> 순서와 인터넷 연결을 확인해 주세요.");
}

// ---------- 연결 확인: 상품 수 세기 ----------
async function checkConnection() {
  if (!db) return;
  try {
    // head: true → 상품 내용은 가져오지 않고 개수만 받아요
    const { count, error } = await db
      .from(TABLE.products)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(error.message);
      return;
    }
    console.log(`연결 성공: 상품 ${count}개`);
  } catch (e) {
    console.error(e.message);
  }
}

checkConnection();
