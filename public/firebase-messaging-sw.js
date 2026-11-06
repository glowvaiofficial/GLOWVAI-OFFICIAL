/* Firebase Cloud Messaging service worker for the GlowVai shop (web push).
 *
 * Served from the app origin at /firebase-messaging-sw.js. The shop registers it with its public Firebase settings in
 * the query string, so nothing secret lives in this file. Messages are data-only: this worker builds the notification,
 * so the browser never shows a second copy. A click opens the shop, on the order when the message names one.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

(function () {
  var params = new URL(self.location.href).searchParams;
  var config = {
    apiKey: params.get('apiKey'),
    authDomain: params.get('authDomain') || undefined,
    projectId: params.get('projectId'),
    appId: params.get('appId'),
    messagingSenderId: params.get('messagingSenderId'),
  };
  // Without the settings there is nothing to receive: stay idle rather than throw during install.
  if (!config.apiKey || !config.projectId || !config.appId || !config.messagingSenderId) return;

  firebase.initializeApp(config);
  var messaging = firebase.messaging();

  messaging.onBackgroundMessage(function (payload) {
    var data = (payload && payload.data) || {};
    var title = clean(data.title, 80) || 'GlowVai';
    var body = clean(data.body, 200);
    return self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192.png',
      tag: clean(data.type, 60) || 'glowvai',
      data: { link: safeLink(data.link) },
    });
  });
})();

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var link = safeLink(event.notification.data && event.notification.data.link);
  var target = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
      for (var i = 0; i < windows.length; i++) {
        var client = windows[i];
        if (client.url.indexOf(self.location.origin + '/shop') === 0 && 'focus' in client) {
          return client.focus().then(function (focused) {
            return focused && focused.navigate ? focused.navigate(target) : focused;
          });
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Only paths inside the shop are opened. Anything else goes to the shop home.
function safeLink(value) {
  var link = typeof value === 'string' ? value : '';
  return /^\/shop(\?[A-Za-z0-9_=&.-]*)?$/.test(link) ? link : '/shop';
}

function clean(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
}
