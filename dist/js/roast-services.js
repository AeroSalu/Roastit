// Source adapters and roast generation.
// GitHub uses the public API when available.

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
    };

    const roastText = lines[prepared.sourceType] || lines.github;

    return {
      roastText: roastText,
    };
  },

  generate: async function (prepared) {
    return this.generateLocalRoast(prepared);
  },

  save: async function (user, prepared, result) {
    const roastText = (result.roastText || result.roast || result.headline || "Roast generated").slice(0, 7900);

    const payload = {
      uid: user.uid,
      sourceType: prepared.sourceType || "github",
      profileName: (prepared.profileName || "").slice(0, 200),
      profileUrl: (prepared.profileUrl || "").slice(0, 2000),
      fileName: (prepared.fileName || "").slice(0, 500),
      fileUrl: (prepared.fileUrl || "").slice(0, 2000),
      profileImage: (prepared.profileImage || "").slice(0, 2000),
      roastText: roastText,
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
    await firebase.firestore().collection("roasts").doc(roast.id).delete();
  },
};
