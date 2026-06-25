// ==========================================================================
// MAT Module: Mission View (mat-mission-view.js)
// ==========================================================================
// In-aircraft, single-screen layout for the Mission Scanner / Observer.
// iPad-portrait, map-dominant. Composes three existing capabilities onto one
// glanceable screen so the crew doesn't tab-hop in flight:
//   1) Moving map  — live GPS ownship + current CAP grid, USGS-topo basemap
//      (roads/features for air-to-ground directions), tap-to-mark a target.
//   2) One-tap Zulu time log — Takeoff / In Grid / Out of Grid / Ops Normal /
//      RTB — written to the SAME `events` store as the Unified Log (so they
//      export together).
//   3) Target capture + coordinate conversion — tap the map OR "mark my GPS";
//      shows DD / DDM / DMS and copies a radio-ready read-back for SAR partners.
//
// Rendered by index.html as MAT_MISSION_VIEW.MissionViewTab (receives React).
// ==========================================================================
(function () {
  'use strict';
  window.MAT_MISSION_VIEW = window.MAT_MISSION_VIEW || {};

  // One-tap log events (ids match the Unified Log's quick events).
  var LOG_EVENTS = [
    { id: 'wheelsUp', label: 'Takeoff', icon: '🛫', color: '#48bb78' },
    { id: 'inGrid', label: 'In Grid', icon: '📍', color: '#3182ce' },
    { id: 'outOfGrid', label: 'Out of Grid', icon: '📤', color: '#dd6b20' },
    { id: 'opsNormal', label: 'Ops Normal', icon: '✓', color: '#38a169' },
    { id: 'rtb', label: 'RTB', icon: '↩️', color: '#805ad5' }
  ];

  function MissionViewTab(props) {
    var React = props.React || window.React;
    var h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
    var events = props.events, setEvents = props.setEvents;
    var getZ = props.getZuluTimeOnly || function () { return ''; };
    var getZDate = props.getZuluDate || function () { return ''; };

    var gpsState = useState(null); var gps = gpsState[0], setGps = gpsState[1];
    var targetState = useState(null); var target = targetState[0], setTarget = targetState[1];
    var followState = useState(true); var follow = followState[0], setFollow = followState[1];
    var lastState = useState(null); var lastLogged = lastState[0], setLastLogged = lastState[1];
    var clockState = useState(getZ()); var clock = clockState[0], setClock = clockState[1];
    var copiedState = useState(false); var copied = copiedState[0], setCopied = copiedState[1];

    var mapElRef = useRef(null);
    var mapRef = useRef(null);
    var ownRef = useRef(null);
    var gridRef = useRef(null);
    var tgtRef = useRef(null);
    var followRef = useRef(follow);
    followRef.current = follow;

    // ---- clock tick ----
    useEffect(function () {
      var t = setInterval(function () { setClock(getZ()); }, 1000);
      return function () { clearInterval(t); };
    }, []);

    // ---- map init ----
    useEffect(function () {
      if (typeof L === 'undefined' || !mapElRef.current || mapRef.current) return;
      var map = L.map(mapElRef.current, { zoomControl: true, attributionControl: false }).setView([39.5, -105.5], 10);
      // USGS topo basemap (roads/features), OSM fallback on tile error
      var topo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 });
      var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
      topo.on('tileerror', function () { if (!map.hasLayer(osm)) { map.removeLayer(topo); osm.addTo(map); } });
      topo.addTo(map);
      L.control.layers({ 'USGS Topo': topo, 'OpenStreetMap': osm }, {}, { position: 'topright', collapsed: true }).addTo(map);
      // tap to mark a target
      map.on('click', function (e) { setTarget({ lat: e.latlng.lat, lon: e.latlng.lng, source: 'map' }); });
      mapRef.current = map;
      setTimeout(function () { try { map.invalidateSize(); } catch (e) {} }, 200);
      return function () { try { map.remove(); } catch (e) {} mapRef.current = null; };
    }, []);

    // ---- GPS watch ----
    useEffect(function () {
      if (!navigator.geolocation) return;
      var id = navigator.geolocation.watchPosition(
        function (pos) {
          setGps({
            lat: pos.coords.latitude, lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: (pos.coords.heading != null && !isNaN(pos.coords.heading)) ? pos.coords.heading : null,
            speed: pos.coords.speed, altitude: pos.coords.altitude
          });
        },
        function () {},
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
      return function () { if (id != null) navigator.geolocation.clearWatch(id); };
    }, []);

    // ---- ownship marker + current-grid overlay + follow ----
    useEffect(function () {
      var map = mapRef.current;
      if (!map || !gps) return;
      var ll = [gps.lat, gps.lon];
      var rot = (gps.heading != null) ? gps.heading : 0;
      var html = '<div style="transform:rotate(' + rot + 'deg);font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">✈️</div>';
      var icon = L.divIcon({ className: 'mv-ownship', html: html, iconSize: [30, 30], iconAnchor: [15, 15] });
      if (!ownRef.current) ownRef.current = L.marker(ll, { icon: icon, zIndexOffset: 1000 }).addTo(map);
      else { ownRef.current.setLatLng(ll); ownRef.current.setIcon(icon); }
      // current CAP grid cell rectangle
      if (window.MAT && MAT.geo && MAT.geo.spDetectCapGrid) {
        try {
          var g = MAT.geo.spDetectCapGrid(gps.lat, gps.lon);
          var c = g && (g.quadrantBounds || g.cell);
          if (c) {
            var b = [[c.south, c.west], [c.north, c.east]];
            if (!gridRef.current) gridRef.current = L.rectangle(b, { color: '#ff00ff', weight: 2, fill: false, dashArray: '6,6' }).addTo(map);
            else gridRef.current.setBounds(b);
          }
        } catch (e) {}
      }
      if (followRef.current) map.panTo(ll, { animate: true });
    }, [gps]);

    // ---- target marker ----
    useEffect(function () {
      var map = mapRef.current;
      if (!map) return;
      if (tgtRef.current) { map.removeLayer(tgtRef.current); tgtRef.current = null; }
      if (target) {
        var ti = L.divIcon({ className: 'mv-target', html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.9))">🎯</div>', iconSize: [30, 30], iconAnchor: [15, 28] });
        tgtRef.current = L.marker([target.lat, target.lon], { icon: ti, zIndexOffset: 1100 }).addTo(map);
        map.panTo([target.lat, target.lon], { animate: true });
      }
    }, [target]);

    // ---- helpers ----
    function gridString(lat, lon) {
      if (window.MAT && MAT.geo && MAT.geo.spDetectCapGrid) {
        try { var g = MAT.geo.spDetectCapGrid(lat, lon); return (g && (g.gridId || g.full)) || ''; } catch (e) {}
      }
      return '';
    }

    function logEvent(evt) {
      var dateZ = getZDate(), timeZ = getZ();
      var lat = gps ? gps.lat : null, lon = gps ? gps.lon : null;
      var entry = {
        id: ((events && events.length) || 0) + '-' + timeZ + '-' + evt.id,
        eventNum: ((events && events.length) ? events.length : 0) + 1,
        eventType: evt.label,
        dateZ: dateZ, timeZ: timeZ,
        latDeg: '', latMin: '', longDeg: '', longMin: '',
        altMSL: '', altAGL: '', heading: '', airspeed: '', groundSpeed: '',
        capGrid: (lat != null) ? gridString(lat, lon) : '',
        notes: '[Mission View] ' + evt.label
      };
      if (lat != null && window.gpsUtils) {
        var la = window.gpsUtils.ddToDdm(lat), lo = window.gpsUtils.ddToDdm(Math.abs(lon));
        entry.latDeg = String(la.deg); entry.latMin = la.min.toFixed(3);
        entry.longDeg = String(lo.deg); entry.longMin = lo.min.toFixed(3);
      }
      if (setEvents) setEvents(function (prev) { return [entry].concat(prev || []); });
      setLastLogged({ label: evt.label, timeZ: timeZ, icon: evt.icon });
    }

    function markGpsTarget() { if (gps) setTarget({ lat: gps.lat, lon: gps.lon, source: 'gps' }); }
    function recenter() { setFollow(true); if (mapRef.current && gps) mapRef.current.panTo([gps.lat, gps.lon], { animate: true }); }

    // coordinate formats for the target panel
    function fmt(lat, lon) {
      var u = window.gpsUtils;
      var latH = lat >= 0 ? 'N' : 'S', lonH = lon >= 0 ? 'E' : 'W';
      var aLat = Math.abs(lat), aLon = Math.abs(lon);
      var out = { dd: aLat.toFixed(5) + '°' + latH + ', ' + aLon.toFixed(5) + '°' + lonH };
      if (u) {
        var d1 = u.ddToDdm(aLat), d2 = u.ddToDdm(aLon);
        out.ddm = latH + ' ' + d1.deg + '° ' + d1.min.toFixed(3) + "'  " + lonH + ' ' + d2.deg + '° ' + d2.min.toFixed(3) + "'";
        var s1 = u.ddToDms(aLat), s2 = u.ddToDms(aLon);
        out.dms = latH + ' ' + s1.deg + '° ' + s1.min + "' " + s1.sec + '"  ' + lonH + ' ' + s2.deg + '° ' + s2.min + "' " + s2.sec + '"';
        out.radio = latH === 'N' ? 'North ' : 'South ';
        out.radio += d1.deg + ' degrees ' + d1.min.toFixed(1) + ' minutes, ' + (lonH === 'W' ? 'West ' : 'East ') + d2.deg + ' degrees ' + d2.min.toFixed(1) + ' minutes';
      }
      out.grid = gridString(lat, lon);
      return out;
    }

    function copyText(txt) {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(txt);
        else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
        setCopied(true); setTimeout(function () { setCopied(false); }, 1500);
        if (window.MAT && MAT.toast) MAT.toast('Target coordinates copied', 'success');
      } catch (e) {}
    }

    // ---- styles ----
    var headGrid = gps ? gridString(gps.lat, gps.lon) : '';
    var logBtn = function (e) {
      return h('button', {
        key: e.id, onClick: function () { logEvent(e); },
        style: { flex: '1 1 0', minWidth: '0', padding: '14px 4px', borderRadius: '10px', border: '1px solid ' + e.color,
          background: 'linear-gradient(135deg, ' + e.color + '33, ' + e.color + '18)', color: '#fff', fontWeight: '700',
          fontSize: '13px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minHeight: '60px' }
      }, h('span', { style: { fontSize: '20px' } }, e.icon), h('span', null, e.label));
    };

    var tf = target ? fmt(target.lat, target.lon) : null;
    var fmtBlock = tf ? ('TARGET — ' + (target.source === 'gps' ? 'aircraft GPS' : 'map mark') + '\nDD:  ' + tf.dd + '\nDDM: ' + (tf.ddm || '') + '\nDMS: ' + (tf.dms || '') + (tf.grid ? '\nCAP Grid: ' + tf.grid : '')) : '';

    return h('div', { style: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: '520px', gap: '8px', padding: '8px' } },
      // header
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' } },
        h('div', { style: { fontWeight: '800', color: '#63b3ed', fontSize: '16px' } }, '🗺️ Mission View'),
        h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', fontFamily: 'monospace' } },
          headGrid ? h('span', { style: { color: '#f6e05e', fontWeight: '700' } }, headGrid) : null,
          h('span', { style: { color: '#68d391', fontWeight: '700', fontSize: '16px' } }, clock + 'Z'))
      ),
      // map
      h('div', { style: { position: 'relative', flex: '1 1 auto', minHeight: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2d3748' } },
        h('div', { ref: mapElRef, style: { position: 'absolute', inset: '0', width: '100%', height: '100%', background: '#1a202c' } }),
        // map overlay buttons
        h('div', { style: { position: 'absolute', left: '10px', bottom: '10px', zIndex: 500, display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('button', { onClick: recenter, title: 'Recenter on aircraft',
            style: { padding: '10px 12px', borderRadius: '10px', border: 'none', background: follow ? '#3182ce' : 'rgba(45,55,72,0.95)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' } },
            (follow ? '📍 Following' : '📍 Recenter')),
          h('button', { onClick: markGpsTarget, disabled: !gps, title: 'Mark a target at the aircraft position',
            style: { padding: '10px 12px', borderRadius: '10px', border: 'none', background: gps ? 'linear-gradient(135deg,#e53e3e,#c53030)' : 'rgba(45,55,72,0.7)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: gps ? 'pointer' : 'default', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' } },
            '🎯 Mark GPS')),
        !gps ? h('div', { style: { position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'rgba(214,158,46,0.95)', color: '#1a202c', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' } }, '⚠ Waiting for GPS — enable Location') : null,
        h('div', { style: { position: 'absolute', top: '10px', left: '10px', zIndex: 500, background: 'rgba(26,32,44,0.85)', color: '#a0aec0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' } }, 'Tap map to mark a target')
      ),
      // one-tap log
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#a0aec0', padding: '0 2px' } },
          h('span', null, 'ONE-TAP LOG (Zulu) — saved to mission record'),
          lastLogged ? h('span', { style: { color: '#68d391' } }, '✔ logged ' + lastLogged.timeZ + 'Z') : null),
        h('div', { style: { display: 'flex', gap: '6px' } }, LOG_EVENTS.map(logBtn)),
        (function () {
          var recent = (events || []).filter(function (e) { return e && e.eventType && e.timeZ; }).slice(0, 4);
          if (!recent.length) return null;
          return h('div', { style: { fontSize: '11px', color: '#718096', display: 'flex', flexWrap: 'wrap', gap: '3px 14px', padding: '2px 2px 0' } },
            h('span', { style: { color: '#4a5568' } }, 'recent:'),
            recent.map(function (e, i) { return h('span', { key: i }, h('span', { style: { color: '#68d391', fontFamily: 'monospace' } }, e.timeZ + 'Z '), e.eventType); }));
        })()
      ),
      // target panel
      target ? h('div', { style: { background: 'rgba(229,62,62,0.12)', border: '1px solid rgba(229,62,62,0.45)', borderRadius: '12px', padding: '12px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
          h('div', { style: { fontWeight: '800', color: '#fc8181', fontSize: '14px' } }, '🎯 Target' + (tf.grid ? '  •  ' + tf.grid : '')),
          h('button', { onClick: function () { setTarget(null); }, style: { background: 'none', border: 'none', color: '#a0aec0', fontSize: '18px', cursor: 'pointer' } }, '✕')),
        h('div', { style: { fontFamily: 'monospace', fontSize: '14px', color: '#e2e8f0', lineHeight: '1.7' } },
          h('div', null, h('span', { style: { color: '#718096' } }, 'DDM  '), tf.ddm || ''),
          h('div', null, h('span', { style: { color: '#718096' } }, 'DD   '), tf.dd),
          h('div', null, h('span', { style: { color: '#718096' } }, 'DMS  '), tf.dms || '')),
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
          h('button', { onClick: function () { copyText(fmtBlock); },
            style: { flex: '1', padding: '12px', borderRadius: '10px', border: 'none', background: copied ? '#38a169' : 'linear-gradient(135deg,#3182ce,#2b6cb0)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' } },
            copied ? '✔ Copied' : '📋 Copy all'),
          h('button', { onClick: function () { copyText(tf.radio || tf.ddm); },
            style: { flex: '1', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#805ad5,#6b46c1)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' } },
            '📻 Copy read-back'))
      ) : h('div', { style: { background: 'rgba(99,179,237,0.08)', border: '1px dashed rgba(99,179,237,0.3)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: '#718096', fontSize: '13px' } },
        'No target marked. Tap the map where you see a clue, or use 🎯 Mark GPS when overhead — coordinates appear here in DD / DDM / DMS for radio read-back.')
    );
  }

  window.MAT_MISSION_VIEW.MissionViewTab = MissionViewTab;
  if (window.console) console.log('MAT Mission View module loaded (v1.0.0)');
})();
