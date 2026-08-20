// URL and file checks used by the dashboard roast form.

const RoastValidators = {
  MAX_RESUME_BYTES: 8 * 1024 * 1024,

  allowedResumeTypes: {
    "application/pdf": true,
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true,
  },

  allowedResumeExtensions: {
    pdf: true,
    jpg: true,
    jpeg: true,
    png: true,
    webp: true,
  },

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
    const href = this.normalizeUrl(raw);
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

  validateInstagram: function (raw) {
    const parts = this.getHostAndPath(raw);
    if (!parts) {
      return { ok: false, message: "Enter a valid Instagram URL, starting with https://" };
    }
    if (parts.host !== "instagram.com") {
      return { ok: false, message: "That does not look like an Instagram link." };
    }
    const segments = parts.path.split("/").filter(Boolean);
    const username = segments[0];
    const blocked = { p: true, reel: true, reels: true, stories: true, explore: true };
    if (!username || blocked[username] || segments.length !== 1) {
      return { ok: false, message: "Use an Instagram profile URL like https://instagram.com/username" };
    }
    return {
      ok: true,
      url: "https://www.instagram.com/" + username,
      profileName: username,
    };
  },

  validateResumeFile: function (file) {
    if (!file) {
      return { ok: false, message: "Choose a PDF or image resume first." };
    }
    if (file.size > this.MAX_RESUME_BYTES) {
      return { ok: false, message: "That file is too large. Please keep resumes under 8 MB." };
    }
    const extension = (file.name.split(".").pop() || "").toLowerCase();
    const typeOk = this.allowedResumeTypes[file.type];
    const extensionOk = this.allowedResumeExtensions[extension];
    if (!typeOk && !extensionOk) {
      return { ok: false, message: "Please upload a PDF, JPG, JPEG, PNG, or WEBP file." };
    }
    return { ok: true };
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
