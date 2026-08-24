const GithubService = {
  async getProfile(username) {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`
    );

    if (response.status === 404) {
      throw new Error("GitHub user not found.");
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  },

  async getRepositories(username) {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  },

  async analyze(username) {
    const [profile, repositories] = await Promise.all([
      this.getProfile(username),
      this.getRepositories(username),
    ]);

    return {
      profile,
      repositories,
    };
  },

  async prepare(url, profileName) {
    const username = this.extractUsername(url);

    if (!username) {
      throw new Error("Invalid GitHub profile URL.");
    }

    const data = await this.analyze(username);

    const profile = data.profile;
    const repositories = data.repositories;

    const totalStars = repositories.reduce(
      (total, repo) =>
        total + (repo.stargazers_count || 0),
      0
    );

    const totalForks = repositories.reduce(
      (total, repo) =>
        total + (repo.forks_count || 0),
      0
    );

    const languages = {};

    repositories.forEach((repo) => {
      if (repo.language) {
        languages[repo.language] =
          (languages[repo.language] || 0) + 1;
      }
    });

    const inactiveRepositories =
      repositories.filter((repo) => {
        if (!repo.updated_at) return false;

        const updated =
          new Date(repo.updated_at);

        const sixMonthsAgo =
          new Date();

        sixMonthsAgo.setMonth(
          sixMonthsAgo.getMonth() - 6
        );

        return updated < sixMonthsAgo;
      }).length;

    return {
      sourceType: "github",

      profileName:
        profile.name ||
        profile.login ||
        profileName ||
        username,

      profileUrl: profile.html_url,

      profileImage: profile.avatar_url,

      fileName: "",

      fileUrl: "",

      notes: JSON.stringify({
        profile: {
          username: profile.login,
          name: profile.name,
          bio: profile.bio,
          followers: profile.followers,
          following: profile.following,
          repositories: profile.public_repos,
        },

        statistics: {
          totalStars: totalStars,
          totalForks: totalForks,
          inactiveRepositories:
            inactiveRepositories,
        },

        languages: languages,

        repositories: repositories.map(
          (repo) => ({
            name: repo.name,
            description: repo.description,
            url: repo.html_url,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            createdAt: repo.created_at,
            updatedAt: repo.updated_at,
            pushedAt: repo.pushed_at,
            isFork: repo.fork,
            archived: repo.archived,
          })
        ),
      }),
    };
  },

  // =========================================
  // SEND GITHUB DATA TO LOCAL QWEN ENGINE
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
      let errorMessage =
        "Roast engine request failed.";

      try {
        const errorData =
          await response.json();

        if (errorData.error) {
          errorMessage =
            errorData.error;
        }
      } catch (error) {
        // Ignore JSON parsing error
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  },

  // =========================================
  // EXTRACT GITHUB USERNAME
  // =========================================

  extractUsername(url) {
    try {
      const parsed =
        new URL(url);

      if (
        parsed.hostname !==
          "github.com" &&
        parsed.hostname !==
          "www.github.com"
      ) {
        return null;
      }

      const parts =
        parsed.pathname
          .split("/")
          .filter(Boolean);

      return parts[0] || null;
    } catch (error) {
      return null;
    }
  },
};
window.GithubService = GithubService;
console.log("GithubService loaded:", GithubService);
console.log(
  "sendToRoastEngine:",
  typeof GithubService.sendToRoastEngine
);