onmessage = function() {
  setInterval(function () {
    postMessage(null)
  }, 5000)
}
