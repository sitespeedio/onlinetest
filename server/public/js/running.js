const runningScript = document.currentScript;
const testId = runningScript.dataset.testId;
const showRandomAIImage = runningScript.dataset.showRandomAiImage === 'true';
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    worker(); 
};
});
function worker() {
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
      messageElement.replaceChildren();
      serverResponse.logs.forEach(function (line, index) {
        if (index > 0) messageElement.appendChild(document.createElement('br'));
        messageElement.appendChild(document.createTextNode(line));
      });
    }
    if (serverResponse.status === 'waiting') {
      document.getElementById('title').textContent = "Waiting to run tests " + testName;
      document.getElementById('message').textContent = serverResponse.message;
      setTimeout(worker, 2000);
    } else if (serverResponse.status === 'active' || serverResponse.status === 'stuck') {
        document.getElementById('title').textContent = "Testing " + testName;
        setTimeout(worker, 1000);
    } 
    else if (serverResponse.status === 'completed' || serverResponse.status === 'failed') {
      if (serverResponse.result) {
          window.location.href = serverResponse.result;
      } else location.reload();
      return;
    } 
  } 
  xhr.onerror = function() {
  // oops couldn't fetch the response
  console.error('Could not fetch the response');
  setTimeout(worker, 5000); 
};
xhr.send();
};

worker();
