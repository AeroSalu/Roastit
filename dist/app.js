document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.querySelector('#google-login');
  const status = document.querySelector('#login-status');

  loginButton.addEventListener('click', async () => {
    loginButton.disabled = true;
    status.textContent = 'Opening Google sign-in…';

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      status.textContent = `Hello, ${result.user.displayName || 'there'}!`;
      console.log(result.user);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      status.textContent = `Sign-in failed: ${error.message}`;
    } finally {
      loginButton.disabled = false;
    }
  });
});
