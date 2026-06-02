# COD Meta Tracking System — v7.1

نظام تتبع تسليم الطلبات النقدية (Cash-on-Delivery) وإرسال أحداث Meta CAPI عند التسليم الفعلي.

## المشكلة التي يحلّها

معدلات الإرجاع 30-40% في الكوميرس المصري تُفسد بيانات Meta لأن معظم الأنظمة تُرسِل حدث Conversion عند الطلب وليس عند التسليم. هذا النظام يُرسِل الحدث فقط عند **التسليم الفعلي**.

## البنية

```
Store visit → header-script.js → /collect-signals → Redis (fbp/fbc/IP/UA)
New order   → Easy Orders Webhook → /webhook/easy-orders → Redis (enrichment)
Polling كل ساعة → Bosta API (page+limit+sortBy) → process delivered/returned → Meta CAPI
Bosta webhook → safety net (optional, dedupes via processedKey)
```

## المتطلبات

- Node.js 18+
- Redis (Railway plugin أو أي Redis)
- حساب Bosta (شحن)
- متجر Easy Orders
- Meta Pixel + CAPI Token

## النشر على Railway

### ١ — Clone وRun

```bash
git clone <your-repo>
cd cod-meta-template
railway up
```

### ٢ — متغيرات البيئة

```bash
# Bosta (حساب واحد يخدم كل المتاجر)
BOSTA_API_KEY=your_bosta_api_key

# متجر ١
STORE_1_NAME=mystore
STORE_1_DOMAINS=https://mystore.com,https://www.mystore.com
STORE_1_EASY_ORDERS_SECRET=your_secret
STORE_1_META_PIXEL_ID=123456789
STORE_1_META_CAPI_TOKEN=your_capi_token

# متجر ٢ (اختياري)
STORE_2_NAME=mystore2
STORE_2_DOMAINS=https://mystore2.com
STORE_2_EASY_ORDERS_SECRET=your_secret_2
STORE_2_META_PIXEL_ID=987654321
STORE_2_META_CAPI_TOKEN=your_capi_token_2

# حتى 20 متجر (STORE_1 → STORE_20)
```

### ٣ — Webhooks

**Easy Orders:**
```
https://your-app.railway.app/webhook/easy-orders
```

**Bosta (اختياري — safety net):**
```
https://your-app.railway.app/webhook/bosta
```

### ٤ — Header Script

أضف في `<head>` كل صفحة في متجرك:

```html
<script>
  (function(d,s,id){
    var js,fjs=d.getElementsByTagName(s)[0];
    if(d.getElementById(id))return;
    js=d.createElement(s);js.id=id;
    js.src='https://your-app.railway.app/header-script.js';
    fjs.parentNode.insertBefore(js,fjs);
  }(document,'script','ms-tracker'));
</script>
```

## الـ API Endpoints

| Endpoint | الوظيفة |
|---|---|
| `GET /health` | حالة النظام |
| `POST /webhook/easy-orders` | Easy Orders webhook |
| `POST /webhook/bosta` | Bosta webhook (safety net) |
| `GET /header-script.js` | Client-side script |
| `POST /collect-signals` | جمع fbp/fbc/IP |
| `POST /link-session` | ربط sessionId بـ orderId |

## Polling

```javascript
const POLL_INTERVAL_MS = 60 * 60 * 1000;  // كل ساعة
const POLL_PAGE_LIMIT  = 200;              // 200 شحنة/صفحة
const POLL_MAX_PAGES   = 5;               // 5 صفحات = 1000 شحنة/دورة
// body: { page: N, limit: 200, sortBy: '-updatedAt' }
```

## Bosta State Codes

| Code | المعنى |
|---|---|
| 45 | ✅ Delivered → يُرسَل `Delivery` event |
| 46, 48, 49, 100, 101 | ❌ Returned/Lost/Damaged → يُرسَل `OrderReturned` event |
| باقي الحالات | في الطريق → يُتجاهَل |

## المتغيرات القديمة (متوافقة للخلف)

```bash
# تعمل لكن يُنصح بالانتقال للـ STORE_N_*
META_PIXEL_ID=...
META_CAPI_TOKEN=...
EASY_ORDERS_SECRET=...
```

## الإصدارات

| الإصدار | الميزة |
|---|---|
| v4.0 | Easy Orders فقط |
| v5.0 | Bosta-first philosophy |
| v6.0 | Multi-store support |
| v7.0 | Real Bosta pagination (`page` + `limit`) |
| **v7.1** | **Optimized: لا API calls إضافية في الـ poll** |

## header-script.js

```
v4 — Race Condition Fix:
  - Polling 8 محاولات × 500ms = 4 ثوانٍ لانتظار Meta Pixel
  - إرسال مرة واحدة فقط (flag)
  - Always Save Cookies (_fbc)
  - ETLD+1 domain scoping
  - Cross-domain sessionId via URL param
```
