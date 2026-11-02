(function () {
  var raw = document.getElementById('locations-data');
  if (!raw) return;
  var data;
  try { data = JSON.parse(raw.textContent); } catch (e) { return; }
  var locations = data.locations || [];
  var queueSizes = data.queueSizes || {};
  var labels = data.labels || {};
  var byName = {};
  locations.forEach(function (loc) { byName[loc.name] = loc; });

  var locationEl = document.getElementById('location');
  var testTypeEl = document.getElementById('testType');
  var browserEl = document.getElementById('browser');
  var connectivityEl = document.getElementById('connectivity');
  var deviceEl = document.getElementById('deviceId');
  if (!locationEl) return;

  function setOptions(select, values, formatter) {
    var previous = select.value;
    while (select.firstChild) select.removeChild(select.firstChild);
    values.forEach(function (value) {
      var opt = document.createElement('option');
      opt.value = value;
      opt.textContent = formatter ? formatter(value) : value;
      select.appendChild(opt);
    });
    if (values.indexOf(previous) !== -1) {
      select.value = previous;
    }
  }

  function refreshTestTypes(loc) {
    var seen = {};
    var types = [];
    (loc.setup || []).forEach(function (s) {
      if (!seen[s.type]) { seen[s.type] = true; types.push(s.type); }
    });
    setOptions(testTypeEl, types, function (t) {
      return t === 'emulatedMobile' ? (labels.emulatedMobile || t) : t;
    });
  }

  function pickSetup(loc, testType) {
    return (loc.setup || []).find(function (s) { return s.type === testType; });
  }

  function refreshForSetup(setup) {
    if (!setup) {
      setOptions(browserEl, []);
      setOptions(connectivityEl, []);
    } else {
      setOptions(browserEl, setup.browsers || []);
      setOptions(connectivityEl, setup.connectivity || []);
    }
    refreshDevices(setup);
  }

  function refreshDevices(setup) {
    if (!deviceEl) return;
    while (deviceEl.firstChild) deviceEl.removeChild(deviceEl.firstChild);
    if (!setup || setup.type !== 'android') return;
    // Android setups live as siblings within the same location, not
    // nested under one setup. Walk every setup in the location and
    // collect the ones that carry a deviceId.
    var loc = byName[locationEl.value];
    if (!loc) return;
    (loc.setup || []).forEach(function (s) {
      if (s.type === 'android' && s.deviceId) {
        var opt = document.createElement('option');
        opt.value = s.deviceId;
        opt.textContent = s.deviceId + ' (' + (queueSizes[s.queue] != null ? queueSizes[s.queue] : '?') + ')';
        deviceEl.appendChild(opt);
      }
    });
  }

  function applyLocation() {
    var loc = byName[locationEl.value];
    if (!loc) return;
    refreshTestTypes(loc);
    refreshForSetup(pickSetup(loc, testTypeEl.value));
  }

  function applyTestType() {
    var loc = byName[locationEl.value];
    if (!loc) return;
    refreshForSetup(pickSetup(loc, testTypeEl.value));
  }

  locationEl.addEventListener('change', applyLocation);
  testTypeEl.addEventListener('change', applyTestType);
})();
