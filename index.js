var PROXY_BASE = 'https://your-proxy-server.com'; // Replace with your actual proxy server URL
var CARRIER_CODE = 'dhl';

function extractTrackingNumber(card) {
  // Example: extract tracking number from card name or description
  return card.name.match(/\b\d{10,}\b/)?.[0] || null;
}

function fetchTrackingStatus(tnr, carrier) {
  return fetch(`${PROXY_BASE}/track?tnr=${tnr}&carrier=${carrier}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => data.status || 'unknown');
}

function showTrackingStatus(t, options) {
  return t.card('name')
    .then(card => {
      var tnr = extractTrackingNumber(card);
      if (!tnr) {
        return t.popup({
          title: 'Tracking Status',
          url: './no-tracking.html'
        });
      }
      return fetchTrackingStatus(tnr, CARRIER_CODE)
        .then(status => {
          return t.popup({
            title: 'Tracking Status',
            url: './status.html',
            args: { status: status }
          });
        })
        .catch(() => {
          return t.popup({
            title: 'Tracking Status',
            url: './error.html'
          });
        });
    });
}

function openDebugModal(t) {
  return t.card('name')
    .then(card => {
      var tnr = extractTrackingNumber(card);
      if (!tnr) {
        return t.popup({
          title: 'Debug Info',
          url: './no-tracking.html'
        });
      }
      return fetch(`${PROXY_BASE}/raw?tnr=${tnr}&carrier=${CARRIER_CODE}`)
        .then(response => response.json())
        .then(data => {
          return t.modal({
            title: 'Debug Information',
            url: './debug.html',
            args: { data: data }
          });
        })
        .catch(() => {
          return t.popup({
            title: 'Debug Info',
            url: './error.html'
          });
        });
    });
}

TrelloPowerUp.initialize({
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://cdn.iconscout.com/icon/free/png-256/shipping-box-143-461988.png',
      text: 'Tracking-Status anzeigen',
      callback: showTrackingStatus
    }, {
      icon: 'https://cdn.iconscout.com/icon/free/png-256/debug-1768076-1502407.png',
      text: 'Debug',
      callback: openDebugModal
    }];
  },

  'card-badges': function(t, options) {
    return t.card('name')
      .then(card => {
        var tnr = extractTrackingNumber(card);
        if (!tnr) {
          return [];
        }
        return fetchTrackingStatus(tnr, CARRIER_CODE)
          .then(status => [{
            text: status,
            color: status === 'delivered' ? 'green' : 'yellow',
            refresh: 10
          }])
          .catch(() => []);
      });
  }
});