// Loads the signed-in user's roast history from Firestore.
// Newest first. 20 at a time. Filter happens on the server.
// Search happens on the records already loaded.

const HistoryService = {
  PAGE_SIZE: 20,
  cache: {
    uid: "",
    filter: "all",
    items: [],
    lastDoc: null,
    done: false,
    loading: false,
  },

  reset: function () {
    this.cache = {
      uid: "",
      filter: "all",
      items: [],
      lastDoc: null,
      done: false,
      loading: false,
    };
  },

  mapDoc: function (doc) {
    const data = doc.data();
    const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date();
    return {
      id: doc.id,
      uid: data.uid,
      sourceType: data.sourceType,
      profileName: data.profileName || "",
      profileUrl: data.profileUrl || "",
      fileName: data.fileName || "",
      fileUrl: data.fileUrl || "",
      profileImage: data.profileImage || "",
      roastText: data.roastText || "",
      createdAt: createdAt,
    };
  },

  load: async function (uid, filter, reset) {
    const nextFilter = filter || "all";
    if (reset || this.cache.uid !== uid || this.cache.filter !== nextFilter) {
      this.cache = {
        uid: uid,
        filter: nextFilter,
        items: [],
        lastDoc: null,
        done: false,
        loading: false,
      };
    }

    if (this.cache.loading || this.cache.done) {
      return this.cache;
    }

    this.cache.loading = true;

    try {
      let query = firebase
        .firestore()
        .collection("roasts")
        .where("uid", "==", uid);

      if (nextFilter !== "all") {
        query = query.where("sourceType", "==", nextFilter);
      }

      query = query.orderBy("createdAt", "desc").limit(this.PAGE_SIZE);

      if (this.cache.lastDoc) {
        query = query.startAfter(this.cache.lastDoc);
      }

      const snapshot = await query.get();
      snapshot.docs.forEach((doc) => {
        this.cache.items.push(this.mapDoc(doc));
      });

      this.cache.lastDoc = snapshot.docs[snapshot.docs.length - 1] || this.cache.lastDoc;
      this.cache.done = snapshot.docs.length < this.PAGE_SIZE;
    } finally {
      this.cache.loading = false;
    }

    return this.cache;
  },

  search: function (queryText) {
    const needle = (queryText || "").trim().toLowerCase();
    if (!needle) {
      return this.cache.items.slice();
    }
    return this.cache.items.filter((item) => {
      const haystack = [item.profileName, item.profileUrl, item.fileName].join(" ").toLowerCase();
      return haystack.indexOf(needle) !== -1;
    });
  },

  prepend: function (roast) {
    if (!roast || roast.uid !== this.cache.uid) {
      return;
    }
    if (this.cache.filter !== "all" && this.cache.filter !== roast.sourceType) {
      return;
    }
    this.cache.items.unshift(roast);
  },

  remove: function (id) {
    this.cache.items = this.cache.items.filter((item) => item.id !== id);
  },

  find: function (id) {
    return this.cache.items.find((item) => item.id === id) || null;
  },
};
