var PROXY_BASE = 'http://localhost:10000';
var CARRIER_CODE = 'dhl';

function extractTrackingNumber(card) {
  var regex = /(\b\d{10,20}\b)/g;
  var match = regex.exec(card.name);
  if (match) {
    return match[1];
  }
  return null;
}

function fetchTrackingStatus(tnr, callback) {
  var url = PROXY_BASE + '/track?tnr=' + encodeURIComponent(tnr) + '&carrier=' + CARRIER_CODE;
  fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Netzwerkantwort war nicht ok');
      }
      return response.json();
    })
    .then(function(data) {
      callback(null, data.status);
    })
    .catch(function(error) {
      callback(error, null);
    });
}

function showTrackingStatus(t, options) {
  var card = options.card;
  var trackingNumber = extractTrackingNumber(card);

  if (!trackingNumber) {
    t.popup({
      title: 'Tracking-Status',
      items: [
        {
          text: 'Keine gültige Trackingnummer gefunden.',
          callback: function() {
            t.closePopup();
          }
        }
      ]
    });
    return;
  }

  fetchTrackingStatus(trackingNumber, function(err, status) {
    if (err) {
      t.popup({
        title: 'Tracking-Status',
        items: [
          {
            text: 'Fehler beim Abrufen des Status: ' + err.message,
            callback: function() {
              t.closePopup();
            }
          }
        ]
      });
      return;
    }

    t.popup({
      title: 'Tracking-Status',
      items: [
        {
          text: 'Trackingnummer: ' + trackingNumber,
          callback: function() {
            t.closePopup();
          }
        },
        {
          text: 'Status: ' + status,
          callback: function() {
            t.closePopup();
          }
        },
        {
          text: 'Debug-Info anzeigen',
          callback: function() {
            openDebugModal(t, trackingNumber);
          }
        }
      ]
    });
  });
}

function openDebugModal(t, trackingNumber) {
  var url = PROXY_BASE + '/raw?tnr=' + encodeURIComponent(trackingNumber) + '&carrier=' + CARRIER_CODE;
  fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Netzwerkantwort war nicht ok');
      }
      return response.json();
    })
    .then(function(data) {
      t.modal({
        url: './debug.html',
        args: { data: data },
        height: 500,
        fullscreen: false
      });
    })
    .catch(function(error) {
      t.popup({
        title: 'Debug-Info',
        items: [
          {
            text: 'Fehler beim Abrufen der Debug-Info: ' + error.message,
            callback: function() {
              t.closePopup();
            }
          }
        ]
      });
    });
}

TrelloPowerUp.initialize({
  'card-badges': function(t, options) {
    var card = options.card;
    var trackingNumber = extractTrackingNumber(card);
    if (!trackingNumber) {
      return [];
    }

    return t.get('card', 'shared', 'trackingStatus')
      .then(function(status) {
        if (!status) {
          // Try to fetch status if not cached yet
          return new Promise(function(resolve) {
            fetchTrackingStatus(trackingNumber, function(err, fetchedStatus) {
              if (!err && fetchedStatus) {
                t.set('card', 'shared', 'trackingStatus', fetchedStatus);
                resolve([
                  {
                    text: fetchedStatus,
                    color: fetchedStatus.toLowerCase().includes('delivered') ? 'green' : 'yellow'
                  }
                ]);
              } else {
                resolve([]);
              }
            });
          });
        }
        return [
          {
            text: status,
            color: status.toLowerCase().includes('delivered') ? 'green' : 'yellow'
          }
        ];
      });
  },
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://cdn-icons-png.flaticon.com/512/61/61456.png',
      text: 'Tracking-Status',
      callback: function(t) {
        return showTrackingStatus(t, options);
      }
    }];
  }
});