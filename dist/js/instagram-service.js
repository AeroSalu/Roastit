const InstagramService = {
  async getProfile(username) {
    const response = await fetch(
      `http://localhost:3000/api/instagram/${encodeURIComponent(username)}`
    );

    if (response.status === 404) {
      let notFoundMessage = "Instagram profile not found.";
      try {
        const errorData = await response.json();
        if (errorData.error) notFoundMessage = errorData.error;
      } catch (e) {}
      throw new Error(notFoundMessage);
    }

    if (!response.ok) {
      let errorMessage = `Instagram API error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Instagram profile not found or unavailable.");
    }

    return data;
  },

  async getPosts(username) {
    // If posts are not available through public collector, return empty array
    return [];
  },

  async analyze(username) {
    const [profile, posts] = await Promise.all([
      this.getProfile(username),
      this.getPosts(username),
    ]);

    return {
      profile,
      posts,
    };
  },

  async prepare(url, profileName) {
    const username = this.extractUsername(url);

    if (!username) {
      throw new Error("Invalid Instagram profile URL.");
    }

    const data = await this.analyze(username);
    const profile = data.profile;
    const posts = data.posts || [];

    return {
      sourceType: "instagram",

      profileName:
        profile.fullName ||
        profile.username ||
        profileName ||
        username,

      profileUrl: profile.profileUrl || `https://www.instagram.com/${username}/`,

      profileImage: profile.profileImage || "",

      fileName: "",

      fileUrl: "",

      notes: JSON.stringify({
        profile: {
          username: profile.username || username,
          name: profile.fullName || profileName || username,
          bio: profile.bio || "",
          followers: profile.followers || 0,
          following: profile.following || 0,
          posts: profile.posts || 0,
        },

        statistics: {
          averageLikes: 0,
          averageComments: 0,
        },

        posts: posts,
      }),
    };
  },

  // =========================================
  // SEND INSTAGRAM DATA TO LOCAL QWEN ENGINE
  // =========================================

  async sendToRoastEngine(profileData) {
    const response = await fetch(
      "http://localhost:3000/api/roast",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(profileData),
      }
    );

    if (!response.ok) {
      let errorMessage = "Roast engine request failed.";

      try {
        const errorData = await response.json();

        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (error) {
        // Ignore JSON parsing error
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // =========================================
  // EXTRACT INSTAGRAM USERNAME
  // =========================================

  extractUsername(url) {
    try {
      let target = (url || "").trim();
      if (!target) return null;
      if (!target.startsWith("http://") && !target.startsWith("https://")) {
        target = "https://" + target;
      }

      const parsed = new URL(target);

      if (
        parsed.hostname !== "instagram.com" &&
        parsed.hostname !== "www.instagram.com"
      ) {
        return null;
      }

      const parts = parsed.pathname
        .split("/")
        .filter(Boolean);

      const username = parts[0] || null;
      const blocked = { p: true, reel: true, reels: true, stories: true, explore: true, direct: true };
      if (!username || blocked[username]) {
        return null;
      }

      return username;
    } catch (error) {
      return null;
    }
  },
};

window.InstagramService = InstagramService;
