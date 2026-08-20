// Dashboard controller. It coordinates the existing Firebase, validation,
// roast, and history services without creating another Firebase app.

document.addEventListener("DOMContentLoaded", function () {
  var state = {
    user: null,
    sourceType: "linkedin",
    selectedFile: null,
    reusedResume: null,
    filter: "all",
    recentItems: [],
    roastToDelete: null,
  };

  var sourceInfo = {
    linkedin: { label: "LinkedIn", icon: "💼", placeholder: "https://linkedin.com/in/username" },
    github: { label: "GitHub", icon: "💻", placeholder: "https://github.com/username" },
    instagram: { label: "Instagram", icon: "📸", placeholder: "https://instagram.com/username" },
    resume: { label: "Resume", icon: "📄", placeholder: "" },
  };

  var sidebar = document.querySelector("#sidebar");
  var overlay = document.querySelector("#overlay");
  var roastButton = document.querySelector("#roast-btn");
  var roastStatus = document.querySelector("#roast-status");
  var profileUrl = document.querySelector("#profile-url");
  var resumeFile = document.querySelector("#resume-file");
  var deleteDialog = document.querySelector("#delete-dialog");

  document.querySelectorAll(".nav-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      showView(button.getAttribute("data-view"));
      closeSidebar();
    });
  });

  document.querySelector("#menu-toggle").addEventListener("click", function () {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });
  overlay.addEventListener("click", closeSidebar);

  document.querySelectorAll(".source-card").forEach(function (button) {
    button.addEventListener("click", function () {
      selectSource(button.getAttribute("data-source"));
    });
  });

  resumeFile.addEventListener("change", function () {
    chooseFile(resumeFile.files[0] || null);
  });

  var dropZone = document.querySelector("#drop-zone");
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

  roastButton.addEventListener("click", function () {
    submitRoast();
  });
  document.querySelector("#view-history-btn").addEventListener("click", function () {
    showView("history");
  });
  document.querySelector("#history-refresh-btn").addEventListener("click", function () {
    loadHistory(true);
  });
  document.querySelector("#load-more-btn").addEventListener("click", function () {
    loadHistory(false);
  });
  document.querySelector("#history-search").addEventListener("input", renderHistory);
  document.querySelectorAll(".filter-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      state.filter = button.getAttribute("data-filter");
      document.querySelectorAll(".filter-btn").forEach(function (filterButton) {
        filterButton.classList.toggle("active", filterButton === button);
      });
      loadHistory(true);
    });
  });

  deleteDialog.addEventListener("close", function () {
    if (deleteDialog.returnValue === "delete") {
      deleteSelectedRoast();
    }
  });

  document.querySelector("#logout-btn").addEventListener("click", async function () {
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

  firebase.auth().onAuthStateChanged(async function (user) {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    state.user = user;
    fillUserInfo(user);
    selectSource("linkedin");
    await loadRecentRoasts();
  });

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
    document.querySelector("#url-source-form").hidden = isResume;
    document.querySelector("#resume-source-form").hidden = !isResume;
    roastButton.textContent = isResume ? "🔥 Roast Resume" : "🔥 Roast Profile";

    if (!isResume) {
      var info = sourceInfo[sourceType];
      document.querySelector("#profile-url-label").textContent = info.label + " Profile URL";
      profileUrl.placeholder = info.placeholder;
      profileUrl.focus();
    }
  }

  function chooseFile(file) {
    state.reusedResume = null;
    state.selectedFile = file;
    var selectedFile = document.querySelector("#selected-file");
    if (!file) {
      selectedFile.textContent = "";
      return;
    }
    var validation = RoastValidators.validateResumeFile(file);
    selectedFile.textContent = validation.ok ? "Selected: " + file.name : validation.message;
    selectedFile.classList.toggle("error-text", !validation.ok);
  }

  async function submitRoast() {
    if (!state.user) {
      roastStatus.textContent = "Please sign in again to roast a profile.";
      return;
    }

    var prepared;
    var uploadedResume = null;
    setRoastProcessing(true, "Analyzing profile...");

    try {
      if (state.sourceType === "resume") {
        if (state.reusedResume) {
          prepared = resumePreparedFromRoast(state.reusedResume);
        } else {
          var fileValidation = RoastValidators.validateResumeFile(state.selectedFile);
          if (!fileValidation.ok) {
            throw new UserFacingError(fileValidation.message);
          }
          roastStatus.textContent = "Uploading resume...";
          uploadedResume = await ResumeService.upload(state.user, state.selectedFile);
          prepared = uploadedResume;
        }
      } else {
        var validation = validateSourceUrl(state.sourceType, profileUrl.value);
        if (!validation.ok) {
          throw new UserFacingError(validation.message);
        }
        prepared = await prepareUrlSource(state.sourceType, validation.url, validation.profileName);
      }

      roastStatus.textContent = "Preparing your roast...";
      var result = await RoastService.generate(prepared);
      roastStatus.textContent = "Saving your roast...";
      var savedRoast = await RoastService.save(state.user, prepared, result);
      HistoryService.prepend(savedRoast);
      state.recentItems.unshift(savedRoast);
      state.recentItems = state.recentItems.slice(0, 3);
      renderRecentRoasts();
      renderHistory();
      renderResult(savedRoast);
      showView("result");
      roastStatus.textContent = "";
      state.selectedFile = null;
      resumeFile.value = "";
      document.querySelector("#selected-file").textContent = "";
    } catch (error) {
      console.error("Roast creation failed:", error);
      if (uploadedResume && uploadedResume.fileUrl) {
        try {
          await ResumeService.deleteFile(uploadedResume.fileUrl);
        } catch (cleanupError) {
          console.warn("Could not remove unfinished upload:", cleanupError);
        }
      }
      roastStatus.textContent = error instanceof UserFacingError ? error.message : RoastValidators.friendlyFirebaseError(error);
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

  function setRoastProcessing(isProcessing, message) {
    roastButton.disabled = isProcessing;
    document.querySelectorAll(".source-card").forEach(function (card) {
      card.disabled = isProcessing;
    });
    if (message) roastStatus.textContent = message;
  }

  async function loadRecentRoasts() {
    if (!state.user) return;
    try {
      var cache = await HistoryService.load(state.user.uid, "all", true);
      state.recentItems = cache.items.slice(0, 3);
      renderRecentRoasts();
    } catch (error) {
      console.error("Could not load recent roasts:", error);
      document.querySelector("#recent-roasts").textContent = "Your recent roasts will appear here.";
    }
  }

  async function loadHistory(reset) {
    if (!state.user) return;
    var status = document.querySelector("#history-status");
    status.textContent = "Loading your roasts...";
    document.querySelector("#load-more-btn").disabled = true;
    try {
      await HistoryService.load(state.user.uid, state.filter, reset);
      status.textContent = "";
      renderHistory();
    } catch (error) {
      console.error("Could not load roast history:", error);
      status.textContent = RoastValidators.friendlyFirebaseError(error);
      document.querySelector("#history-list").textContent = "";
    } finally {
      document.querySelector("#load-more-btn").disabled = false;
    }
  }

  function renderRecentRoasts() {
    var container = document.querySelector("#recent-roasts");
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
      item.appendChild(textElement("span", sourceInfo[roast.sourceType].icon + " " + roast.profileName));
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
    if (!state.user || HistoryService.cache.uid !== state.user.uid) return;
    var roasts = HistoryService.search(document.querySelector("#history-search").value);
    container.textContent = "";
    loadMore.hidden = HistoryService.cache.done || !HistoryService.cache.items.length;

    if (!roasts.length) {
      var empty = document.createElement("div");
      empty.className = "empty-history card";
      empty.appendChild(textElement("h2", "🔥 No roasts yet."));
      empty.appendChild(textElement("p", "Roast your first profile and it will appear here."));
      var startButton = textElement("button", "🔥 Start Roasting");
      startButton.className = "btn btn-primary";
      startButton.type = "button";
      startButton.addEventListener("click", function () { showView("home"); });
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
    card.appendChild(textElement("p", "Roast Score", "card-label"));
    card.appendChild(textElement("strong", formatScore(roast.roastScore), "score"));
    card.appendChild(textElement("p", formatDate(roast.createdAt), "muted"));
    var actions = document.createElement("div");
    actions.className = "card-actions";
    actions.appendChild(actionButton("View Roast", "btn btn-ghost", function () { renderResult(roast); showView("result"); }));
    actions.appendChild(actionButton("Roast Again", "btn btn-ghost", function () { roastAgain(roast); }));
    actions.appendChild(actionButton("Delete", "btn btn-danger", function () { state.roastToDelete = roast; deleteDialog.showModal(); }));
    card.appendChild(actions);
    return card;
  }

  function renderResult(roast) {
    var info = sourceInfo[roast.sourceType] || sourceInfo.linkedin;
    var container = document.querySelector("#result-content");
    container.textContent = "";
    container.appendChild(textElement("span", info.icon + " " + info.label, "source-badge"));
    container.appendChild(textElement("h1", roast.profileName || roast.fileName || info.label));
    if (roast.profileImage) {
      var image = document.createElement("img");
      image.className = "result-image";
      image.src = roast.profileImage;
      image.alt = (roast.profileName || info.label) + " profile image";
      image.referrerPolicy = "no-referrer";
      container.appendChild(image);
    }
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
    actions.appendChild(actionButton("Roast Again", "btn btn-primary", function () { roastAgain(roast); }));
    actions.appendChild(actionButton("Delete", "btn btn-danger", function () { state.roastToDelete = roast; deleteDialog.showModal(); }));
    actions.appendChild(actionButton("Back to History", "btn btn-ghost", function () { showView("history"); }));
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

  async function deleteSelectedRoast() {
    var roast = state.roastToDelete;
    state.roastToDelete = null;
    if (!roast || !state.user) return;
    var status = document.querySelector("#history-status");
    status.textContent = "Deleting roast...";
    try {
      await RoastService.delete(state.user, roast);
      HistoryService.remove(roast.id);
      state.recentItems = state.recentItems.filter(function (item) { return item.id !== roast.id; });
      renderRecentRoasts();
      renderHistory();
      if (document.querySelector("#view-result").classList.contains("active")) showView("history");
      status.textContent = "Roast deleted.";
    } catch (error) {
      console.error("Could not delete roast:", error);
      status.textContent = RoastValidators.friendlyFirebaseError(error);
    }
  }

  function showView(viewName) {
    document.querySelectorAll(".view").forEach(function (view) { view.classList.remove("active"); });
    var nextView = document.querySelector("#view-" + viewName);
    if (nextView) nextView.classList.add("active");
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

  function fillUserInfo(user) {
    var name = user.displayName || "Roaster";
    var firstName = name.split(" ")[0];
    var photo = getGooglePhotoURL(user);
    document.querySelector("#welcome-title").textContent = "Welcome, " + firstName + " 👋";
    document.querySelector("#profile-name").textContent = name;
    document.querySelector("#profile-email").textContent = user.email || "No email on this account";
    ["#user-avatar", "#profile-avatar"].forEach(function (selector) {
      var avatar = document.querySelector(selector);
      if (photo) avatar.src = photo;
      avatar.alt = name + "'s profile photo";
    });
  }

  function getGooglePhotoURL(user) {
    if (user.photoURL) return user.photoURL;
    var googleAccount = (user.providerData || []).find(function (profile) { return profile.providerId === "google.com"; });
    return googleAccount && googleAccount.photoURL ? googleAccount.photoURL : "";
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

  function formatScore(score) { return Number(score || 0).toFixed(1) + "/10 🔥"; }
  function formatDate(date) {
    var value = date instanceof Date ? date : new Date(date);
    return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function UserFacingError(message) { this.message = message; }
  UserFacingError.prototype = Object.create(Error.prototype);
});
