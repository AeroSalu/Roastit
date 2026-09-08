// URL and file checks used by the dashboard roast form.

const RoastValidators = {
  normalizeUrl: function (raw) {
    const trimmed = (raw || "").trim();
    if (!trimmed) {
      return "";
    }
    try {
      return new URL(trimmed).href;
    } catch (error) {
      return "";
    }
  },

  getHostAndPath: function (raw) {
    let href = this.normalizeUrl(raw);
    if (!href && raw && !raw.includes("://")) {
      href = this.normalizeUrl("https://" + raw.trim());
    }
    if (!href) {
      return null;
    }
    const parsed = new URL(href);
    return {
      host: parsed.hostname.replace(/^www\./, "").toLowerCase(),
      path: parsed.pathname.replace(/\/+$/, ""),
      href: parsed.origin + parsed.pathname.replace(/\/+$/, ""),
    };
  },

  firstPathPart: function (path) {
    const parts = path.split("/").filter(Boolean);
    return parts[0] || "";
  },

  validateLinkedin: function (raw) {
    const parts = this.getHostAndPath(raw);
    if (!parts) {
      return { ok: false, message: "Enter a valid LinkedIn URL, starting with https://" };
    }
    if (parts.host !== "linkedin.com") {
      return { ok: false, message: "That does not look like a LinkedIn link." };
    }
    const segments = parts.path.split("/").filter(Boolean);
    if (segments[0] !== "in" || !segments[1] || segments.length !== 2) {
      return { ok: false, message: "Use a LinkedIn profile URL like https://linkedin.com/in/username" };
    }
    return {
      ok: true,
      url: "https://www.linkedin.com/in/" + segments[1],
      profileName: segments[1],
    };
  },

  validateGithub: function (raw) {
    const parts = this.getHostAndPath(raw);
    if (!parts) {
      return { ok: false, message: "Enter a valid GitHub URL, starting with https://" };
    }
    if (parts.host !== "github.com") {
      return { ok: false, message: "That does not look like a GitHub link." };
    }
    const segments = parts.path.split("/").filter(Boolean);
    const username = segments[0];
    if (!username || username.includes(".") || segments.length !== 1) {
      return { ok: false, message: "Use a GitHub profile URL like https://github.com/username" };
    }
    return {
      ok: true,
      url: "https://github.com/" + username,
      profileName: username,
    };
  },



  friendlyFirebaseError: function (error) {
    const code = error && error.code ? error.code : "";
    if (code.indexOf("auth/") === 0) {
      return "Please sign in again to continue.";
    }
    if (code === "storage/unauthorized" || code === "permission-denied") {
      return "You do not have permission to do that.";
    }
    if (code === "storage/canceled") {
      return "Upload was cancelled.";
    }
    if (code === "unavailable" || code === "storage/retry-limit-exceeded") {
      return "Network issue. Check your connection and try again.";
    }
    if (code === "failed-precondition") {
      return "Firestore needs an index for this query. Deploy firestore.indexes.json, then try again.";
    }
    return "Something went wrong. Please try again.";
  },
};
