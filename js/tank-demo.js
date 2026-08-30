/* ==========================================================================
   Jal Suraksha — Tank Demo
   Simulated ultrasonic reading stream driving the tank visual, live
   readouts, status banner, and the shared Kavach alert overlay.
   ========================================================================== */
(function () {
  'use strict';

  var MAX_LEVEL = 100;      // cm, top of tank
  var THRESHOLD = 70;       // cm, danger threshold
  var CAUTION_AT = 50;      // cm, where the caution state begins
  var START_LEVEL = 8;      // cm, resting level
  var TICK_MS = 400;        // each tick represents one simulated minute

  var els = {
    tankFill: document.getElementById('tank-fill'),
    tankLevelTag: document.getElementById('tank-level-tag'),
    levelValue: document.getElementById('level-value'),
    rateValue: document.getElementById('rate-value'),
    readoutLevel: document.getElementById('readout-level'),
    readoutRate: document.getElementById('readout-rate'),
    statusBanner: document.getElementById('status-banner'),
    statusText: document.getElementById('status-text'),
    statusDetail: document.getElementById('status-detail'),
    scenarioHint: document.getElementById('scenario-hint'),
    resetBtn: document.getElementById('reset-demo'),
    alertOverlay: document.getElementById('alert-overlay'),
    alertDetail: document.getElementById('alert-detail'),
    alertAck: document.getElementById('alert-ack'),
  };

  var scenarioButtons = Array.prototype.slice.call(document.querySelectorAll('.scenario-btn'));

  var SCENARIOS = {
    light: {
      label: 'Light Rain',
      hint: 'Light rain running — the level barely moves, well inside the safe range.',
      cap: 22,
      nextIncrement: function () {
        return 0.05 + Math.random() * 0.05;
      },
    },
    heavy: {
      label: 'Heavy Rain',
      hint: 'Heavy rain running — the level is climbing steadily toward a sustained caution state.',
      cap: THRESHOLD - 4, // settles just under the threshold, never trips the alert
      nextIncrement: function (level) {
        var settlePoint = THRESHOLD - 8;
        var pull = Math.max(0.04, (settlePoint - level) * 0.08);
        var jitter = Math.random() * 0.05;
        return pull + jitter;
      },
    },
    flash: {
      label: 'Flash Flood',
      hint: 'Flash flood running — rapid rise, watch the threshold.',
      cap: null,
      nextIncrement: function () {
        return 2.6 + Math.random() * 1.4;
      },
    },
  };

  var state = {
    level: START_LEVEL,
    rate: 0,
    recentRates: [],
    scenario: null,
    intervalId: null,
    alertShown: false,
  };

  function classify(level) {
    if (level >= THRESHOLD) return 'emergency';
    if (level >= CAUTION_AT) return 'warning';
    return 'normal';
  }

  function averagedRate(rate) {
    state.recentRates.push(rate);
    if (state.recentRates.length > 3) state.recentRates.shift();
    var sum = state.recentRates.reduce(function (a, b) { return a + b; }, 0);
    return sum / state.recentRates.length;
  }

  function render() {
    var pct = Math.min(100, state.level);
    var tier = classify(state.level);

    els.tankFill.style.height = pct + '%';
    els.tankFill.setAttribute('data-state', tier);
    els.tankLevelTag.style.bottom = pct + '%';
    els.tankLevelTag.textContent = state.level.toFixed(1) + ' cm';

    els.levelValue.textContent = state.level.toFixed(1);
    els.rateValue.textContent = state.rate.toFixed(2);

    els.readoutLevel.setAttribute('data-state', tier);
    els.readoutRate.setAttribute('data-state', tier);

    els.statusBanner.classList.remove('status-normal', 'status-warning', 'status-emergency');
    if (tier === 'normal') {
      els.statusBanner.classList.add('status-normal');
      els.statusText.textContent = 'NORMAL';
      els.statusDetail.textContent = 'Water level within safe range';
    } else if (tier === 'warning') {
      els.statusBanner.classList.add('status-warning');
      els.statusText.textContent = 'CAUTION';
      els.statusDetail.textContent = 'Rate-of-rise elevated — monitor closely';
    } else {
      els.statusBanner.classList.add('status-emergency');
      els.statusText.textContent = 'CRITICAL';
      els.statusDetail.textContent = 'Danger threshold crossed — alert dispatched';
    }
  }

  function setActiveButton(name) {
    scenarioButtons.forEach(function (btn) {
      btn.setAttribute('data-active', String(btn.getAttribute('data-scenario') === name));
    });
  }

  function tick() {
    var config = SCENARIOS[state.scenario];
    if (!config) return;
    var previousLevel = state.level;
    var rawInc = config.nextIncrement(previousLevel);
    var candidate = previousLevel + rawInc;
    if (config.cap != null) candidate = Math.min(candidate, config.cap);
    state.level = Math.min(MAX_LEVEL, candidate);
    state.rate = averagedRate(state.level - previousLevel);
    render();

    if (state.level >= THRESHOLD && !state.alertShown) {
      triggerAlert();
    }
  }

  function startScenario(name) {
    if (!SCENARIOS[name]) return;
    state.scenario = name;
    state.alertShown = false;
    hideAlert();
    setActiveButton(name);
    els.scenarioHint.textContent = SCENARIOS[name].hint;
    if (state.intervalId) clearInterval(state.intervalId);
    state.intervalId = setInterval(tick, TICK_MS);
  }

  function triggerAlert() {
    state.alertShown = true;
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    els.alertDetail.textContent =
      'Reference: Drain Entrance\n' +
      'Level: ' + state.level.toFixed(1) + ' cm (threshold ' + THRESHOLD + ' cm)\n' +
      'Rate-of-rise: ' + state.rate.toFixed(2) + ' cm/min\n' +
      'Dispatch: SMS + Kavach dashboard alert sent';
    els.alertOverlay.classList.add('is-visible');
    els.scenarioHint.textContent = 'Critical alert dispatched. Acknowledge to dismiss, or reset to run again.';
  }

  function hideAlert() {
    els.alertOverlay.classList.remove('is-visible');
  }

  function resetDemo() {
    if (state.intervalId) clearInterval(state.intervalId);
    state.level = START_LEVEL;
    state.rate = 0;
    state.recentRates = [];
    state.scenario = null;
    state.alertShown = false;
    state.intervalId = null;
    hideAlert();
    setActiveButton(null);
    els.scenarioHint.textContent = 'Choose a scenario to start the simulated reading stream.';
    render();
  }

  scenarioButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      startScenario(btn.getAttribute('data-scenario'));
    });
  });

  els.alertAck.addEventListener('click', hideAlert);
  els.resetBtn.addEventListener('click', resetDemo);

  render();
})();
