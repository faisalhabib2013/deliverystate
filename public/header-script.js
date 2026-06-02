/**
 * header-script.js — Client-side signals collector
 * ==================================================
 * يجمع _fbp و _fbc من الكوكيز ويبعتهم للسيرفر مع sessionId.
 *
 * أين يُضاف:
 *   Easy Orders → Settings → Custom Code → Header
 *     <script src="https://YOUR-SERVER.example.com/header-script.js"></script>
 *
 * يحمي نفسه من:
 *   - In-App Browsers اللي بتحظر localStorage (Facebook, Instagram)
 *   - Incognito mode
 *   - تأخر تحميل _fbp cookie من Meta Pixel
 */
(function () {
  // ⚠️  استبدل القيمة دي بالـ URL بتاع السيرفر الفعلي قبل الرفع
  var SERVER = 'https://YOUR-SERVER.example.com';

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function getFbclid() {
    return new URLSearchParams(window.location.search).get('fbclid');
  }

  function buildFbc(fbclid) {
    return fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : null;
  }

  // localStorage مع try/catch — حماية ضد المتصفحات اللي بتحظره
  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { }
  }
  function lsDel(key) {
    try { localStorage.removeItem(key); } catch (e) { }
  }

  function getOrCreateSession() {
    var sid = lsGet('_msid');
    if (!sid) {
      sid = 'ms_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
      lsSet('_msid', sid);
    }
    return sid;
  }

  function post(endpoint, data) {
    var body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        SERVER + endpoint,
        new Blob([body], { type: 'application/json' })
      );
    } else {
      fetch(SERVER + endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    body,
        keepalive: true,
      }).catch(function () { });
    }
  }

  var fbclid    = getFbclid();
  var sessionId = getOrCreateSession();

  // ابعت signals
  post('/collect-signals', {
    sessionId: sessionId,
    fbp:       getCookie('_fbp'),
    fbc:       getCookie('_fbc') || buildFbc(fbclid),
    userAgent: navigator.userAgent,
    pageUrl:   window.location.href,
  });

  // لو على صفحة الشكر، اربط الـ session بالـ orderId
  var isThankYou = window.location.pathname.indexOf('thanks') !== -1;
  var orderId    = new URLSearchParams(window.location.search).get('order_id');

  if (isThankYou && orderId) {
    post('/link-session', { orderId: orderId, sessionId: sessionId });
    // امسح الـ session ID بعد 5 ثوانٍ ليكون عند الشراء التالي جديداً
    setTimeout(function () { lsDel('_msid'); }, 5000);
  }
})();
