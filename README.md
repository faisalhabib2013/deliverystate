# COD Meta Tracking System

نظام تتبع متخصص للأسواق التي يغلب فيها الدفع عند الاستلام (COD) — يُرسل `Delivery` Custom Event لـ Meta عند **التسليم الفعلي** بدلاً من وقت تقديم الطلب، فيحسّن دقة الـ ROAS بشكل كبير.

**التكامل:** Easy Orders + Bosta + Meta CAPI + Redis
**النشر:** Railway / Render / Heroku (Node.js)
**اللغة:** Node.js / Express

---

## لماذا هذا النظام؟

في الأسواق التي يغلب فيها COD (مثل مصر)، نسبة الإرجاع قد تصل لـ 30-40%. لو أرسلت `Purchase` event لـ Meta عند تقديم الطلب:

- ❌ Meta سيُحسّن الإعلانات على طلبات سيُرجَع كثير منها
- ❌ ROAS الفعلي أقل بكثير من الـ ROAS الظاهر
- ❌ هدر في ميزانية الإعلانات

هذا النظام:

- ✅ يستقبل تحديثات Bosta عند **التسليم الفعلي** (state 45)
- ✅ يُرسل Custom Event اسمه `Delivery` مع القيمة الحقيقية
- ✅ يربط الـ Event بالعميل عبر phone + name + city + fbp/fbc
- ✅ يدعم متاجر متعددة على نفس السيرفر

---

## بنية النظام

```
زيارة المتجر  → header-script.js → POST /collect-signals      → Redis
طلب جديد      → Easy Orders Webhook → POST /webhook/easy-orders → Redis
Bosta تسلّم   → POST /webhook/bosta → Bosta API (للهاتف)
                                   → بحث في Redis بالهاتف
                                   → ابحث في Easy Orders API (fallback)
                                   → Meta CAPI "Delivery" Event
```

---

## النشر السريع — Railway (10 دقائق)

### 1) جهّز الـ Repo

```bash
git clone https://github.com/YOUR-USERNAME/cod-meta-tracking.git
cd cod-meta-tracking
```

أو ادفعه لـ GitHub repo جديد عندك.

### 2) أنشئ مشروع على Railway

1. اذهب لـ [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. اختر الـ repo
3. Railway هيكتشف Node.js تلقائياً ويبدأ build

### 3) أضف Redis

في نفس المشروع: **+ New** → **Database** → **Add Redis**
Railway هيضيف `REDIS_URL` تلقائياً في Variables الخاصة بالـ web service.

### 4) املأ Environment Variables

في Railway → الـ web service → **Variables** → أضف كل المتغيرات من `.env.example` بالقيم الفعلية:

```
EASY_ORDERS_SECRET           من Easy Orders Webhook Secret
EASY_ORDERS_API_KEY          من Easy Orders API Keys
EASY_ORDERS_STORE_IDS        store_id (أو عدة IDs مفصولة بفاصلة)
BOSTA_API_KEY                من Bosta Dashboard → API Keys
META_PIXEL_ID                Meta Events Manager → Pixel ID
META_CAPI_TOKEN              Meta Events Manager → CAPI Access Token
ALLOWED_ORIGINS              دومينات متجرك (مفصولة بفاصلة)
```

### 5) خذ الـ URL الـ Public

Railway → الـ service → **Settings** → **Networking** → **Generate Domain**
سيظهر URL مثل: `https://your-app.up.railway.app`

---

## ربط Webhooks

### Easy Orders Webhook

1. Easy Orders Dashboard → **Settings** → **Webhooks**
2. أضف webhook جديد:
   - **URL:** `https://your-app.up.railway.app/webhook/easy-orders`
   - **Secret:** نفس قيمة `EASY_ORDERS_SECRET`
3. فعّل الأحداث: `Order Created` / `pending`

### Bosta Webhook

1. Bosta Dashboard → **Settings** → **API Keys** → الـ Webhook field
2. **URL:** `https://your-app.up.railway.app/webhook/bosta`

### Header Script في Easy Orders

1. Easy Orders Dashboard → **Settings** → **Custom Code** → **Header**
2. أضف:

```html
<script src="https://your-app.up.railway.app/header-script.js"></script>
```

> ⚠️ قبل النشر، عدّل `SERVER` في `public/header-script.js` ليطابق الـ URL الفعلي بتاع السيرفر.

---

## Meta Custom Conversion

1. Meta Events Manager → الـ Pixel → **Custom Conversions** → **Create**
2. **Event:** `Delivery` (Custom Event)
3. **Action Source:** Website
4. **Conversion Value:** Use event value

(اختياري) أنشئ Custom Conversion ثاني لـ `OrderReturned` لو محتاج تتبع الإرجاعات.

---

## دعم متاجر متعددة على سيرفر واحد

**الطريقة:** ضع كل الـ store IDs مفصولة بفاصلة في `EASY_ORDERS_STORE_IDS`:

```
EASY_ORDERS_STORE_IDS=abc-123,def-456,ghi-789
```

وكل الـ domains في `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://store1.shop,https://www.store1.shop,https://store2.shop,https://www.store2.shop
```

السيرفر هيشتغل تلقائياً لكل المتاجر — Redis مشترك، والـ phone matching يربط أي شحنة Bosta بأي أوردر بغض النظر عن المتجر.

---

## الـ Endpoints

| Endpoint | Method | الوصف |
|---|---|---|
| `/collect-signals` | POST | يستقبل fbp/fbc من المتصفح |
| `/link-session` | POST | يربط sessionId بـ orderId بعد صفحة الشكر |
| `/webhook/easy-orders` | POST | يستقبل طلبات Easy Orders |
| `/webhook/bosta` | POST | يستقبل تحديثات Bosta |
| `/header-script.js` | GET | يخدم script العميل |
| `/health` | GET | فحص الحالة + storage type + عدد الأوردرات |

---

## التشخيص

### تأكد إن النظام شغّال

```
curl https://your-app.up.railway.app/health
```

**النتيجة المتوقعة:**
```json
{
  "ok": true,
  "storage": "redis",
  "orders": 0,
  "tracking": 0,
  "uptime": "5s",
  "stores": 1,
  "origins": 2
}
```

⚠️ لو `"storage": "memory"` → معناه `REDIS_URL` غير متصل، البيانات ستضيع عند restart.

### Logs المتوقعة

**عند فتح المتجر:**
```
[Signals] ms_abc12345 fbp:v fbc:v
```

**عند طلب جديد:**
```
[New Order] 745e674d — اسم العميل — 424 EGP
[Signals] fbp:v fbc:v ip:v
[System] waiting for Bosta shipment for order 745e674d
```

**عند التسليم:**
```
[Bosta] 8425609079 -> 45
[Bosta API] phone: 01234567890
[Bosta] matched from Redis: 01234567890 -> order 745e674d
[Delivered] order 745e674d — 424 EGP
[Meta] Delivery -> 200 events_received:1
```

### المشاكل الشائعة

| المشكلة | السبب | الحل |
|---|---|---|
| `[EasyOrders] ❌ Invalid secret` | الـ Secret في Railway مش زي الـ Webhook | تأكد إنهما متطابقان حرفياً |
| `[Bosta] no order for tracking` | الأوردر أقدم من Redis | عادي - النظام سيلتقط الجديد |
| `[Meta] Delivery -> 400` | Pixel ID أو CAPI Token غلط | راجع Meta Events Manager |
| `storage: memory` بدل redis | Redis مش متصل | راجع REDIS_URL في Variables |
| `fbp:x` لكل الـ signals | متجر Easy Orders يحظر Meta Pixel | لا حل — مشكلة في Easy Orders، fbc كافي |
| Bosta webhook لا يصل | الـ Webhook URL غلط في Bosta | تحقق من Bosta Settings |

---

## تخصيص النظام

### غيّر state codes الخاصة بـ Bosta

في `src/config.js`:

```js
BOSTA_STATES: {
  DELIVERED: [45, '45', 'delivered', 'DELIVERED'],
  RETURNED:  [46, 48, 49, 100, 101, 'returned'],
},
```

### غيّر العملة وكود الدولة

في `.env`:
```
CURRENCY=AED
COUNTRY_CODE=ae
```

### غيّر أسماء الـ Events في Meta

في `.env`:
```
EVENT_NAME_DELIVERY=COD_Delivered
EVENT_NAME_RETURNED=COD_Returned
```

---

## التطوير المحلي

```bash
npm install
cp .env.example .env
# املأ المتغيرات
npm run dev
```

السيرفر سيشتغل على `http://localhost:3000`. لاختبار Webhooks محلياً، استخدم [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

---

## الترخيص

MIT — استخدمه بحرية وعدّله كما تشاء.
