const runningScript = document.currentScript;
const testId = runningScript.dataset.testId;
const showRandomAIImage = runningScript.dataset.showRandomAiImage === 'true';
const STEPS = ['queued', 'starting', 'testing', 'report'];
const startTime = Date.now();
let pollTimer;
let resultUrl;

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    if (resultUrl) {
      window.location.href = resultUrl;
    } else {
      worker();
    }
  }
});

// Read the progress from the sitespeed.io log lines, for example
// "Testing url https://www.sitespeed.io/ iteration 2".
function parseProgress(logs) {
  const progress = { iteration: 0, iterations: 0, completed: 0, results: [], report: false };
  for (const line of logs.join('\n').split('\n')) {
    let match;
    if ((match = line.match(/Running tests using \S+ - (\d+) iteration/))) {
      progress.iterations = Number(match[1]);
    } else if ((match = line.match(/Testing url (\S+) iteration (\d+)/))) {
      progress.iteration = Number(match[2]);
    } else if ((match = line.match(/INFO: (\S+) TTFB: ([\d.]+m?s)/))) {
      progress.completed = progress.iteration;
      progress.results.push({
        iteration: progress.iteration,
        url: match[1],
        ttfb: match[2],
        firstPaint: line.match(/firstPaint: ([\d.]+m?s)/)?.[1],
        lcp: line.match(/LCP: ([\d.]+m?s)/)?.[1]
      });
    } else if (/HTML stored in|Uploading .* to S3/.test(line)) {
      progress.report = true;
    }
  }
  return progress;
}

function formatElapsed() {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

function renderSteps(step) {
  const current = STEPS.indexOf(step);
  document.querySelectorAll('.progress-steps li').forEach(function (item) {
    const index = STEPS.indexOf(item.dataset.step);
    item.classList.toggle('is-done', index < current);
    item.classList.toggle('is-current', index === current);
    if (index === current) {
      item.setAttribute('aria-current', 'step');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

// sitespeed.io logs "850ms" or "1.57s"
function toMs(value) {
  return value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
}

function renderResults(results) {
  const bars = document.getElementById('iteration-bars');
  if (bars.children.length === results.length) return;
  const withLcp = results.filter(result => result.lcp).toSorted((a, b) => toMs(a.lcp) - toMs(b.lcp));
  const maxLcp = withLcp.length > 0 ? toMs(withLcp.at(-1).lcp) : 1;
  bars.replaceChildren();
  results.forEach(function (result, index) {
    const bar = document.createElement('span');
    bar.title = result.url + '\n#' + result.iteration + ' TTFB ' + result.ttfb +
      (result.firstPaint ? ' · First paint ' + result.firstPaint : '') +
      (result.lcp ? ' · LCP ' + result.lcp : '');
    bar.classList.toggle('is-latest', index === results.length - 1);
    // The bar compares the LCP of this iteration with the slowest one.
    bar.style.height = result.lcp ? (toMs(result.lcp) / maxLcp) * 100 + '%' : '0';
    bars.appendChild(bar);
  });

  const latest = results.at(-1);
  const label = document.createElement('strong');
  label.textContent = '#' + latest.iteration;
  const median = withLcp[Math.floor((withLcp.length - 1) / 2)];
  document.getElementById('iteration-latest').replaceChildren(
    'Latest ',
    label,
    ' ' + [latest.ttfb, latest.firstPaint || '-', latest.lcp || '-'].join(' / ') +
      (median ? ' · median LCP ' + median.lcp : '')
  );
  document.getElementById('iteration-results').hidden = false;
}

function renderProgress(status, logs, testName) {
  const progress = parseProgress(logs);
  let step = 'starting';
  let stage = 'Starting the test';
  if (status === 'waiting') {
    step = 'queued';
    stage = 'Waiting in the queue';
  } else if (progress.report) {
    step = 'report';
    stage = 'Building the report';
  } else if (progress.iteration > 0) {
    step = 'testing';
    stage = progress.iterations > 0
      ? 'Iteration ' + progress.iteration + ' of ' + progress.iterations
      : 'Iteration ' + progress.iteration;
  }
  renderSteps(step);
  renderResults(progress.results);

  const stageElement = document.getElementById('progress-stage');
  if (stageElement.textContent !== stage) stageElement.textContent = stage;
  document.getElementById('progress-detail').textContent = formatElapsed() + ' elapsed';

  const bar = document.getElementById('progress-bar');
  bar.hidden = step !== 'testing' && step !== 'report';
  bar.value = progress.report ? 1 : progress.completed / (progress.iterations || 1);

  document.title = (step === 'testing' && progress.iterations > 0
    ? '(' + progress.iteration + '/' + progress.iterations + ') '
    : '') + testName;
}

// When the tab is hidden, stay on this page until the user comes back,
// so the finished state is visible in the tab title.
function finish(url) {
  if (document.visibilityState === 'visible') {
    window.location.href = url;
    return;
  }
  resultUrl = url;
  document.title = '✓ ' + document.title.replace(/^\(\d+\/\d+\) /, '');
}

function worker() {
  clearTimeout(pollTimer);
  const images = ['/img/ai/performance-engineers-healthy-relationship-to-google.jpg'];
  const texts = ['Performance Engineers healthy relationship to Google'];
  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/status/" + encodeURIComponent(testId), true);
  xhr.onload = function() {
    const serverResponse = JSON.parse(xhr.responseText);
    const testName = serverResponse.url === '' ? serverResponse.scriptingName : serverResponse.url;

    if (showRandomAIImage === true) {
      const index = Math.floor(Math.random() * images.length);
      const messageElement = document.getElementById('message');
      const image = document.createElement('img');
      image.src = images[index];
      image.alt = texts[index];

      const header = document.createElement('h2');
      header.textContent = 'AI generated content:' + texts[0];

      messageElement.innerHTML = '';

      messageElement.appendChild(header);
      messageElement.appendChild(image);
    } else {
      // The logs and the test name come from the user, so add them as text
      const messageElement = document.getElementById('message');
      const atBottom = messageElement.scrollHeight - messageElement.scrollTop - messageElement.clientHeight < 24;
      messageElement.replaceChildren();
      serverResponse.logs.forEach(function (line, index) {
        if (index > 0) messageElement.appendChild(document.createElement('br'));
        messageElement.appendChild(document.createTextNode(line));
      });
      if (atBottom) messageElement.scrollTop = messageElement.scrollHeight;
    }
    renderProgress(serverResponse.status, serverResponse.logs, testName);
    if (serverResponse.status === 'waiting') {
      document.getElementById('title').textContent = "Waiting to run tests " + testName;
      document.getElementById('message').textContent = serverResponse.message;
      pollTimer = setTimeout(worker, 2000);
    } else if (serverResponse.status === 'active' || serverResponse.status === 'stuck') {
        document.getElementById('title').textContent = "Testing " + testName;
        pollTimer = setTimeout(worker, 1000);
    }
    else if (serverResponse.status === 'completed' || serverResponse.status === 'failed') {
      if (serverResponse.result) {
          finish(serverResponse.result);
      } else location.reload();
      return;
    }
  }
  xhr.onerror = function() {
  // oops couldn't fetch the response
  console.error('Could not fetch the response');
  pollTimer = setTimeout(worker, 5000);
};
xhr.send();
};

worker();
