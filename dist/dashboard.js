// ============================================================
// ROASTIT DASHBOARD CONTROLLER
// GitHub + Instagram + Resume
// English + Hinglish
// Firebase Auth + Firestore History
// Qwen Roast Engine
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

  // ==========================================================
  // STATE
  // ==========================================================

  var state = {
    user: null,
    sourceType: "github",
    language: "english",
    selectedFile: null,
    reusedResume: null,
    filter: "all",
    recentItems: [],
    roastToDelete: null
  };


  // ==========================================================
  // SOURCE INFORMATION
  // ==========================================================

  var sourceInfo = {

    github: {
      label: "GitHub",
      icon: "💻",
      placeholder: "https://github.com/username"
    },

    instagram: {
      label: "Instagram",
      icon: "📸",
      placeholder: "https://instagram.com/username"
    },

    resume: {
      label: "Resume",
      icon: "📄",
      placeholder: ""
    }

  };


  // ==========================================================
  // ELEMENTS
  // ==========================================================

  var sidebar =
    document.querySelector("#sidebar");

  var overlay =
    document.querySelector("#overlay");

  var roastButton =
    document.querySelector("#roast-btn");

  var roastStatus =
    document.querySelector("#roast-status");

  var profileUrl =
    document.querySelector("#profile-url");

  var resumeFile =
    document.querySelector("#resume-file");

  var deleteDialog =
    document.querySelector("#delete-dialog");

  var viewHistoryButton =
    document.querySelector("#view-history-btn");

  var historyRefreshButton =
    document.querySelector("#history-refresh-btn");

  var loadMoreButton =
    document.querySelector("#load-more-btn");

  var historySearch =
    document.querySelector("#history-search");


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  document
    .querySelectorAll(".nav-btn")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function () {

          showView(
            button.getAttribute("data-view")
          );

          closeSidebar();

        }
      );

    });


  var menuToggle =
    document.querySelector("#menu-toggle");

  if (menuToggle) {

    menuToggle.addEventListener(
      "click",
      function () {

        sidebar.classList.toggle("open");

        overlay.classList.toggle("open");

      }
    );

  }


  if (overlay) {

    overlay.addEventListener(
      "click",
      closeSidebar
    );

  }


  // ==========================================================
  // LANGUAGE SELECTION
  // ==========================================================

  document
    .querySelectorAll(".language-btn")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function () {

          var language =
            button.getAttribute("data-language");

          if (
            language !== "english" &&
            language !== "hinglish"
          ) {
            language = "english";
          }

          state.language =
            language;


          document
            .querySelectorAll(".language-btn")
            .forEach(function (languageButton) {

              var selected =
                languageButton.getAttribute(
                  "data-language"
                ) === language;

              languageButton.classList.toggle(
                "active",
                selected
              );

              languageButton.setAttribute(
                "aria-pressed",
                String(selected)
              );

            });


          console.log(
            "🌐 Roast language:",
            state.language
          );

        }
      );

    });


  // ==========================================================
  // SOURCE SELECTION
  // ==========================================================

  document
    .querySelectorAll(".source-card")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function () {

          selectSource(
            button.getAttribute("data-source")
          );

        }
      );

    });


  // ==========================================================
  // RESUME FILE
  // ==========================================================

  if (resumeFile) {

    resumeFile.addEventListener(
      "change",
      function () {

        chooseFile(
          resumeFile.files[0] || null
        );

      }
    );

  }


  var dropZone =
    document.querySelector("#drop-zone");

  if (dropZone) {

    ["dragenter", "dragover"]
      .forEach(function (eventName) {

        dropZone.addEventListener(
          eventName,
          function (event) {

            event.preventDefault();

            dropZone.classList.add(
              "dragging"
            );

          }
        );

      });


    ["dragleave", "drop"]
      .forEach(function (eventName) {

        dropZone.addEventListener(
          eventName,
          function (event) {

            event.preventDefault();

            dropZone.classList.remove(
              "dragging"
            );

          }
        );

      });


    dropZone.addEventListener(
      "drop",
      function (event) {

        chooseFile(
          event.dataTransfer.files[0] || null
        );

      }
    );

  }


  // ==========================================================
  // BUTTONS
  // ==========================================================

  if (roastButton) {

    roastButton.addEventListener(
      "click",
      function () {

        submitRoast();

      }
    );

  }


  if (viewHistoryButton) {

    viewHistoryButton.addEventListener(
      "click",
      function () {

        showView("history");

      }
    );

  }


  if (historyRefreshButton) {

    historyRefreshButton.addEventListener(
      "click",
      function () {

        loadHistory(true);

      }
    );

  }


  if (loadMoreButton) {

    loadMoreButton.addEventListener(
      "click",
      function () {

        loadHistory(false);

      }
    );

  }


  if (historySearch) {

    historySearch.addEventListener(
      "input",
      renderHistory
    );

  }


  document
    .querySelectorAll(".filter-btn")
    .forEach(function (button) {

      button.addEventListener(
        "click",
        function () {

          state.filter =
            button.getAttribute(
              "data-filter"
            );


          document
            .querySelectorAll(".filter-btn")
            .forEach(function (filterButton) {

              filterButton.classList.toggle(
                "active",
                filterButton === button
              );

            });


          loadHistory(true);

        }
      );

    });


  // ==========================================================
  // DELETE DIALOG
  // ==========================================================

  if (deleteDialog) {

    deleteDialog.addEventListener(
      "close",
      function () {

        if (
          deleteDialog.returnValue ===
          "delete"
        ) {

          deleteSelectedRoast();

        }

      }
    );

  }


  // ==========================================================
  // LOGOUT
  // ==========================================================

  var logoutBtn =
    document.querySelector("#logout-btn");

  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      async function () {

        var button = this;

        button.disabled = true;

        try {

          await firebase
            .auth()
            .signOut();

          window.location.href =
            "index.html";

        } catch (error) {

          console.error(
            "Logout failed:",
            error
          );

          button.disabled = false;

          alert(
            "Could not log out. Please try again."
          );

        }

      }
    );

  }


  // ==========================================================
  // FIREBASE AUTH
  // ==========================================================

  firebase
    .auth()
    .onAuthStateChanged(
      async function (user) {

        if (!user) {

          window.location.href =
            "index.html";

          return;

        }


        state.user =
          user;


        fillUserInfo(user);


        selectSource("github");


        await loadRecentRoasts();

      }
    );


  // ==========================================================
  // SELECT SOURCE
  // ==========================================================

  function selectSource(sourceType) {

    state.sourceType =
      sourceType;

    state.reusedResume =
      null;

    if (roastStatus) {
      roastStatus.textContent = "";
    }


    document
      .querySelectorAll(".source-card")
      .forEach(function (card) {

        var selected =
          card.getAttribute(
            "data-source"
          ) === sourceType;

        card.classList.toggle(
          "selected",
          selected
        );

        card.setAttribute(
          "aria-pressed",
          String(selected)
        );

      });


    var isResume =
      sourceType === "resume";


    var urlForm =
      document.querySelector(
        "#url-source-form"
      );


    var resumeForm =
      document.querySelector(
        "#resume-source-form"
      );


    if (urlForm) {
      urlForm.hidden =
        isResume;
    }


    if (resumeForm) {
      resumeForm.hidden =
        !isResume;
    }


    if (roastButton) {

      roastButton.textContent =
        isResume
          ? "🔥 Roast Resume"
          : "🔥 Roast Profile";

    }


    if (!isResume) {

      var info =
        sourceInfo[sourceType] ||
        sourceInfo.github;


      var urlLabel =
        document.querySelector(
          "#profile-url-label"
        );


      if (urlLabel) {

        urlLabel.textContent =
          info.label +
          " Profile URL";

      }


      if (profileUrl) {

        profileUrl.placeholder =
          info.placeholder;

      }

    }

  }


  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    var k = 1024;
    var sizes = ["Bytes", "KB", "MB"];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function chooseFile(file) {
    state.reusedResume = null;
    state.selectedFile = file;

    var selectedFileStatus = document.querySelector("#selected-file");
    var container = document.querySelector("#selected-file-container");
    var nameEl = document.querySelector("#selected-file-name");
    var sizeEl = document.querySelector("#selected-file-size");

    if (!file) {
      if (selectedFileStatus) selectedFileStatus.textContent = "";
      if (container) container.hidden = true;
      if (resumeFile) resumeFile.value = "";
      return;
    }

    if (typeof RoastValidators !== "undefined") {
      var validation = RoastValidators.validateResumeFile(file);

      if (!validation.ok) {
        if (selectedFileStatus) {
          selectedFileStatus.textContent = validation.message;
          selectedFileStatus.classList.add("error-text");
        }
        if (container) container.hidden = true;
        return;
      }
    }

    if (selectedFileStatus) {
      selectedFileStatus.textContent = "";
      selectedFileStatus.classList.remove("error-text");
    }

    if (container && nameEl && sizeEl) {
      nameEl.textContent = file.name;
      sizeEl.textContent = formatFileSize(file.size);
      container.hidden = false;
    }
  }

  var removeFileBtn = document.querySelector("#file-remove-btn");
  if (removeFileBtn) {
    removeFileBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      chooseFile(null);
    });
  }


  // ==========================================================
  // MAIN ROAST FUNCTION
  // ==========================================================

  async function submitRoast() {

    if (!state.user) {

      roastStatus.textContent =
        "Please sign in again to roast a profile.";

      return;

    }


    console.log(
      "================================"
    );

    console.log(
      "🔥 STARTING ROAST"
    );

    console.log(
      "Source:",
      state.sourceType
    );

    console.log(
      "Language:",
      state.language
    );

    console.log(
      "================================"
    );


    // ========================================================
    // GITHUB
    // ========================================================

    if (
      state.sourceType ===
      "github"
    ) {

      var githubUrl =
        profileUrl.value.trim();


      if (!githubUrl) {

        roastStatus.textContent =
          "Please enter your GitHub profile URL.";

        return;

      }


      if (
        typeof RoastValidators !==
        "undefined"
      ) {

        var githubValidation =
          RoastValidators.validateGithub(
            githubUrl
          );


        if (!githubValidation.ok) {

          roastStatus.textContent =
            githubValidation.message;

          return;

        }


        githubUrl =
          githubValidation.url;

      }


      try {

        setRoastProcessing(
          true,
          "Getting GitHub profile..."
        );


        var githubPrepared =
          await GithubService.prepare(
            githubUrl,
            ""
          );


        // IMPORTANT
        githubPrepared.language =
          state.language;


        console.log(
          "Prepared GitHub data:",
          githubPrepared
        );


        roastStatus.textContent =
          state.language === "hinglish"
            ? "🇮🇳 Sending GitHub profile to Qwen..."
            : "🔥 Sending GitHub profile to Qwen...";


        var githubResponse =
          await GithubService.sendToRoastEngine(
            githubPrepared
          );


        console.log(
          "Qwen GitHub response:",
          githubResponse
        );


        if (!githubResponse) {

          throw new Error(
            "No response received from Roast Engine."
          );

        }


        if (
          githubResponse.success === false
        ) {

          throw new Error(
            githubResponse.error ||
            "Roast Engine failed."
          );

        }


        var githubResult =
          githubResponse.result;


        if (!githubResult) {

          throw new Error(
            "Roast Engine returned no roast result."
          );

        }


        githubResult =
          normalizeResult(
            githubResult
          );


        roastStatus.textContent =
          "Saving your roast to history...";


        var savedGithubRoast =
          null;


        try {

          savedGithubRoast =
            await RoastService.save(
              state.user,
              githubPrepared,
              githubResult
            );


          HistoryService.prepend(
            savedGithubRoast
          );


          state.recentItems.unshift(
            savedGithubRoast
          );


          state.recentItems =
            state.recentItems.slice(
              0,
              3
            );


          renderRecentRoasts();

          renderHistory();

        } catch (saveError) {

          console.warn(
            "Could not save roast:",
            saveError
          );

        }


        roastStatus.textContent =
          "🔥 Roast generated!";


        renderRoastResult(
          githubPrepared,
          githubResult,
          savedGithubRoast
        );


        showView("result");


        setRoastProcessing(
          false,
          ""
        );


      } catch (error) {

        console.error(
          "GitHub roast failed:",
          error
        );


        roastStatus.textContent =
          getFriendlyError(error);


        setRoastProcessing(
          false
        );

      }


      return;

    }


    // ========================================================
    // INSTAGRAM
    // ========================================================

    if (
      state.sourceType ===
      "instagram"
    ) {

      var instagramUrl =
        profileUrl.value.trim();


      if (!instagramUrl) {

        roastStatus.textContent =
          "Please enter your Instagram profile URL.";

        return;

      }


      if (
        typeof RoastValidators !==
        "undefined"
      ) {

        var instagramValidation =
          RoastValidators.validateInstagram(
            instagramUrl
          );


        if (!instagramValidation.ok) {

          roastStatus.textContent =
            instagramValidation.message;

          return;

        }


        instagramUrl =
          instagramValidation.url;

      }


      try {

        setRoastProcessing(
          true,
          "Getting Instagram profile..."
        );


        var instagramPrepared =
          await InstagramService.prepare(
            instagramUrl,
            ""
          );


        // IMPORTANT
        instagramPrepared.language =
          state.language;


        console.log(
          "Prepared Instagram data:",
          instagramPrepared
        );


        roastStatus.textContent =
          state.language === "hinglish"
            ? "🇮🇳 Sending Instagram profile to Qwen..."
            : "🔥 Sending Instagram profile to Qwen...";


        var instagramResponse =
          await InstagramService.sendToRoastEngine(
            instagramPrepared
          );


        console.log(
          "Qwen Instagram response:",
          instagramResponse
        );


        if (!instagramResponse) {

          throw new Error(
            "No response received from Roast Engine."
          );

        }


        if (
          instagramResponse.success === false
        ) {

          throw new Error(
            instagramResponse.error ||
            "Roast Engine failed."
          );

        }


        var instagramResult =
          instagramResponse.result;


        if (!instagramResult) {

          throw new Error(
            "Roast Engine returned no roast result."
          );

        }


        instagramResult =
          normalizeResult(
            instagramResult
          );


        roastStatus.textContent =
          "Saving your roast to history...";


        var savedInstagramRoast =
          null;


        try {

          savedInstagramRoast =
            await RoastService.save(
              state.user,
              instagramPrepared,
              instagramResult
            );


          HistoryService.prepend(
            savedInstagramRoast
          );


          state.recentItems.unshift(
            savedInstagramRoast
          );


          state.recentItems =
            state.recentItems.slice(
              0,
              3
            );


          renderRecentRoasts();

          renderHistory();

        } catch (saveError) {

          console.warn(
            "Could not save roast:",
            saveError
          );

        }


        roastStatus.textContent =
          "🔥 Roast generated!";


        renderRoastResult(
          instagramPrepared,
          instagramResult,
          savedInstagramRoast
        );


        showView("result");


        setRoastProcessing(
          false,
          ""
        );


      } catch (error) {

        console.error(
          "Instagram roast failed:",
          error
        );


        roastStatus.textContent =
          getFriendlyError(error);


        setRoastProcessing(
          false
        );

      }


      return;

    }


    // ========================================================
    // RESUME
    // ========================================================

    if (
      state.sourceType ===
      "resume"
    ) {

      var uploadedResume =
        null;


      try {

        setRoastProcessing(
          true,
          "Analyzing your resume..."
        );


        if (!state.selectedFile) {
          throw new UserFacingError("Please select a PDF or DOCX resume to roast.");
        }

        if (typeof RoastValidators !== "undefined") {
          var fileValidation = RoastValidators.validateResumeFile(state.selectedFile);
          if (!fileValidation.ok) {
            throw new UserFacingError(fileValidation.message);
          }
        }

        var preparedResume = {
          sourceType: "resume",
          profileName: state.selectedFile.name,
          profileUrl: "",
          fileName: state.selectedFile.name,
          fileUrl: "",
          profileImage: "",
          notes: "",
          language: state.language
        };

        var resumeResponseData = await ResumeService.roastResumeFile(
          state.selectedFile,
          state.language
        );

        console.log("🔥 Resume Qwen response:", resumeResponseData);

        if (!resumeResponseData || resumeResponseData.success === false) {
          throw new Error(resumeResponseData?.error || "Resume Roaster failed.");
        }

        var resumeResult = resumeResponseData.result;
        if (!resumeResult) {
          throw new Error("Roast Engine returned no roast result.");
        }

        // Keep structured data intact while normalizing fallback text
        resumeResult = normalizeResult(resumeResult);

        // ======================================================
        // SAVE RESUME ROAST
        // ======================================================

        roastStatus.textContent = "Saving your roast...";

        var savedResumeRoast = null;

        try {
          savedResumeRoast = await RoastService.save(
            state.user,
            preparedResume,
            resumeResult
          );

          HistoryService.prepend(savedResumeRoast);
          state.recentItems.unshift(savedResumeRoast);
          state.recentItems = state.recentItems.slice(0, 3);
          renderRecentRoasts();
          renderHistory();
        } catch (saveError) {
          console.warn("Could not save resume roast:", saveError);
        }

        // ======================================================
        // DISPLAY
        // ======================================================

        roastStatus.textContent = "🔥 Roast generated!";

        renderRoastResult(
          preparedResume,
          resumeResult,
          savedResumeRoast
        );

        showView("result");

        state.selectedFile = null;
        if (resumeFile) {
          resumeFile.value = "";
        }
        chooseFile(null);


      } catch (error) {

        console.error(
          "Resume roast failed:",
          error
        );


        if (
          uploadedResume &&
          uploadedResume.fileUrl
        ) {

          try {

            await ResumeService.deleteFile(
              uploadedResume.fileUrl
            );

          } catch (cleanupError) {

            console.warn(
              "Could not remove unfinished upload:",
              cleanupError
            );

          }

        }


        roastStatus.textContent =
          error instanceof UserFacingError
            ? error.message
            : getFriendlyError(error);

      } finally {

        setRoastProcessing(
          false
        );

      }


      return;

    }

  }


  // ==========================================================
  // NORMALIZE RESULT
  // ==========================================================

  function normalizeResult(result) {
    if (!result) {
      return {
        headline: "🔥 Roast Generated",
        roast: "",
        technicalAnalysis: "",
        projectAnalysis: "",
        activityAnalysis: "",
        strengths: [],
        weaknesses: [],
        recommendations: [],
        finalVerdict: ""
      };
    }

    // Preserve score if present (for resume), only delete if explicitly requested or empty
    if (result.sourceType !== "resume" && result.score === undefined) {
      delete result.score;
      delete result.roastScore;
    }

    // ------------------------------------------
    // ARRAYS
    // ------------------------------------------

    if (!Array.isArray(result.strengths)) {
      result.strengths = [];
    }

    if (!Array.isArray(result.weaknesses)) {
      result.weaknesses = [];
    }

    if (!Array.isArray(result.recommendations)) {
      result.recommendations = [];
    }

    if (!Array.isArray(result.improvements)) {
      result.improvements = [];
    }

    if (!Array.isArray(result.quickWins)) {
      result.quickWins = [];
    }

    // ------------------------------------------
    // TEXT
    // ------------------------------------------

    result.headline =
      result.headline ||
      (result.score !== undefined ? "Resume Roast Score: " + result.score + "/10" : "🔥 Roast Generated");

    result.roast =
      result.roast ||
      result.overallRoast ||
      result.roastText ||
      "";

    result.technicalAnalysis =
      result.technicalAnalysis ||
      "";

    result.activityAnalysis =
      result.activityAnalysis ||
      "";

    result.finalVerdict =
      result.finalVerdict ||
      "";

    return result;
  }


  // ==========================================================
  // RENDER NEW ROAST
  // ==========================================================

  function renderRoastResult(
    prepared,
    result,
    savedRoast
  ) {

    var container =
      document.querySelector(
        "#result-content"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      "";


    result =
      normalizeResult(
        result
      );


    var info =
      sourceInfo[
        prepared.sourceType
      ] ||
      sourceInfo.github;


    // ------------------------------------------
    // SOURCE BADGE
    // ------------------------------------------

    var badge =
      document.createElement(
        "span"
      );

    badge.className =
      "source-badge";

    badge.textContent =
      info.icon +
      " " +
      info.label;

    container.appendChild(
      badge
    );


    // ------------------------------------------
    // LANGUAGE BADGE
    // ------------------------------------------

    var languageBadge =
      document.createElement(
        "span"
      );

    languageBadge.className =
      "source-badge";

    languageBadge.textContent =
      prepared.language === "hinglish"
        ? "🇮🇳 Hinglish"
        : "🇬🇧 English";

    container.appendChild(
      languageBadge
    );


    // ------------------------------------------
    // TITLE
    // ------------------------------------------

    var title =
      document.createElement(
        "h1"
      );

    title.textContent =
      prepared.profileName ||
      info.label +
      " Profile";

    container.appendChild(
      title
    );


    // ------------------------------------------
    // PROFILE IMAGE
    // ------------------------------------------

    if (
      prepared.profileImage
    ) {

      var image =
        document.createElement(
          "img"
        );

      image.className =
        "result-image";

      image.src =
        prepared.profileImage;

      image.alt =
        (
          prepared.profileName ||
          info.label
        ) +
        "'s profile photo";

      image.referrerPolicy =
        "no-referrer";

      container.appendChild(
        image
      );

    }


    // ------------------------------------------
    // PROFILE LINK
    // ------------------------------------------

    if (
      prepared.profileUrl
    ) {

      var link =
        document.createElement(
          "a"
        );

      link.href =
        prepared.profileUrl;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      link.textContent =
        prepared.profileUrl;

      container.appendChild(
        link
      );

    }




    // ------------------------------------------
    // RESUME: rich structured rendering
    // ------------------------------------------

    if (
      prepared.sourceType === "resume"
    ) {

      addScoreSection(
        container,
        result.score,
        result.scoreExplanation
      );

      if (result.roast || result.overallRoast) {
        addSection(
          container,
          "💀 THE MAIN ROAST",
          result.roast || result.overallRoast
        );
      }

      if (Array.isArray(result.strengths) && result.strengths.length) {
        addListSection(container, "✅ WHAT'S ACTUALLY GOOD", result.strengths);
      }

      if (Array.isArray(result.weaknesses) && result.weaknesses.length) {
        addListSection(container, "🚩 THE BIG PROBLEMS", result.weaknesses);
      }

      if (Array.isArray(result.roastSections) && result.roastSections.length) {
        addRoastSectionsList(container, result.roastSections);
      }

      if (Array.isArray(result.projectAnalysis) && result.projectAnalysis.length) {
        addProjectAnalysisSection(container, result.projectAnalysis);
      }

      if (result.atsAnalysis) {
        addAtsSection(container, result.atsAnalysis);
      }

      if (Array.isArray(result.improvements) && result.improvements.length) {
        addListSection(container, "🛠️ IMPROVEMENTS", result.improvements);
      }

      if (Array.isArray(result.quickWins) && result.quickWins.length) {
        addListSection(container, "⚡ QUICK WINS (5-Minute Fixes)", result.quickWins);
      }

      if (result.recruiterPerspective) {
        addSection(container, "👔 RECRUITER PERSPECTIVE", result.recruiterPerspective);
      }

      if (result.finalVerdict) {
        addSection(container, "🏁 FINAL VERDICT", result.finalVerdict);
      }

    } else {

    // ------------------------------------------
    // HEADLINE
    // ------------------------------------------

    if (
      result.headline
    ) {

      addSection(
        container,
        "🔥 OVERALL ROAST",
        result.headline
      );

    }


    // ------------------------------------------
    // MAIN ROAST
    // ------------------------------------------

    if (
      result.roast
    ) {

      addSection(
        container,
        "💀 THE ROAST",
        result.roast
      );

    }


    // ------------------------------------------
    // TECHNICAL
    // ------------------------------------------

    if (
      result.technicalAnalysis
    ) {

      addSection(
        container,
        prepared.sourceType ===
        "instagram"
          ? "📸 PROFILE & AESTHETIC ANALYSIS"
          : "💻 TECHNICAL ANALYSIS",
        result.technicalAnalysis
      );

    }


    // ------------------------------------------
    // PROJECT
    // ------------------------------------------

    if (
      result.projectAnalysis
    ) {

      addSection(
        container,
        prepared.sourceType ===
        "instagram"
          ? "📱 CONTENT & GRID ANALYSIS"
          : "📁 PROJECT ANALYSIS",
        result.projectAnalysis
      );

    }


    // ------------------------------------------
    // ACTIVITY
    // ------------------------------------------

    if (
      result.activityAnalysis
    ) {

      addSection(
        container,
        prepared.sourceType ===
        "instagram"
          ? "📊 CLOUT & ENGAGEMENT ANALYSIS"
          : "📊 ACTIVITY ANALYSIS",
        result.activityAnalysis
      );

    }


    // ------------------------------------------
    // STRENGTHS
    // ------------------------------------------

    if (
      Array.isArray(
        result.strengths
      ) &&
      result.strengths.length
    ) {

      addListSection(
        container,
        "🏆 STRENGTHS",
        result.strengths
      );

    }


    // ------------------------------------------
    // WEAKNESSES
    // ------------------------------------------

    if (
      Array.isArray(
        result.weaknesses
      ) &&
      result.weaknesses.length
    ) {

      addListSection(
        container,
        "💀 WEAKNESSES",
        result.weaknesses
      );

    }


    // ------------------------------------------
    // RECOMMENDATIONS
    // ------------------------------------------

    if (
      Array.isArray(
        result.recommendations
      ) &&
      result.recommendations.length
    ) {

      addListSection(
        container,
        "🎯 WHAT YOU SHOULD FIX",
        result.recommendations
      );

    }


    // ------------------------------------------
    // FINAL VERDICT
    // ------------------------------------------

    if (
      result.finalVerdict
    ) {

      addSection(
        container,
        "🏁 FINAL VERDICT",
        result.finalVerdict
      );

    } // end non-resume block
    }

    }


    // ------------------------------------------
    // ACTIONS
    // ------------------------------------------

    var actions =
      document.createElement(
        "div"
      );

    actions.className =
      "card-actions";


    var roastAgainBtn =
      document.createElement(
        "button"
      );

    roastAgainBtn.className =
      "btn btn-primary";

    roastAgainBtn.type =
      "button";

    roastAgainBtn.textContent =
      "🔥 Roast Again";

    roastAgainBtn.addEventListener(
      "click",
      function () {

        showView("home");

      }
    );


    actions.appendChild(
      roastAgainBtn
    );


    var historyBtn =
      document.createElement(
        "button"
      );

    historyBtn.className =
      "btn btn-ghost";

    historyBtn.type =
      "button";

    historyBtn.textContent =
      "View History";

    historyBtn.addEventListener(
      "click",
      function () {

        showView("history");

      }
    );


    actions.appendChild(
      historyBtn
    );


    if (
      savedRoast &&
      deleteDialog
    ) {

      var deleteBtn =
        document.createElement(
          "button"
        );

      deleteBtn.className =
        "btn btn-danger";

      deleteBtn.type =
        "button";

      deleteBtn.textContent =
        "Delete";

      deleteBtn.addEventListener(
        "click",
        function () {

          state.roastToDelete =
            savedRoast;

          deleteDialog.showModal();

        }
      );


      actions.appendChild(
        deleteBtn
      );

    }


    var backBtn =
      document.createElement(
        "button"
      );

    backBtn.className =
      "btn btn-ghost";

    backBtn.type =
      "button";

    backBtn.textContent =
      "Back to Dashboard";

    backBtn.addEventListener(
      "click",
      function () {

        showView("home");

      }
    );


    actions.appendChild(
      backBtn
    );


    container.appendChild(
      actions
    );

  }


  // ==========================================================
  // RENDER SAVED RESULT
  // ==========================================================

  function renderResult(roast) {

    var info =
      sourceInfo[
        roast.sourceType
      ] ||
      sourceInfo.github;


    var container =
      document.querySelector(
        "#result-content"
      );


    if (!container) {
      return;
    }


    container.textContent =
      "";


    roast =
      normalizeResult(
        roast
      );


    container.appendChild(
      textElement(
        "span",
        info.icon +
        " " +
        info.label,
        "source-badge"
      )
    );


    if (
      roast.language
    ) {

      container.appendChild(
        textElement(
          "span",
          roast.language ===
          "hinglish"
            ? "🇮🇳 Hinglish"
            : "🇬🇧 English",
          "source-badge"
        )
      );

    }


    container.appendChild(
      textElement(
        "h1",
        roast.profileName ||
        roast.fileName ||
        info.label
      )
    );


    // Profile image

    if (
      roast.profileImage
    ) {

      var image =
        document.createElement(
          "img"
        );

      image.className =
        "result-image";

      image.src =
        roast.profileImage;

      image.alt =
        (
          roast.profileName ||
          info.label
        ) +
        " profile image";

      image.referrerPolicy =
        "no-referrer";

      container.appendChild(
        image
      );

    }


    // Profile URL

    if (
      roast.profileUrl
    ) {

      var link =
        document.createElement(
          "a"
        );

      link.href =
        roast.profileUrl;

      link.target =
        "_blank";

      link.rel =
        "noreferrer";

      link.textContent =
        roast.profileUrl;

      container.appendChild(
        link
      );

    }


    // Headline

    if (
      roast.headline
    ) {

      addSection(
        container,
        "🔥 OVERALL ROAST",
        roast.headline
      );

    }


    // Roast

    if (
      roast.roast ||
      roast.roastText
    ) {

      addSection(
        container,
        "💀 THE ROAST",
        roast.roast ||
        roast.roastText
      );

    }


    if (
      roast.technicalAnalysis
    ) {

      addSection(
        container,
        "💻 TECHNICAL ANALYSIS",
        roast.technicalAnalysis
      );

    }


    if (
      roast.projectAnalysis
    ) {

      addSection(
        container,
        "📁 PROJECT ANALYSIS",
        roast.projectAnalysis
      );

    }


    if (
      roast.activityAnalysis
    ) {

      addSection(
        container,
        "📊 ACTIVITY ANALYSIS",
        roast.activityAnalysis
      );

    }


    if (
      Array.isArray(
        roast.strengths
      ) &&
      roast.strengths.length
    ) {

      addListSection(
        container,
        "🏆 STRENGTHS",
        roast.strengths
      );

    }


    if (
      Array.isArray(
        roast.weaknesses
      ) &&
      roast.weaknesses.length
    ) {

      addListSection(
        container,
        "💀 WEAKNESSES",
        roast.weaknesses
      );

    }


    if (
      Array.isArray(
        roast.recommendations
      ) &&
      roast.recommendations.length
    ) {

      addListSection(
        container,
        "🎯 WHAT YOU SHOULD FIX",
        roast.recommendations
      );

    }


    if (
      roast.finalVerdict
    ) {

      addSection(
        container,
        "🏁 FINAL VERDICT",
        roast.finalVerdict
      );

    }


    container.appendChild(
      textElement(
        "p",
        formatDate(
          roast.createdAt
        ),
        "muted"
      )
    );


    var actions =
      document.createElement(
        "div"
      );

    actions.className =
      "card-actions";


    actions.appendChild(
      actionButton(
        "🔥 Roast Again",
        "btn btn-primary",
        function () {

          roastAgain(
            roast
          );

        }
      )
    );


    actions.appendChild(
      actionButton(
        "Delete",
        "btn btn-danger",
        function () {

          state.roastToDelete =
            roast;

          if (deleteDialog) {
            deleteDialog.showModal();
          }

        }
      )
    );


    actions.appendChild(
      actionButton(
        "Back to History",
        "btn btn-ghost",
        function () {

          showView("history");

        }
      )
    );


    container.appendChild(
      actions
    );

  }


  // ==========================================================
  // ROAST AGAIN
  // ==========================================================

  async function roastAgain(roast) {

    if (
      roast.sourceType !==
      "resume"
    ) {

      selectSource(
        roast.sourceType
      );


      if (profileUrl) {

        profileUrl.value =
          roast.profileUrl ||
          "";

      }


      if (
        roast.language ===
        "hinglish"
      ) {

        state.language =
          "hinglish";

      } else {

        state.language =
          "english";

      }


      updateLanguageButtons();


      showView("home");


      roastStatus.textContent =
        "Your original URL is ready. Create a new roast when you are ready.";


      return;

    }


    try {

      roastStatus.textContent =
        "Checking your saved resume...";


      await ResumeService.ensureAvailable(
        roast.fileUrl
      );


      selectSource(
        "resume"
      );


      state.reusedResume =
        roast;


      state.language =
        roast.language ===
        "hinglish"
          ? "hinglish"
          : "english";


      updateLanguageButtons();


      var selectedFile =
        document.querySelector(
          "#selected-file"
        );


      if (selectedFile) {

        selectedFile.textContent =
          "Reusing saved file: " +
          roast.fileName;

      }


      showView("home");


      roastStatus.textContent =
        "Your saved resume is ready. Create a new roast when you are ready.";


    } catch (error) {

      showView("home");

      selectSource(
        "resume"
      );


      roastStatus.textContent =
        "Your saved resume is no longer available. Please upload it again.";

    }

  }


  // ==========================================================
  // LANGUAGE BUTTON UI
  // ==========================================================

  function updateLanguageButtons() {

    document
      .querySelectorAll(".language-btn")
      .forEach(function (button) {

        var selected =
          button.getAttribute(
            "data-language"
          ) === state.language;


        button.classList.toggle(
          "active",
          selected
        );


        button.setAttribute(
          "aria-pressed",
          String(selected)
        );

      });

  }


  // ==========================================================
  // FIRESTORE - RECENT ROASTS
  // ==========================================================

  async function loadRecentRoasts() {

    if (!state.user) {
      return;
    }


    try {

      var cache =
        await HistoryService.load(
          state.user.uid,
          "all",
          true
        );


      state.recentItems =
        cache.items.slice(
          0,
          3
        );


      renderRecentRoasts();


    } catch (error) {

      console.error(
        "Could not load recent roasts:",
        error
      );


      var recentContainer =
        document.querySelector(
          "#recent-roasts"
        );


      if (recentContainer) {

        recentContainer.textContent =
          "Your recent roasts will appear here.";

      }

    }

  }


  // ==========================================================
  // LOAD HISTORY
  // ==========================================================

  async function loadHistory(reset) {

    if (!state.user) {
      return;
    }


    var status =
      document.querySelector(
        "#history-status"
      );


    if (status) {

      status.textContent =
        "Loading your roasts...";

    }


    if (loadMoreButton) {
      loadMoreButton.disabled =
        true;
    }


    try {

      await HistoryService.load(
        state.user.uid,
        state.filter,
        reset
      );


      if (status) {
        status.textContent =
          "";
      }


      renderHistory();


    } catch (error) {

      console.error(
        "Could not load roast history:",
        error
      );


      if (status) {

        status.textContent =
          typeof RoastValidators !==
          "undefined"
            ? RoastValidators.friendlyFirebaseError(
                error
              )
            : "Could not load history.";

      }


      var historyList =
        document.querySelector(
          "#history-list"
        );


      if (historyList) {
        historyList.textContent =
          "";
      }


    } finally {

      if (loadMoreButton) {
        loadMoreButton.disabled =
          false;
      }

    }

  }


  // ==========================================================
  // RECENT ROASTS
  // ==========================================================

  function renderRecentRoasts() {

    var container =
      document.querySelector(
        "#recent-roasts"
      );


    if (!container) {
      return;
    }


    container.textContent =
      "";


    if (
      !state.recentItems.length
    ) {

      var empty =
        document.createElement(
          "p"
        );

      empty.className =
        "muted";

      empty.textContent =
        "No roasts yet. Your first one will show up here.";

      container.appendChild(
        empty
      );

      return;

    }


    state.recentItems.forEach(
      function (roast) {

        var item =
          document.createElement(
            "button"
          );


        item.className =
          "recent-roast";


        item.type =
          "button";


        var source =
          sourceInfo[
            roast.sourceType
          ] ||
          sourceInfo.github;


        var left =
          document.createElement(
            "span"
          );


        left.textContent =
          source.icon +
          " " +
          (
            roast.profileName ||
            roast.fileName ||
            source.label
          );


        item.appendChild(
          left
        );




        item.addEventListener(
          "click",
          function () {

            renderResult(
              roast
            );

            showView(
              "result"
            );

          }
        );


        container.appendChild(
          item
        );

      }
    );

  }


  // ==========================================================
  // RENDER HISTORY
  // ==========================================================

  function renderHistory() {

    var container =
      document.querySelector(
        "#history-list"
      );


    var loadMore =
      document.querySelector(
        "#load-more-btn"
      );


    if (!container) {
      return;
    }


    if (
      !state.user ||
      HistoryService.cache.uid !==
      state.user.uid
    ) {

      return;

    }


    var searchVal =
      historySearch
        ? historySearch.value
        : "";


    var roasts =
      HistoryService.search(
        searchVal
      );


    container.textContent =
      "";


    if (loadMore) {

      loadMore.hidden =
        HistoryService.cache.done ||
        !HistoryService.cache.items.length;

    }


    if (!roasts.length) {

      var empty =
        document.createElement(
          "div"
        );


      empty.className =
        "empty-history card";


      empty.appendChild(
        textElement(
          "h2",
          "🔥 No roasts yet."
        )
      );


      empty.appendChild(
        textElement(
          "p",
          "Roast your first profile and it will appear here."
        )
      );


      var startButton =
        textElement(
          "button",
          "🔥 Start Roasting"
        );


      startButton.className =
        "btn btn-primary";


      startButton.type =
        "button";


      startButton.addEventListener(
        "click",
        function () {

          showView(
            "home"
          );

        }
      );


      empty.appendChild(
        startButton
      );


      container.appendChild(
        empty
      );


      return;

    }


    roasts.forEach(
      function (roast) {

        container.appendChild(
          createRoastCard(
            roast
          )
        );

      }
    );

  }


  // ==========================================================
  // HISTORY CARD
  // ==========================================================

  function createRoastCard(roast) {

    var info =
      sourceInfo[
        roast.sourceType
      ] ||
      sourceInfo.github;


    var card =
      document.createElement(
        "article"
      );


    card.className =
      "roast-history-card";


    card.appendChild(
      textElement(
        "span",
        info.icon +
        " " +
        info.label,
        "source-badge"
      )
    );


    if (
      roast.language
    ) {

      card.appendChild(
        textElement(
          "span",
          roast.language ===
          "hinglish"
            ? "🇮🇳 Hinglish"
            : "🇬🇧 English",
          "source-badge"
        )
      );

    }


    card.appendChild(
      textElement(
        "h2",
        roast.profileName ||
        roast.fileName ||
        info.label
      )
    );


    if (
      roast.profileImage
    ) {

      var img =
        document.createElement(
          "img"
        );


      img.className =
        "avatar avatar-sm";


      img.src =
        roast.profileImage;


      img.alt =
        (
          roast.profileName ||
          info.label
        ) +
        " photo";


      img.referrerPolicy =
        "no-referrer";


      card.appendChild(
        img
      );

    }


    if (
      roast.headline
    ) {

      card.appendChild(
        textElement(
          "p",
          roast.headline,
          "card-label"
        )
      );

    }


    card.appendChild(
      textElement(
        "p",
        formatDate(
          roast.createdAt
        ),
        "muted"
      )
    );


    var actions =
      document.createElement(
        "div"
      );


    actions.className =
      "card-actions";


    actions.appendChild(
      actionButton(
        "View Roast",
        "btn btn-ghost",
        function () {

          renderResult(
            roast
          );

          showView(
            "result"
          );

        }
      )
    );


    actions.appendChild(
      actionButton(
        "Roast Again",
        "btn btn-ghost",
        function () {

          roastAgain(
            roast
          );

        }
      )
    );


    actions.appendChild(
      actionButton(
        "Delete",
        "btn btn-danger",
        function () {

          state.roastToDelete =
            roast;


          if (deleteDialog) {
            deleteDialog.showModal();
          }

        }
      )
    );


    card.appendChild(
      actions
    );


    return card;

  }


  // ==========================================================
  // DELETE ROAST
  // ==========================================================

  async function deleteSelectedRoast() {

    var roast =
      state.roastToDelete;


    state.roastToDelete =
      null;


    if (
      !roast ||
      !state.user
    ) {

      return;

    }


    var status =
      document.querySelector(
        "#history-status"
      );


    if (status) {

      status.textContent =
        "Deleting roast...";

    }


    try {

      await RoastService.delete(
        state.user,
        roast
      );


      HistoryService.remove(
        roast.id
      );


      state.recentItems =
        state.recentItems.filter(
          function (item) {

            return item.id !==
              roast.id;

          }
        );


      renderRecentRoasts();

      renderHistory();


      var resultView =
        document.querySelector(
          "#view-result"
        );


      if (
        resultView &&
        resultView.classList.contains(
          "active"
        )
      ) {

        showView(
          "history"
        );

      }


      if (status) {

        status.textContent =
          "Roast deleted.";

      }


    } catch (error) {

      console.error(
        "Could not delete roast:",
        error
      );


      if (status) {

        status.textContent =
          typeof RoastValidators !==
          "undefined"
            ? RoastValidators.friendlyFirebaseError(
                error
              )
            : "Could not delete roast.";

      }

    }

  }


  // ==========================================================
  // VIEW MANAGEMENT
  // ==========================================================

  function showView(viewName) {

    document
      .querySelectorAll(".view")
      .forEach(function (view) {

        view.classList.remove(
          "active"
        );

      });


    var nextView =
      document.querySelector(
        "#view-" +
        viewName
      );


    if (nextView) {

      nextView.classList.add(
        "active"
      );

    }


    document
      .querySelectorAll(".nav-btn")
      .forEach(function (button) {

        button.classList.toggle(
          "active",
          button.getAttribute(
            "data-view"
          ) === viewName
        );

      });


    if (
      viewName ===
      "history"
    ) {

      if (
        HistoryService.cache.uid !==
        (
          state.user &&
          state.user.uid
        )
      ) {

        loadHistory(
          true
        );

      } else {

        renderHistory();

      }

    }

  }


  function closeSidebar() {

    if (sidebar) {

      sidebar.classList.remove(
        "open"
      );

    }


    if (overlay) {

      overlay.classList.remove(
        "open"
      );

    }

  }


  // ==========================================================
  // USER INFORMATION
  // ==========================================================

  function fillUserInfo(user) {

    var name =
      user.displayName ||
      "Roaster";


    var firstName =
      name.split(" ")[0];


    var photo =
      getGooglePhotoURL(
        user
      );


    var welcomeEl =
      document.querySelector(
        "#welcome-title"
      );


    if (welcomeEl) {

      welcomeEl.textContent =
        "Welcome, " +
        firstName +
        " 👋";

    }


    var profileNameEl =
      document.querySelector(
        "#profile-name"
      );


    if (profileNameEl) {

      profileNameEl.textContent =
        name;

    }


    var profileEmailEl =
      document.querySelector(
        "#profile-email"
      );


    if (profileEmailEl) {

      profileEmailEl.textContent =
        user.email ||
        "No email on this account";

    }


    [
      "#user-avatar",
      "#profile-avatar"
    ].forEach(
      function (selector) {

        var avatar =
          document.querySelector(
            selector
          );


        if (avatar) {

          if (photo) {
            avatar.src =
              photo;
          }


          avatar.alt =
            name +
            "'s profile photo";

        }

      }
    );

  }


  function getGooglePhotoURL(user) {

    if (
      user.photoURL
    ) {

      return user.photoURL;

    }


    var googleAccount =
      (
        user.providerData ||
        []
      ).find(
        function (profile) {

          return profile.providerId ===
            "google.com";

        }
      );


    return (
      googleAccount &&
      googleAccount.photoURL
    )
      ? googleAccount.photoURL
      : "";

  }


  // ==========================================================
  // HELPER: SECTION
  // ==========================================================

  function addSection(
    container,
    heading,
    content
  ) {

    var section =
      document.createElement(
        "section"
      );


    section.className =
      "roast-result-section";


    var title =
      document.createElement(
        "h2"
      );


    title.textContent =
      heading;


    section.appendChild(
      title
    );


    var text =
      document.createElement(
        "p"
      );


    text.className =
      "roast-text";


    text.textContent =
      content;


    section.appendChild(
      text
    );


    container.appendChild(
      section
    );

  }


  // ==========================================================
  // HELPER: LIST SECTION
  // ==========================================================

  function addListSection(
    container,
    heading,
    items
  ) {

    var section =
      document.createElement(
        "section"
      );


    section.className =
      "roast-result-section";


    var title =
      document.createElement(
        "h2"
      );


    title.textContent =
      heading;


    section.appendChild(
      title
    );


    var list =
      document.createElement(
        "ul"
      );


    items.forEach(
      function (item) {

        var li =
          document.createElement(
            "li"
          );


        li.textContent =
          item;


        list.appendChild(
          li
        );

      }
    );


    section.appendChild(
      list
    );


    container.appendChild(
      section
    );

  }

  // ==========================================================
  // HELPER: RESUME ROAST SCORE SECTION
  // ==========================================================

  function addScoreSection(container, score, explanation) {
    var scoreNum = parseFloat(score);
    if (isNaN(scoreNum)) scoreNum = 7.0;

    var section = document.createElement("section");
    section.className = "roast-result-section";

    var title = document.createElement("h2");
    title.textContent = "📊 RESUME ROAST SCORE";
    section.appendChild(title);

    var card = document.createElement("div");
    card.className = "resume-score-card";

    var badge = document.createElement("div");
    badge.className = "resume-score-badge";

    var numEl = document.createElement("span");
    numEl.className = "resume-score-number";
    numEl.textContent = scoreNum.toFixed(1);

    var maxEl = document.createElement("span");
    maxEl.className = "resume-score-max";
    maxEl.textContent = "/ 10";

    badge.appendChild(numEl);
    badge.appendChild(maxEl);
    card.appendChild(badge);

    var info = document.createElement("div");
    info.className = "resume-score-info";

    var label = document.createElement("div");
    label.className = "resume-score-label";
    label.textContent = scoreNum >= 8 ? "🔥 Solid Contender" : (scoreNum >= 5 ? "⚠️ Dangerous Mediocrity" : "💀 Complete Career Hazard");
    info.appendChild(label);

    var desc = document.createElement("p");
    desc.className = "resume-score-desc";
    desc.textContent = explanation || "Analyzed across technical depth, quantifiable impact, ATS readability, and section structure.";
    info.appendChild(desc);

    card.appendChild(info);
    section.appendChild(card);
    container.appendChild(section);
  }

  // ==========================================================
  // HELPER: SECTION-BY-SECTION ROAST
  // ==========================================================

  function addRoastSectionsList(container, sections) {
    if (!Array.isArray(sections) || !sections.length) return;

    var wrapper = document.createElement("section");
    wrapper.className = "roast-result-section";

    var heading = document.createElement("h2");
    heading.textContent = "💀 THE ROAST (SECTION-BY-SECTION)";
    wrapper.appendChild(heading);

    sections.forEach(function (sec) {
      var card = document.createElement("div");
      var sev = (sec.severity || "medium").toLowerCase();
      card.className = "roast-section-card severity-" + sev;

      var header = document.createElement("div");
      header.className = "roast-section-header";

      var name = document.createElement("span");
      name.className = "roast-section-name";
      name.textContent = sec.section || "Section";
      header.appendChild(name);

      var pill = document.createElement("span");
      pill.className = "severity-pill severity-" + sev;
      pill.textContent = sev;
      header.appendChild(pill);

      card.appendChild(header);

      if (sec.roast) {
        var roastP = document.createElement("p");
        roastP.className = "roast-section-roast";
        roastP.textContent = '"' + sec.roast + '"';
        card.appendChild(roastP);
      }

      if (sec.issue) {
        var issueDiv = document.createElement("div");
        issueDiv.className = "roast-section-field";
        issueDiv.innerHTML = "<strong>The Problem:</strong> " + sec.issue;
        card.appendChild(issueDiv);
      }

      if (sec.fix) {
        var fixDiv = document.createElement("div");
        fixDiv.className = "roast-section-field";
        fixDiv.innerHTML = "<strong>How to Fix:</strong> " + sec.fix;
        card.appendChild(fixDiv);
      }

      wrapper.appendChild(card);
    });

    container.appendChild(wrapper);
  }

  // ==========================================================
  // HELPER: ATS ANALYSIS SECTION
  // ==========================================================

  function addAtsSection(container, ats) {
    if (!ats) return;

    var wrapper = document.createElement("section");
    wrapper.className = "roast-result-section";

    var title = document.createElement("h2");
    title.textContent = "🤖 ATS COMPATIBILITY CHECK";
    wrapper.appendChild(title);

    var box = document.createElement("div");
    box.className = "ats-box";

    var header = document.createElement("div");
    header.className = "ats-header";

    var label = document.createElement("span");
    label.innerHTML = "<strong>Estimated ATS Score</strong> (Formatting & Keyword Scan)";
    header.appendChild(label);

    var scoreDisplay = document.createElement("span");
    scoreDisplay.className = "ats-score-display";
    var atsScore = parseInt(ats.score, 10) || 70;
    scoreDisplay.textContent = atsScore + "%";
    header.appendChild(scoreDisplay);

    box.appendChild(header);

    var barWrap = document.createElement("div");
    barWrap.className = "ats-bar-wrap";

    var barFill = document.createElement("div");
    barFill.className = "ats-bar-fill";
    barFill.style.width = atsScore + "%";
    barWrap.appendChild(barFill);
    box.appendChild(barWrap);

    if (Array.isArray(ats.issues) && ats.issues.length) {
      var issueTitle = document.createElement("p");
      issueTitle.innerHTML = "<strong>⚠️ ATS Warnings Detected:</strong>";
      box.appendChild(issueTitle);

      var uList = document.createElement("ul");
      ats.issues.forEach(function (issue) {
        var li = document.createElement("li");
        li.textContent = issue;
        uList.appendChild(li);
      });
      box.appendChild(uList);
    }

    if (Array.isArray(ats.recommendations) && ats.recommendations.length) {
      var recTitle = document.createElement("p");
      recTitle.innerHTML = "<strong>💡 ATS Recommendations:</strong>";
      box.appendChild(recTitle);

      var recList = document.createElement("ul");
      ats.recommendations.forEach(function (rec) {
        var li = document.createElement("li");
        li.textContent = rec;
        recList.appendChild(li);
      });
      box.appendChild(recList);
    }

    var disclaimer = document.createElement("small");
    disclaimer.className = "muted";
    disclaimer.style.display = "block";
    disclaimer.style.marginTop = "12px";
    disclaimer.textContent = "* Note: This is an automated compatibility analysis based on structure, headers, and keyword clarity, not a guarantee of ATS pass.";
    box.appendChild(disclaimer);

    wrapper.appendChild(box);
    container.appendChild(wrapper);
  }

  // ==========================================================
  // HELPER: PROJECT ANALYSIS SECTION
  // ==========================================================

  function addProjectAnalysisSection(container, projects) {
    if (!Array.isArray(projects) || !projects.length) return;

    var wrapper = document.createElement("section");
    wrapper.className = "roast-result-section";

    var title = document.createElement("h2");
    title.textContent = "📁 PROJECT AUDIT & REWRITES";
    wrapper.appendChild(title);

    projects.forEach(function (proj) {
      var card = document.createElement("div");
      card.className = "project-card";

      var h3 = document.createElement("h3");
      var nameSpan = document.createElement("span");
      nameSpan.textContent = proj.projectName || "Project";
      h3.appendChild(nameSpan);

      if (proj.verdict) {
        var pill = document.createElement("span");
        pill.className = "project-verdict-pill";
        pill.textContent = proj.verdict;
        h3.appendChild(pill);
      }
      card.appendChild(h3);

      if (proj.critique) {
        var p = document.createElement("p");
        p.className = "roast-text";
        p.textContent = proj.critique;
        card.appendChild(p);
      }

      if (proj.before || proj.recommendedRewrite) {
        var comp = document.createElement("div");
        comp.className = "project-comparison";

        if (proj.before) {
          var col1 = document.createElement("div");
          col1.className = "comparison-col before";
          col1.innerHTML = "<small>❌ What You Wrote (Weak / Vague)</small>" + proj.before;
          comp.appendChild(col1);
        }

        if (proj.recommendedRewrite) {
          var col2 = document.createElement("div");
          col2.className = "comparison-col after";
          col2.innerHTML = "<small>✅ High-Impact Rewrite</small>" + proj.recommendedRewrite;
          comp.appendChild(col2);
        }

        card.appendChild(comp);
      }

      wrapper.appendChild(card);
    });

    container.appendChild(wrapper);
  }


  // ==========================================================
  // ACTION BUTTON
  // ==========================================================

  function actionButton(
    label,
    className,
    action
  ) {

    var button =
      textElement(
        "button",
        label,
        className
      );


    button.type =
      "button";


    button.addEventListener(
      "click",
      action
    );


    return button;

  }


  // ==========================================================
  // TEXT ELEMENT
  // ==========================================================

  function textElement(
    tagName,
    value,
    className
  ) {

    var element =
      document.createElement(
        tagName
      );


    if (className) {

      element.className =
        className;

    }


    element.textContent =
      value;


    return element;

  }




  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  function formatDate(date) {

    var value =
      date instanceof Date
        ? date
        : new Date(date);


    return isNaN(
      value.getTime()
    )
      ? ""
      : value.toLocaleDateString(
          undefined,
          {
            month: "short",
            day: "numeric",
            year: "numeric"
          }
        );

  }


  // ==========================================================
  // PROCESSING STATE
  // ==========================================================

  function setRoastProcessing(
    isProcessing,
    message
  ) {

    if (roastButton) {
      roastButton.disabled = isProcessing;
    }

    document.querySelectorAll(".source-card").forEach(function (card) {
      card.disabled = isProcessing;
    });

    document.querySelectorAll(".language-btn").forEach(function (button) {
      button.disabled = isProcessing;
    });

    if (window._roastLoadingInterval) {
      clearInterval(window._roastLoadingInterval);
      window._roastLoadingInterval = null;
    }

    if (isProcessing && state.sourceType === "resume") {
      var loadingMessages = [
        "Reading your career decisions...",
        "Scanning for recruiter damage...",
        "Checking how many buzzwords survived...",
        "Consulting the hiring gods...",
        "Preparing your professional destruction..."
      ];
      var msgIndex = 0;
      if (roastStatus) {
        roastStatus.textContent = loadingMessages[0];
      }
      window._roastLoadingInterval = setInterval(function () {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        if (roastStatus) {
          roastStatus.textContent = loadingMessages[msgIndex];
        }
      }, 2200);
    } else if (message && roastStatus) {
      roastStatus.textContent = message;
    }

  }


  // ==========================================================
  // FRIENDLY ERROR
  // ==========================================================

  function getFriendlyError(error) {

    if (!error) {

      return "Something went wrong.";

    }


    var message =
      error.message ||
      String(error);


    if (
      message.includes(
        "Failed to fetch"
      )
    ) {

      return (
        "🔥 Could not connect to the Roast Engine. " +
        "Make sure your backend is running on port 3000."
      );

    }


    if (
      message.includes(
        "ECONNREFUSED"
      )
    ) {

      return (
        "🔥 Roast Engine is not running. " +
        "Start your backend with: node server.js"
      );

    }


    return message;

  }


  // ==========================================================
  // USER-FACING ERROR
  // ==========================================================

  function UserFacingError(
    message
  ) {

    this.message =
      message;

    this.name =
      "UserFacingError";

  }


  UserFacingError.prototype =
    Object.create(
      Error.prototype
    );


  UserFacingError.prototype
    .constructor =
    UserFacingError;


  // ==========================================================
  // INITIAL LANGUAGE UI
  // ==========================================================

  updateLanguageButtons();


  console.log(
    "🔥 RoastIt Dashboard loaded"
  );

  console.log(
    "Initial language:",
    state.language
  );

});