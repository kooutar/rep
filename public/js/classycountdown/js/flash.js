document.addEventListener('DOMContentLoaded', function() {
    const flashMessage = document.getElementById('flash-message');
    if (flashMessage) {
      setTimeout(function() {
        flashMessage.style.opacity = '0';
      }, 3000); // La durée en millisecondes avant de commencer à disparaître
    }
  });
  