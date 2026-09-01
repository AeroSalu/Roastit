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

  function chooseFile(file) {

    state.reusedResume =
      null;

    state.selectedFile =
      file;


    var selectedFile =
      document.querySelector(
        "#selected-file"
      );


    if (!selectedFile) {
      return;
    }


    if (!file) {

      selectedFile.textContent =
        "";

      return;

    }


    if (
      typeof RoastValidators !==
      "undefined"
    ) {

      var validation =
        RoastValidators.validateResumeFile(
          file
        );


      selectedFile.textContent =
        validation.ok
          ? "Selected: " + file.name
          : validation.message;


      selectedFile.classList.toggle(
        "error-text",
        !validation.ok
      );

    } else {

      selectedFile.textContent =
        "Selected: " +
        file.name;

    }

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


        var preparedResume;


        // Reuse previous resume
        if (
          state.reusedResume
        ) {

          preparedResume =
            resumePreparedFromRoast(
              state.reusedResume
            );

        } else {

          if (
            typeof RoastValidators ===
            "undefined"
          ) {

            throw new Error(
              "Resume validation service is unavailable."
            );

          }


          var fileValidation =
            RoastValidators.validateResumeFile(
              state.selectedFile
            );


          if (!fileValidation.ok) {

            throw new UserFacingError(
              fileValidation.message
            );

          }


          roastStatus.textContent =
            "Uploading resume...";


          uploadedResume =
            await ResumeService.upload(
              state.user,
              state.selectedFile
            );


          preparedResume =
            uploadedResume;

        }


        // IMPORTANT
        preparedResume.language =
          state.language;


        preparedResume.sourceType =
          "resume";


        console.log(
          "Prepared resume:",
          preparedResume
        );


        console.log(
          "Resume language:",
          preparedResume.language
        );


        // ======================================================
        // SEND DIRECTLY TO QWEN
        // ======================================================

        roastStatus.textContent =
          state.language === "hinglish"
            ? "🇮🇳 Sending resume to Qwen..."
            : "🔥 Sending resume to Qwen...";


        var resumeResponse =
          await fetch(
            "http://localhost:3000/api/roast",
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  preparedResume
                )

            }
          );


        if (!resumeResponse.ok) {

          var resumeErrorData =
            {};

          try {

            resumeErrorData =
              await resumeResponse.json();

          } catch (error) {
            // Ignore invalid JSON
          }


          throw new Error(
            resumeErrorData.error ||
            "Roast Engine failed."
          );

        }


        var resumeResponseData =
          await resumeResponse.json();


        console.log(
          "🔥 Resume Qwen response:",
          resumeResponseData
        );


        if (
          !resumeResponseData ||
          resumeResponseData.success === false
        ) {

          throw new Error(
            resumeResponseData?.error ||
            "Roast Engine failed."
          );

        }


        var resumeResult =
          resumeResponseData.result;


        if (!resumeResult) {

          throw new Error(
            "Roast Engine returned no roast result."
          );

        }


        resumeResult =
          normalizeResult(
            resumeResult
          );


        // ======================================================
        // SAVE RESUME ROAST
        // ======================================================

        roastStatus.textContent =
          "Saving your roast...";


        var savedResumeRoast =
          null;


        try {

          savedResumeRoast =
            await RoastService.save(
              state.user,
              preparedResume,
              resumeResult
            );


          HistoryService.prepend(
            savedResumeRoast
          );


          state.recentItems.unshift(
            savedResumeRoast
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
            "Could not save resume roast:",
            saveError
          );

        }


        // ======================================================
        // DISPLAY
        // ======================================================

        roastStatus.textContent =
          "🔥 Roast generated!";


        renderRoastResult(
          preparedResume,
          resumeResult,
          savedResumeRoast
        );


        showView("result");


        state.selectedFile =
          null;


        if (resumeFile) {
          resumeFile.value = "";
        }


        var selectedFileElement =
          document.querySelector(
            "#selected-file"
          );


        if (selectedFileElement) {
          selectedFileElement.textContent =
            "";
        }


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

        score: 5,

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


    // ------------------------------------------
    // SCORE
    // ------------------------------------------

    var scoreValue =
      result.score !== undefined &&
      result.score !== null
        ? result.score
        : result.roastScore;


    var score =
      Number(scoreValue);


    if (
      isNaN(score) ||
      score < 0 ||
      score > 10
    ) {

      score = 5;

    }


    result.score =
      Math.max(
        0,
        Math.min(
          10,
          score
        )
      );


    // Keep compatibility with
    // existing Firestore history

    result.roastScore =
      result.score;


    // ------------------------------------------
    // ARRAYS
    // ------------------------------------------

    if (
      !Array.isArray(
        result.strengths
      )
    ) {

      result.strengths = [];

    }


    if (
      !Array.isArray(
        result.weaknesses
      )
    ) {

      result.weaknesses = [];

    }


    if (
      !Array.isArray(
        result.recommendations
      )
    ) {

      result.recommendations = [];

    }


    // ------------------------------------------
    // TEXT
    // ------------------------------------------

    result.headline =
      result.headline ||
      "🔥 Roast Generated";


    result.roast =
      result.roast ||
      result.roastText ||
      "";


    result.technicalAnalysis =
      result.technicalAnalysis ||
      "";


    result.projectAnalysis =
      result.projectAnalysis ||
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
    // ROAST SCORE
    // ------------------------------------------

    var scoreLabel =
      document.createElement(
        "p"
      );

    scoreLabel.className =
      "card-label";

    scoreLabel.textContent =
      "ROAST SCORE";

    container.appendChild(
      scoreLabel
    );


    var score =
      document.createElement(
        "strong"
      );

    score.className =
      "score result-score";

    score.textContent =
      Number(
        result.score
      ).toFixed(1) +
      "/10 🔥";

    container.appendChild(
      score
    );


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


    // Score

    container.appendChild(
      textElement(
        "p",
        "ROAST SCORE",
        "card-label"
      )
    );


    container.appendChild(
      textElement(
        "strong",
        formatScore(
          roast.score !== undefined
            ? roast.score
            : roast.roastScore
        ),
        "score result-score"
      )
    );


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


        var score =
          document.createElement(
            "span"
          );


        score.textContent =
          formatScore(
            roast.score !== undefined
              ? roast.score
              : roast.roastScore
          );


        item.appendChild(
          score
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


    // SCORE

    card.appendChild(
      textElement(
        "p",
        "ROAST SCORE",
        "card-label"
      )
    );


    card.appendChild(
      textElement(
        "strong",
        formatScore(
          roast.score !== undefined
            ? roast.score
            : roast.roastScore
        ),
        "score"
      )
    );


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
  // FORMAT SCORE
  // ==========================================================

  function formatScore(score) {

    var numericScore =
      Number(score);


    if (
      isNaN(numericScore) ||
      numericScore < 0 ||
      numericScore > 10
    ) {

      numericScore =
        5;

    }


    return (
      numericScore.toFixed(1) +
      "/10 🔥"
    );

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

      roastButton.disabled =
        isProcessing;

    }


    document
      .querySelectorAll(
        ".source-card"
      )
      .forEach(
        function (card) {

          card.disabled =
            isProcessing;

        }
      );


    document
      .querySelectorAll(
        ".language-btn"
      )
      .forEach(
        function (button) {

          button.disabled =
            isProcessing;

        }
      );


    if (
      message &&
      roastStatus
    ) {

      roastStatus.textContent =
        message;

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