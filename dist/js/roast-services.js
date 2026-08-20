// Source adapters and roast generation.
// LinkedIn/Instagram scraping is not implemented here (platform restrictions).
// GitHub uses the public API when available.
// Resume OCR/PDF text extraction needs a backend — marked below.

const LinkedinService = {
  // INTEGRATION POINT: connect a backend LinkedIn lookup later.
  prepare: async function (url, profileName) {
    return {
      sourceType: "linkedin",
      profileName: profileName,
      profileUrl: url,
      fileName: "",
      fileUrl: "",
      profileImage: "",
      notes: "",
    };
  },
};

const GithubService = {
  prepare: async function (url, profileName) {
    const prepared = {
      sourceType: "github",
      profileName: profileName,
      profileUrl: url,
      fileName: "",
      fileUrl: "",
      profileImage: "",
      notes: "",
    };

    try {
      const response = await fetch("https://api.github.com/users/" + encodeURIComponent(profileName));
      if (!response.ok) {
        return prepared;
      }
      const data = await response.json();
      prepared.profileName = data.login || profileName;
      prepared.profileImage = data.avatar_url || "";
      prepared.notes = data.bio || "";
    } catch (error) {
      console.warn("GitHub public API lookup skipped:", error);
    }

    return prepared;
  },
};

const InstagramService = {
  // INTEGRATION POINT: connect a backend Instagram lookup later.
  prepare: async function (url, profileName) {
    return {
      sourceType: "instagram",
      profileName: profileName,
      profileUrl: url,
      fileName: "",
      fileUrl: "",
      profileImage: "",
      notes: "",
    };
  },
};

const ResumeService = {
  MAX_BYTES: 8 * 1024 * 1024,

  uniqueName: function (originalName) {
    const safe = (originalName || "resume").replace(/[^a-zA-Z0-9._-]/g, "_");
    return Date.now() + "-" + safe;
  },

  upload: async function (user, file) {
    const path = "resumes/" + user.uid + "/" + this.uniqueName(file.name);
    const ref = firebase.storage().ref().child(path);
    await ref.put(file);
    const fileUrl = await ref.getDownloadURL();
    return {
      sourceType: "resume",
      profileName: file.name,
      profileUrl: "",
      fileName: file.name,
      fileUrl: fileUrl,
      storagePath: path,
      profileImage: "",
      notes: "",
    };
  },

  deleteFile: async function (fileUrl) {
    if (!fileUrl) {
      return;
    }
    try {
      await firebase.storage().refFromURL(fileUrl).delete();
    } catch (error) {
      if (error.code !== "storage/object-not-found") {
        throw error;
      }
    }
  },

  // Used by "Roast Again" before reusing an existing private resume upload.
  ensureAvailable: async function (fileUrl) {
    if (!fileUrl) {
      throw new Error("storage/object-not-found");
    }
    await firebase.storage().refFromURL(fileUrl).getMetadata();
  },

  // INTEGRATION POINT: send fileUrl to a backend for PDF text / OCR.
  extractText: async function () {
    return "";
  },
};

const RoastService = {
  generateLocalRoast: function (prepared) {
    const name = prepared.profileName || "this profile";
    const extra = prepared.notes ? " Bio energy: \"" + prepared.notes + "\"." : "";
    const lines = {
      linkedin:
        name +
        " brought a LinkedIn URL into a roast app and expected a standing ovation. The headline is trying very hard. The About section is doing cardio. Pick one personality and let the rest of LinkedIn recover." +
        extra,
      github:
        name +
        " has a GitHub profile that looks like a group project with extra steps. Repos exist. READMEs are optional. Commit messages range from 'fix' to 'please work'. The code is not the problem. The confidence is." +
        extra,
      instagram:
        name +
        " showed up with an Instagram URL like the algorithm asked for a character reference. The grid is curated. The captions are doing unpaid internships. One candid photo would roast itself harder than this." +
        extra,
      resume:
        name +
        " uploaded a resume and asked the internet to be honest. The file arrived. The skills list is longer than the stories. If this document were a person, it would say 'results-driven' while missing the bus." +
        extra,
    };

    const roastText = lines[prepared.sourceType] || lines.linkedin;
    const roastScore = Math.round((5.8 + Math.random() * 3.6) * 10) / 10;

    return {
      roastText: roastText,
      roastScore: roastScore,
    };
  },

  // INTEGRATION POINT: replace generateLocalRoast with your AI backend.
  // Keep secrets on the server. Expected response: { roastText, roastScore }.
  generate: async function (prepared) {
    await ResumeService.extractText(prepared);
    return this.generateLocalRoast(prepared);
  },

  save: async function (user, prepared, result) {
    const payload = {
      uid: user.uid,
      sourceType: prepared.sourceType,
      profileName: prepared.profileName || "",
      profileUrl: prepared.profileUrl || "",
      fileName: prepared.fileName || "",
      fileUrl: prepared.fileUrl || "",
      // Profile images belong to the roasted source, not the signed-in user.
      // The authenticated user's Google photo is displayed by the dashboard.
      profileImage: prepared.profileImage || "",
      roastText: result.roastText,
      roastScore: result.roastScore,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await firebase.firestore().collection("roasts").add(payload);
    payload.id = docRef.id;
    payload.createdAt = new Date();
    return payload;
  },

  delete: async function (user, roast) {
    if (!roast || roast.uid !== user.uid) {
      throw new Error("not-owner");
    }
    if (roast.sourceType === "resume" && roast.fileUrl) {
      await ResumeService.deleteFile(roast.fileUrl);
    }
    await firebase.firestore().collection("roasts").doc(roast.id).delete();
  },
};
