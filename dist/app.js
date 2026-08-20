document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.querySelector("#google-login");
  const status = document.querySelector("#login-status");

  // If the user is already signed in, skip login and open the dashboard.
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });

  loginButton.addEventListener("click", async () => {
    loginButton.disabled = true;
    status.textContent = "Opening Google sign-in…";

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      const result = await firebase.auth().signInWithPopup(provider);
      status.textContent = "Hello, " + (result.user.displayName || "there") + "!";
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Google sign-in failed:", error);
      status.textContent = "We couldn't sign you in. Please try again.";
    } finally {
      loginButton.disabled = false;
    }
  });
});
