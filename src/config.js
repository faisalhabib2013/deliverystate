/**
 * config.js — إعدادات النظام
 * ============================
 * يفصل الإعدادات عن منطق العمل، يسهّل التخصيص بدون لمس الكود الأساسي.
 *
 * ملاحظة: المتغيرات الحساسة (API keys, secrets) تأتي من process.env
 *         هذا الملف للإعدادات الثابتة فقط.
 */

module.exports = {
  // ─── الـ Domains المسموح لها بإرسال signals (CORS) ───
  // أضف كل دومين متجر عندك هنا (مع و بدون www)
  // مثال متعدد المتاجر: ['https://store1.shop', 'https://www.store1.shop', 'https://store2.shop', ...]
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // ─── معرّفات متاجر Easy Orders (يدعم متاجر متعددة) ───
  // ضع كل store_id مفصولاً بفاصلة في متغير EASY_ORDERS_STORE_IDS
  // مثال: "abc-123,def-456,ghi-789"
  EASY_ORDERS_STORE_IDS: (process.env.EASY_ORDERS_STORE_IDS || process.env.EASY_ORDERS_STORE_ID || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // ─── دالة Bosta state codes ───
  // 45 = Delivered (الوحيد للتسليم الناجح في Bosta)
  // 46/48/49/100/101 = Returned/Lost/Damaged
  // غيّر هنا لو احتجت أكواد مختلفة
  BOSTA_STATES: {
    DELIVERED: [45, '45', 'delivered', 'DELIVERED'],
    RETURNED:  [46, '46', 48, '48', 49, '49', 100, '100', 101, '101', 'returned', 'RETURNED'],
  },

  // ─── العملة الافتراضية ───
  CURRENCY: process.env.CURRENCY || 'EGP',

  // ─── كود الدولة ISO لـ Meta CAPI (sha256 سيُطبق تلقائياً) ───
  COUNTRY_CODE: process.env.COUNTRY_CODE || 'eg',

  // ─── خيار: تخطي إرسال OrderReturned events ───
  // غيّرها لـ true لو ما تريدش تتبع الإرجاعات
  SKIP_RETURNED_EVENTS: process.env.SKIP_RETURNED_EVENTS === 'true',

  // ─── أسماء Meta Custom Events ───
  // غيّر الأسماء لو سمّيت Custom Conversion الخاص بك باسم مختلف في Meta
  EVENT_NAMES: {
    DELIVERY: process.env.EVENT_NAME_DELIVERY || 'Delivery',
    RETURNED: process.env.EVENT_NAME_RETURNED || 'OrderReturned',
  },

  // ─── خيار: تحديث حالة الأوردر في Easy Orders بعد التسليم ───
  // افتراضياً false (لأن Easy Orders نفسه قد يحدّث الحالة)
  UPDATE_EASY_ORDERS_STATUS: process.env.UPDATE_EASY_ORDERS_STATUS === 'true',

  // ─── Time-to-live للبيانات في Redis (بالثواني) ───
  TTL: {
    SIGNAL:   parseInt(process.env.TTL_SIGNAL,   10) || 4  * 60 * 60,       // 4 ساعات
    ORDER:    parseInt(process.env.TTL_ORDER,    10) || 10 * 24 * 60 * 60,  // 10 أيام
    TRACKING: parseInt(process.env.TTL_TRACKING, 10) || 10 * 24 * 60 * 60,  // 10 أيام
  },

  // ─── URLs الأساسية للـ APIs (نادراً تتغير) ───
  ENDPOINTS: {
    EASY_ORDERS: 'https://api.easy-orders.net/api/v1',
    BOSTA:       'https://app.bosta.co/api/v2',
    META_CAPI:   'https://graph.facebook.com/v19.0',
  },

  // ─── نافذة time-based matching للـ signals (بالثواني) ───
  // عند وصول webhook بدون sessionId، نبحث عن signal جاء خلال آخر X دقائق
  SIGNAL_MATCH_WINDOW_SECONDS: parseInt(process.env.SIGNAL_MATCH_WINDOW_SECONDS, 10) || 180, // 3 دقائق
};
