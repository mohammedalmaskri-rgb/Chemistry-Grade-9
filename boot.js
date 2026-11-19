/* First paint: the page starts in the login design (body.login-screen in the HTML).
   1) If a saved session exists, hide the login view straight away so a signed-in user does not
      see it flash; app.js then shows the right view (or the login again if the session expired).
   2) Collapse the password step immediately (so the card does not jump when app.js loads) and
      open it as soon as a username is typed; app.js takes over the full behaviour once loaded. */
(function () {
  'use strict';
  try {
    var has = localStorage.getItem('chemStudentToken') || sessionStorage.getItem('chemTeacherToken') || sessionStorage.getItem('rawafidAdminToken');
    if (has) {
      var v = document.getElementById('loginView');
      if (v) v.classList.add('hide');
      document.body.classList.remove('login-screen');
      document.documentElement.classList.remove('login-bg-root');
    }
  } catch (e) { /* storage blocked: keep the login design */ }
  var step = document.getElementById('passStep'), user = document.getElementById('loginUser');
  if (!step || !user) return;
  step.classList.add('armed');
  var sync = function () { if (user.value.trim()) { step.classList.add('open'); step.removeAttribute('aria-hidden'); } };
  user.addEventListener('input', sync);
  setTimeout(sync, 600);
})();
