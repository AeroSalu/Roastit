// Dashboard controller. Coordinates Firebase Auth, Firestore History,
// validation, RoastService, and GithubService for AI roasts.

document.addEventListener("DOMContentLoaded", function () {
  var state = {
    user: null,
    sourceType: "github",
    selectedFile: null,
    reusedResume: null,
    filter: "all",
    recentItems: [],
    roastToDelete: null,
  };

  var sourceInfo = {
    linkedin: {
      label: "LinkedIn",
      icon: "💼",
      placeholder: "https://linkedin.com/in/username",
    },
    github: {
      label: "GitHub",
      icon: "💻",
      placeholder: "https://github.com/username",
    },
    instagram: {
      label: "Instagram",
      icon: "📸",
      placeholder: "https://instagram.com/username",
    },
    resume: {
      label: "Resume",
      icon: "📄",
      placeholder: "",
    },
  };

  var sidebar = document.querySelector("#sidebar");
  var overlay = document.querySelector("#overlay");
  var roastButton = document.querySelector("#roast-btn");
  var roastStatus = document.querySelector("#roast-status");
  var profileUrl = document.querySelector("#profile-url");
  var resumeFile = document.querySelector("#resume-file");
  var deleteDialog = document.querySelector("#delete-dialog");
  var viewHistoryButton = document.querySelector("#view-history-btn");
  var historyRefreshButton = document.querySelector("#history-refresh-btn");
  var loadMoreButton = document.querySelector("#load-more-btn");
  var historySearch = document.querySelector("#history-search");

  // =========================================
  // NAVIGATION
  // =========================================

  document.querySelectorAll(".nav-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      showView(button.getAttribute("data-view"));
      closeSidebar();
    });
  });

  var menuToggle = document.querySelector("#menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("open");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // =========================================
  // SOURCE SELECTION
  // =========================================

  document.querySelectorAll(".source-card").forEach(function (button) {
    button.addEventListener("click", function () {
      selectSource(button.getAttribute("data-source"));
    });
  });

  // =========================================
  // RESUME FILE
  // =========================================

  if (resumeFile) {
    resumeFile.addEventListener("change", function () {
      chooseFile(resumeFile.files[0] || null);
    });
  }

  var dropZone = document.querySelector("#drop-zone");
  if (dropZone) {
    ["dragenter", "dragover"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropZone.classList.add("dragging");
      });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropZone.classList.remove("dragging");
      });
    });

    dropZone.addEventListener("drop", function (event) {
      chooseFile(event.dataTransfer.files[0] || null);
    });
  }

  // =========================================
  // BUTTONS & HISTORY CONTROLS
  // =========================================

  if (roastButton) {
    roastButton.addEventListener("click", function () {
      submitRoast();
    });
  }

  if (viewHistoryButton) {
    viewHistoryButton.addEventListener("click", function () {
      showView("history");
    });
  }

  if (historyRefreshButton) {
    historyRefreshButton.addEventListener("click", function () {
      loadHistory(true);
    });
  }

  if (loadMoreButton) {
    loadMoreButton.addEventListener("click", function () {
      loadHistory(false);
    });
  }

  if (historySearch) {
    historySearch.addEventListener("input", renderHistory);
  }

  document.querySelectorAll(".filter-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      state.filter = button.getAttribute("data-filter");
      document.querySelectorAll(".filter-btn").forEach(function (filterButton) {
        filterButton.classList.toggle("active", filterButton === button);
      });
      loadHistory(true);
    });
  });

  if (deleteDialog) {
    deleteDialog.addEventListener("close", function () {
      if (deleteDialog.returnValue === "delete") {
        deleteSelectedRoast();
      }
    });
  }

  // =========================================
  // LOGOUT
  // =========================================

  var logoutBtn = document.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      var button = this;
      button.disabled = true;
      try {
        await firebase.auth().signOut();
        window.location.href = "index.html";
      } catch (error) {
        console.error("Logout failed:", error);
        button.disabled = false;
        alert("Could not log out. Please try again.");
      }
    });
  }

  // =========================================
  // FIREBASE AUTH
  // =========================================

  firebase.auth().onAuthStateChanged(async function (user) {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    state.user = user;
    fillUserInfo(user);
    selectSource("github");
    await loadRecentRoasts();
  });

  // =========================================
  // SELECT SOURCE
  // =========================================

  function selectSource(sourceType) {
    state.sourceType = sourceType;
    state.reusedResume = null;
    roastStatus.textContent = "";

    document.querySelectorAll(".source-card").forEach(function (card) {
      var selected = card.getAttribute("data-source") === sourceType;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });

    var isResume = sourceType === "resume";
    var urlForm = document.querySelector("#url-source-form");
    var resumeForm = document.querySelector("#resume-source-form");

    if (urlForm) urlForm.hidden = isResume;
    if (resumeForm) resumeForm.hidden = !isResume;

    if (roastButton) {
      roastButton.textContent = isResume ? "🔥 Roast Resume" : "🔥 Roast Profile";
    }

    if (!isResume) {
      var info = sourceInfo[sourceType] || sourceInfo.github;
      var urlLabel = document.querySelector("#profile-url-label");
      if (urlLabel) {
        urlLabel.textContent = info.label + " Profile URL";
      }
      if (profileUrl) {
        profileUrl.placeholder = info.placeholder;
        profileUrl.focus();
      }
    }
  }

  // =========================================
  // FILE SELECTION
  // =========================================

  function chooseFile(file) {
    state.reusedResume = null;
    state.selectedFile = file;
    var selectedFile = document.querySelector("#selected-file");
    if (!selectedFile) return;

    if (!file) {
      selectedFile.textContent = "";
      return;
    }

    if (typeof RoastValidators !== "undefined") {
      var validation = RoastValidators.validateResumeFile(file);
      selectedFile.textContent = validation.ok ? "Selected: " + file.name : validation.message;
      selectedFile.classList.toggle("error-text", !validation.ok);
    } else {
      selectedFile.textContent = "Selected: " + file.name;
    }
  }

  // =========================================
  // MAIN ROAST FUNCTION
  // =========================================

  async function submitRoast() {
    if (!state.user) {
      roastStatus.textContent = "Please sign in again to roast a profile.";
      return;
    }

    var uploadedResume = null;

    if (state.sourceType === "github") {
      var url = profileUrl.value.trim();
      if (!url) {
        roastStatus.textContent = "Please enter your GitHub profile URL.";
        return;
      }

      if (typeof RoastValidators !== "undefined") {
        var validation = RoastValidators.validateGithub(url);
        if (!validation.ok) {
          roastStatus.textContent = validation.message;
          return;
        }
        url = validation.url;
      }

      try {
        setRoastProcessing(true, "Getting GitHub profile...");

        // Step 1: Get and normalize GitHub data (including profile avatar_url)
        var prepared = await GithubService.prepare(url, "");
        console.log("Prepared GitHub data:", prepared);

        // Step 2: Send to Roast Engine (Qwen)
        roastStatus.textContent = "🔥 Sending profile to Qwen...";
        var response = await GithubService.sendToRoastEngine(prepared);
        console.log("Qwen response:", response);

        if (!response) {
          throw new Error("No response received from Roast Engine.");
        }

        if (response.success === false) {
          throw new Error(response.error || "Roast Engine failed.");
        }

        var result = response.result;
        if (!result) {
          throw new Error("Roast Engine returned no roast result.");
        }

        // Step 3: Save roast to Firestore History
        roastStatus.textContent = "Saving your roast to history...";
        var savedRoast = null;
        try {
          savedRoast = await RoastService.save(state.user, prepared, result);
          HistoryService.prepend(savedRoast);
          state.recentItems.unshift(savedRoast);
          state.recentItems = state.recentItems.slice(0, 3);
          renderRecentRoasts();
          renderHistory();
        } catch (saveError) {
          console.warn("Could not save roast to Firestore:", saveError);
        }

        // Step 4: Display roast (with GitHub avatar)
        roastStatus.textContent = "🔥 Roast generated!";
        renderRoastResult(prepared, result, savedRoast);
        showView("result");
        setRoastProcessing(false, "");

      } catch (error) {
        console.error("Roast creation failed:", error);
        roastStatus.textContent = getFriendlyError(error);
        setRoastProcessing(false);
      }
      return;
    }

    if (state.sourceType === "instagram") {
      var url = profileUrl.value.trim();
      if (!url) {
        roastStatus.textContent = "Please enter your Instagram profile URL.";
        return;
      }

      if (typeof RoastValidators !== "undefined") {
        var validation = RoastValidators.validateInstagram(url);
        if (!validation.ok) {
          roastStatus.textContent = validation.message;
          return;
        }
        url = validation.url;
      }

      try {
        setRoastProcessing(true, "Getting Instagram profile...");

        // Step 1: Get and normalize Instagram data
        var prepared = await InstagramService.prepare(url, "");
        console.log("Prepared Instagram data:", prepared);

        // Step 2: Send to Roast Engine (Qwen)
        roastStatus.textContent = "🔥 Sending profile to Qwen...";
        var response = await InstagramService.sendToRoastEngine(prepared);
        console.log("Qwen response:", response);

        if (!response) {
          throw new Error("No response received from Roast Engine.");
        }

        if (response.success === false) {
          throw new Error(response.error || "Roast Engine failed.");
        }

        var result = response.result;
        if (!result) {
          throw new Error("Roast Engine returned no roast result.");
        }

        // Step 3: Save roast to Firestore History
        roastStatus.textContent = "Saving your roast to history...";
        var savedRoast = null;
        try {
          savedRoast = await RoastService.save(state.user, prepared, result);
          HistoryService.prepend(savedRoast);
          state.recentItems.unshift(savedRoast);
          state.recentItems = state.recentItems.slice(0, 3);
          renderRecentRoasts();
          renderHistory();
        } catch (saveError) {
          console.warn("Could not save roast to Firestore:", saveError);
        }

        // Step 4: Display roast
        roastStatus.textContent = "🔥 Roast generated!";
        renderRoastResult(prepared, result, savedRoast);
        showView("result");
        setRoastProcessing(false, "");

      } catch (error) {
        console.error("Roast creation failed:", error);
        roastStatus.textContent = getFriendlyError(error);
        setRoastProcessing(false);
      }
      return;
    }

    // Other sources (LinkedIn, Resume)
    setRoastProcessing(true, "Analyzing profile...");
    try {
      var preparedOther;
      if (state.sourceType === "resume") {
        if (state.reusedResume) {
          preparedOther = resumePreparedFromRoast(state.reusedResume);
        } else {
          var fileValidation = RoastValidators.validateResumeFile(state.selectedFile);
          if (!fileValidation.ok) {
            throw new UserFacingError(fileValidation.message);
          }
          roastStatus.textContent = "Uploading resume...";
          uploadedResume = await ResumeService.upload(state.user, state.selectedFile);
          preparedOther = uploadedResume;
        }
      } else {
        var validationOther = validateSourceUrl(state.sourceType, profileUrl.value);
        if (!validationOther.ok) {
          throw new UserFacingError(validationOther.message);
        }
        preparedOther = await prepareUrlSource(state.sourceType, validationOther.url, validationOther.profileName);
      }

      roastStatus.textContent = "Preparing your roast...";
      var resultOther = await RoastService.generate(preparedOther);

      roastStatus.textContent = "Saving your roast...";
      var savedRoastOther = await RoastService.save(state.user, preparedOther, resultOther);
      HistoryService.prepend(savedRoastOther);
      state.recentItems.unshift(savedRoastOther);
      state.recentItems = state.recentItems.slice(0, 3);
      renderRecentRoasts();
      renderHistory();
      renderResult(savedRoastOther);
      showView("result");
      roastStatus.textContent = "";
      state.selectedFile = null;
      if (resumeFile) resumeFile.value = "";
      var selFileEl = document.querySelector("#selected-file");
      if (selFileEl) selFileEl.textContent = "";
    } catch (error) {
      console.error("Roast creation failed:", error);
      if (uploadedResume && uploadedResume.fileUrl) {
        try {
          await ResumeService.deleteFile(uploadedResume.fileUrl);
        } catch (cleanupError) {
          console.warn("Could not remove unfinished upload:", cleanupError);
        }
      }
      roastStatus.textContent = error instanceof UserFacingError ? error.message : (typeof RoastValidators !== "undefined" ? RoastValidators.friendlyFirebaseError(error) : getFriendlyError(error));
    } finally {
      setRoastProcessing(false);
    }
  }

  function validateSourceUrl(sourceType, value) {
    if (sourceType === "linkedin") return RoastValidators.validateLinkedin(value);
    if (sourceType === "github") return RoastValidators.validateGithub(value);
    return RoastValidators.validateInstagram(value);
  }

  function prepareUrlSource(sourceType, url, profileName) {
    if (sourceType === "linkedin") return LinkedinService.prepare(url, profileName);
    if (sourceType === "github") return GithubService.prepare(url, profileName);
    return InstagramService.prepare(url, profileName);
  }

  function resumePreparedFromRoast(roast) {
    return {
      sourceType: "resume",
      profileName: roast.profileName,
      profileUrl: "",
      fileName: roast.fileName,
      fileUrl: roast.fileUrl,
      profileImage: "",
      notes: "",
    };
  }

  // =========================================
  // RENDER DETAILED ROAST RESULT
  // =========================================

  function renderRoastResult(prepared, result, savedRoast) {
    var container = document.querySelector("#result-content");
    container.innerHTML = "";

    // Badge
    var info = sourceInfo[prepared.sourceType] || sourceInfo.github;
    var badge = document.createElement("span");
    badge.className = "source-badge";
    badge.textContent = info.icon + " " + info.label;
    container.appendChild(badge);

    // Title
    var title = document.createElement("h1");
    title.textContent = prepared.profileName || (info.label + " Profile");
    container.appendChild(title);

    // User Profile Photo
    if (prepared.profileImage) {
      var image = document.createElement("img");
      image.className = "result-image";
      image.src = prepared.profileImage;
      image.alt = (prepared.profileName || info.label) + "'s profile photo";
      image.referrerPolicy = "no-referrer";
      container.appendChild(image);
    }

    // Profile Link
    if (prepared.profileUrl) {
      var link = document.createElement("a");
      link.href = prepared.profileUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = prepared.profileUrl;
      container.appendChild(link);
    }

    // Score
    var displayScore = typeof result.score === "number" ? result.score : (typeof result.roastScore === "number" ? result.roastScore : null);
    if (displayScore !== null) {
      var scoreLabel = document.createElement("p");
      scoreLabel.className = "card-label";
      scoreLabel.textContent = "ROAST SCORE";
      container.appendChild(scoreLabel);

      var score = document.createElement("strong");
      score.className = "score result-score";
      score.textContent = Number(displayScore).toFixed(1) + "/10 🔥";
      container.appendChild(score);
    }

    // Headline
    if (result.headline) {
      addSection(container, "🔥 OVERALL ROAST", result.headline);
    }

    // Main Roast
    if (result.roast) {
      addSection(container, "💀 THE ROAST", result.roast);
    } else if (result.roastText) {
      addSection(container, "💀 THE ROAST", result.roastText);
    }

    // Technical / Profile Analysis
    if (result.technicalAnalysis) {
      addSection(container, prepared.sourceType === "instagram" ? "📸 PROFILE & AESTHETIC ANALYSIS" : "💻 TECHNICAL ANALYSIS", result.technicalAnalysis);
    }

    // Project / Content Analysis
    if (result.projectAnalysis) {
      addSection(container, prepared.sourceType === "instagram" ? "📱 CONTENT & GRID ANALYSIS" : "📁 PROJECT ANALYSIS", result.projectAnalysis);
    }

    // Activity / Clout Analysis
    if (result.activityAnalysis) {
      addSection(container, prepared.sourceType === "instagram" ? "📊 CLOUT & ENGAGEMENT ANALYSIS" : "📊 ACTIVITY ANALYSIS", result.activityAnalysis);
    }

    // Strengths
    if (Array.isArray(result.strengths) && result.strengths.length) {
      addListSection(container, "🏆 STRENGTHS", result.strengths);
    }

    // Weaknesses
    if (Array.isArray(result.weaknesses) && result.weaknesses.length) {
      addListSection(container, "💀 WEAKNESSES", result.weaknesses);
    }

    // Recommendations
    if (Array.isArray(result.recommendations) && result.recommendations.length) {
      addListSection(container, "🎯 WHAT YOU SHOULD FIX", result.recommendations);
    }

    // Final Verdict
    if (result.finalVerdict) {
      addSection(container, "🏁 FINAL VERDICT", result.finalVerdict);
    }

    // Actions
    var actions = document.createElement("div");
    actions.className = "card-actions";

    var roastAgainBtn = document.createElement("button");
    roastAgainBtn.className = "btn btn-primary";
    roastAgainBtn.type = "button";
    roastAgainBtn.textContent = "🔥 Roast Again";
    roastAgainBtn.addEventListener("click", function () {
      showView("home");
    });
    actions.appendChild(roastAgainBtn);

    var historyBtn = document.createElement("button");
    historyBtn.className = "btn btn-ghost";
    historyBtn.type = "button";
    historyBtn.textContent = "View History";
    historyBtn.addEventListener("click", function () {
      showView("history");
    });
    actions.appendChild(historyBtn);

    if (savedRoast) {
      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", function () {
        state.roastToDelete = savedRoast;
        deleteDialog.showModal();
      });
      actions.appendChild(deleteBtn);
    }

    var backBtn = document.createElement("button");
    backBtn.className = "btn btn-ghost";
    backBtn.type = "button";
    backBtn.textContent = "Back to Dashboard";
    backBtn.addEventListener("click", function () {
      showView("home");
    });
    actions.appendChild(backBtn);

    container.appendChild(actions);
  }

  // =========================================
  // RENDER SAVED ROAST RESULT (FROM HISTORY)
  // =========================================

  function renderResult(roast) {
    var info = sourceInfo[roast.sourceType] || sourceInfo.linkedin;
    var container = document.querySelector("#result-content");
    container.textContent = "";

    container.appendChild(textElement("span", info.icon + " " + info.label, "source-badge"));
    container.appendChild(textElement("h1", roast.profileName || roast.fileName || info.label));

    // Profile Image
    if (roast.profileImage) {
      var image = document.createElement("img");
      image.className = "result-image";
      image.src = roast.profileImage;
      image.alt = (roast.profileName || info.label) + " profile image";
      image.referrerPolicy = "no-referrer";
      container.appendChild(image);
    }

    // Profile URL
    if (roast.profileUrl) {
      var link = document.createElement("a");
      link.href = roast.profileUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = roast.profileUrl;
      container.appendChild(link);
    }

    container.appendChild(textElement("p", "Roast Score", "card-label"));
    container.appendChild(textElement("strong", formatScore(roast.roastScore), "score result-score"));
    container.appendChild(textElement("p", roast.roastText, "roast-text"));
    container.appendChild(textElement("p", formatDate(roast.createdAt), "muted"));

    var actions = document.createElement("div");
    actions.className = "card-actions";
    actions.appendChild(actionButton("🔥 Roast Again", "btn btn-primary", function () {
      roastAgain(roast);
    }));
    actions.appendChild(actionButton("Delete", "btn btn-danger", function () {
      state.roastToDelete = roast;
      deleteDialog.showModal();
    }));
    actions.appendChild(actionButton("Back to History", "btn btn-ghost", function () {
      showView("history");
    }));
    container.appendChild(actions);
  }

  async function roastAgain(roast) {
    if (roast.sourceType !== "resume") {
      selectSource(roast.sourceType);
      profileUrl.value = roast.profileUrl;
      showView("home");
      roastStatus.textContent = "Your original URL is ready. Create a new roast when you are ready.";
      return;
    }

    try {
      roastStatus.textContent = "Checking your saved resume...";
      await ResumeService.ensureAvailable(roast.fileUrl);
      selectSource("resume");
      state.reusedResume = roast;
      document.querySelector("#selected-file").textContent = "Reusing saved file: " + roast.fileName;
      showView("home");
      roastStatus.textContent = "Your saved resume is ready. Create a new roast when you are ready.";
    } catch (error) {
      showView("home");
      selectSource("resume");
      roastStatus.textContent = "Your saved resume is no longer available. Please upload it again.";
    }
  }

  // =========================================
  // FIRESTORE HISTORY & RECENT ROASTS
  // =========================================

  async function loadRecentRoasts() {
    if (!state.user) return;
    try {
      var cache = await HistoryService.load(state.user.uid, "all", true);
      state.recentItems = cache.items.slice(0, 3);
      renderRecentRoasts();
    } catch (error) {
      console.error("Could not load recent roasts:", error);
      var recentContainer = document.querySelector("#recent-roasts");
      if (recentContainer) {
        recentContainer.textContent = "Your recent roasts will appear here.";
      }
    }
  }

  async function loadHistory(reset) {
    if (!state.user) return;
    var status = document.querySelector("#history-status");
    if (status) status.textContent = "Loading your roasts...";
    var loadMoreBtn = document.querySelector("#load-more-btn");
    if (loadMoreBtn) loadMoreBtn.disabled = true;

    try {
      await HistoryService.load(state.user.uid, state.filter, reset);
      if (status) status.textContent = "";
      renderHistory();
    } catch (error) {
      console.error("Could not load roast history:", error);
      if (status) {
        status.textContent = typeof RoastValidators !== "undefined" ? RoastValidators.friendlyFirebaseError(error) : "Could not load history.";
      }
      var historyList = document.querySelector("#history-list");
      if (historyList) historyList.textContent = "";
    } finally {
      if (loadMoreBtn) loadMoreBtn.disabled = false;
    }
  }

  function renderRecentRoasts() {
    var container = document.querySelector("#recent-roasts");
    if (!container) return;
    container.textContent = "";

    if (!state.recentItems.length) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No roasts yet. Your first one will show up here.";
      container.appendChild(empty);
      return;
    }

    state.recentItems.forEach(function (roast) {
      var item = document.createElement("button");
      item.className = "recent-roast";
      item.type = "button";
      var source = sourceInfo[roast.sourceType] || sourceInfo.github;
      item.appendChild(textElement("span", source.icon + " " + (roast.profileName || roast.fileName || source.label)));
      item.appendChild(textElement("span", formatScore(roast.roastScore)));
      item.addEventListener("click", function () {
        renderResult(roast);
        showView("result");
      });
      container.appendChild(item);
    });
  }

  function renderHistory() {
    var container = document.querySelector("#history-list");
    var loadMore = document.querySelector("#load-more-btn");
    if (!container) return;
    if (!state.user || HistoryService.cache.uid !== state.user.uid) return;

    var searchVal = historySearch ? historySearch.value : "";
    var roasts = HistoryService.search(searchVal);
    container.textContent = "";

    if (loadMore) {
      loadMore.hidden = HistoryService.cache.done || !HistoryService.cache.items.length;
    }

    if (!roasts.length) {
      var empty = document.createElement("div");
      empty.className = "empty-history card";
      empty.appendChild(textElement("h2", "🔥 No roasts yet."));
      empty.appendChild(textElement("p", "Roast your first profile and it will appear here."));
      var startButton = textElement("button", "🔥 Start Roasting");
      startButton.className = "btn btn-primary";
      startButton.type = "button";
      startButton.addEventListener("click", function () {
        showView("home");
      });
      empty.appendChild(startButton);
      container.appendChild(empty);
      return;
    }

    roasts.forEach(function (roast) {
      container.appendChild(createRoastCard(roast));
    });
  }

  function createRoastCard(roast) {
    var info = sourceInfo[roast.sourceType] || sourceInfo.linkedin;
    var card = document.createElement("article");
    card.className = "roast-history-card";
    card.appendChild(textElement("span", info.icon + " " + info.label, "source-badge"));
    card.appendChild(textElement("h2", roast.profileName || roast.fileName || info.label));

    if (roast.profileImage) {
      var img = document.createElement("img");
      img.className = "avatar avatar-sm";
      img.src = roast.profileImage;
      img.alt = (roast.profileName || info.label) + " photo";
      img.referrerPolicy = "no-referrer";
      card.appendChild(img);
    }

    card.appendChild(textElement("p", "Roast Score", "card-label"));
    card.appendChild(textElement("strong", formatScore(roast.roastScore), "score"));
    card.appendChild(textElement("p", formatDate(roast.createdAt), "muted"));

    var actions = document.createElement("div");
    actions.className = "card-actions";
    actions.appendChild(actionButton("View Roast", "btn btn-ghost", function () {
      renderResult(roast);
      showView("result");
    }));
    actions.appendChild(actionButton("Roast Again", "btn btn-ghost", function () {
      roastAgain(roast);
    }));
    actions.appendChild(actionButton("Delete", "btn btn-danger", function () {
      state.roastToDelete = roast;
      deleteDialog.showModal();
    }));
    card.appendChild(actions);
    return card;
  }

  async function deleteSelectedRoast() {
    var roast = state.roastToDelete;
    state.roastToDelete = null;
    if (!roast || !state.user) return;
    var status = document.querySelector("#history-status");
    if (status) status.textContent = "Deleting roast...";
    try {
      await RoastService.delete(state.user, roast);
      HistoryService.remove(roast.id);
      state.recentItems = state.recentItems.filter(function (item) {
        return item.id !== roast.id;
      });
      renderRecentRoasts();
      renderHistory();
      if (document.querySelector("#view-result").classList.contains("active")) {
        showView("history");
      }
      if (status) status.textContent = "Roast deleted.";
    } catch (error) {
      console.error("Could not delete roast:", error);
      if (status) {
        status.textContent = typeof RoastValidators !== "undefined" ? RoastValidators.friendlyFirebaseError(error) : "Could not delete roast.";
      }
    }
  }

  // =========================================
  // VIEW MANAGEMENT
  // =========================================

  function showView(viewName) {
    document.querySelectorAll(".view").forEach(function (view) {
      view.classList.remove("active");
    });

    var nextView = document.querySelector("#view-" + viewName);
    if (nextView) {
      nextView.classList.add("active");
    }

    document.querySelectorAll(".nav-btn").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-view") === viewName);
    });

    if (viewName === "history") {
      if (HistoryService.cache.uid !== (state.user && state.user.uid)) {
        loadHistory(true);
      } else {
        renderHistory();
      }
    }
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  }

  // =========================================
  // USER INFORMATION
  // =========================================

  function fillUserInfo(user) {
    var name = user.displayName || "Roaster";
    var firstName = name.split(" ")[0];
    var photo = getGooglePhotoURL(user);

    var welcomeEl = document.querySelector("#welcome-title");
    if (welcomeEl) welcomeEl.textContent = "Welcome, " + firstName + " 👋";

    var profileNameEl = document.querySelector("#profile-name");
    if (profileNameEl) profileNameEl.textContent = name;

    var profileEmailEl = document.querySelector("#profile-email");
    if (profileEmailEl) profileEmailEl.textContent = user.email || "No email on this account";

    ["#user-avatar", "#profile-avatar"].forEach(function (selector) {
      var avatar = document.querySelector(selector);
      if (avatar) {
        if (photo) avatar.src = photo;
        avatar.alt = name + "'s profile photo";
      }
    });
  }

  function getGooglePhotoURL(user) {
    if (user.photoURL) return user.photoURL;
    var googleAccount = (user.providerData || []).find(function (profile) {
      return profile.providerId === "google.com";
    });
    return googleAccount && googleAccount.photoURL ? googleAccount.photoURL : "";
  }

  // =========================================
  // HELPER FUNCTIONS
  // =========================================

  function addSection(container, heading, content) {
    var section = document.createElement("section");
    section.className = "roast-result-section";

    var title = document.createElement("h2");
    title.textContent = heading;
    section.appendChild(title);

    var text = document.createElement("p");
    text.className = "roast-text";
    text.textContent = content;
    section.appendChild(text);

    container.appendChild(section);
  }

  function addListSection(container, heading, items) {
    var section = document.createElement("section");
    section.className = "roast-result-section";

    var title = document.createElement("h2");
    title.textContent = heading;
    section.appendChild(title);

    var list = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    section.appendChild(list);

    container.appendChild(section);
  }

  function actionButton(label, className, action) {
    var button = textElement("button", label, className);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  function textElement(tagName, value, className) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value;
    return element;
  }

  function formatScore(score) {
    return Number(score || 0).toFixed(1) + "/10 🔥";
  }

  function formatDate(date) {
    var value = date instanceof Date ? date : new Date(date);
    return isNaN(value.getTime()) ? "" : value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function setRoastProcessing(isProcessing, message) {
    if (roastButton) roastButton.disabled = isProcessing;
    document.querySelectorAll(".source-card").forEach(function (card) {
      card.disabled = isProcessing;
    });
    if (message && roastStatus) {
      roastStatus.textContent = message;
    }
  }

  function getFriendlyError(error) {
    if (!error) return "Something went wrong.";
    var message = error.message || String(error);
    if (message.includes("Failed to fetch")) {
      return "🔥 Could not connect to the Roast Engine. Make sure your backend is running on port 3000.";
    }
    if (message.includes("ECONNREFUSED")) {
      return "🔥 Roast Engine is not running. Start your backend with: node server.js";
    }
    return message;
  }

  function UserFacingError(message) {
    this.message = message;
  }
  UserFacingError.prototype = Object.create(Error.prototype);
});