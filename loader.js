(function () {
  'use strict';
  var script = document.createElement('script');
  script.src = './app.js?v=' + Date.now();
  script.async = false;
  script.onerror = function () {
    alert('تعذر تحميل ملف المنصة. أعد تحديث الصفحة.');
  };
  document.head.appendChild(script);
})();
