const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* =========================================================
SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://sozzpklmlhtvwxbuecax.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Xo20VSelYyO9tLTgT0SVbQ_4ZvkwH4B";

let supabaseClient = null;
let currentUser = null;
let currentUserAvatar = "";
let authEventsConfigured = false;

try {
  if (
    window.supabase &&
    typeof window.supabase.createClient === "function"
  ) {
    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );
  }
} catch (error) {
  console.error(
    "Erreur création Supabase :",
    error
  );
}


/* =========================================================
OUTILS
========================================================= */

function toast(text) {

  const el = $("#toast");

  if (!el) return;

  el.textContent = text;

  el.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer =
    setTimeout(() => {

      el.classList.remove("show");

    }, 2500);
}


function supabaseReady() {

  if (!supabaseClient) {

    console.error(
      "Supabase non disponible."
    );

    toast(
      "Supabase ne s'est pas chargé."
    );

    return false;
  }

  return true;
}


function clearAuthErrors() {

  if ($("#loginError")) {
    $("#loginError").textContent = "";
  }

  if ($("#signupError")) {
    $("#signupError").textContent = "";
  }
}


/* =========================================================
AFFICHAGE
========================================================= */

function showAuthScreen() {

  const auth =
    $("#authScreen");

  const app =
    $("#app");

  if (app) {
    app.hidden = true;
  }

  if (auth) {
    auth.hidden = false;
  }
}


function showApp() {

  const auth =
    $("#authScreen");

  const app =
    $("#app");

  if (auth) {
    auth.hidden = true;
  }

  if (app) {
    app.hidden = false;
  }

  if (currentUser) {

  startNotificationsRealtime();

  startMessagesRealtime();

 }

}
/* =========================================================
ETAT UTILISATEUR
========================================================= */

const defaults = {
  name: "",
  username: "",
  bio: "",
  link: "",
  followers: 0,
  following: 0
};


let state = {

  profile: {
    ...defaults
  },

  posts: [],

  filter: "all",

  liked: {},

  dark: true,

  customMedia: {
    avatar: "",
    cover: ""
  }

};


function getStateKey() {

  if (!currentUser) {
    return null;
  }

  return (
    "instaqState:" +
    currentUser.id
  );
}


function loadLocalStateForUser() {

  state = {

    profile: {
      ...defaults
    },

    posts: [],

    filter: "all",

    liked: {},

    dark: true,

    customMedia: {
      avatar: "",
      cover: ""
    }

  };


  const key =
    getStateKey();

  if (!key) return;


  try {

    const saved =
      JSON.parse(
        localStorage.getItem(key) ||
        "null"
      );


    if (saved) {

      state.profile = {
        ...defaults,
        ...(saved.profile || {})
      };


      state.posts =
        Array.isArray(saved.posts)
          ? saved.posts
          : [];


      state.filter =
        saved.filter ||
        "all";


      state.liked =
        saved.liked ||
        {};


      state.dark =
        typeof saved.dark ===
        "boolean"
          ? saved.dark
          : true;


      state.customMedia = {

        avatar:
          saved.customMedia?.avatar ||
          "",

        cover:
          saved.customMedia?.cover ||
          ""

      };

    }

  } catch (error) {

    console.error(
      "Erreur lecture état local :",
      error
    );

  }

}


function save() {

  const key =
    getStateKey();

  if (!key) return;


  try {

    localStorage.setItem(
      key,
      JSON.stringify(state)
    );

  } catch (error) {

    console.error(
      "Erreur sauvegarde locale :",
      error
    );

  }

}

function updateBottomProfileAvatar() {

  const button =
    $("#bottomProfileBtn");

  if (!button) {
    return;
  }

  button.innerHTML = "";

  if (currentUserAvatar) {

    const img =
      document.createElement(
        "img"
      );

    img.src =
      currentUserAvatar;

    img.alt =
      "Mon profil";

    img.className =
      "bottom-profile-avatar";

    button.appendChild(
      img
    );

  } else {

    const fallback =
      document.createElement(
        "span"
      );

    fallback.textContent =
      "👤";

    fallback.className =
      "bottom-profile-fallback";

    button.appendChild(
      fallback
    );

  }

}
/* =========================================================
AUTHENTIFICATION
========================================================= */

async function loginUser(
  email,
  password
) {

  if (!supabaseReady()) {
    return;
  }


  const errorBox =
    $("#loginError");

  const button =
    $(
      "#loginForm button[type='submit']"
    );


  clearAuthErrors();


  if (button) {

    button.disabled = true;

    button.textContent =
      "Connexion...";

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });


    if (error) {
      throw error;
    }


    if (
      !data?.session?.user
    ) {

      throw new Error(
        "Aucune session n'a été créée."
      );

    }


    currentUser =
      data.session.user;


    loadLocalStateForUser();

    applyTheme();

    await loadUserProfile();

    await loadSupabasePosts();

    setOwnerMode(true);

    showApp();

    playGridVideos();

    toast(
      "Connexion réussie"
    );


  } catch (error) {

    console.error(
      "Erreur connexion :",
      error
    );


    if (errorBox) {

      errorBox.textContent =
        error?.message ||
        "Impossible de se connecter.";

    }


    showAuthScreen();


  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "Se connecter";

    }

  }

}


async function signupUser(
  username,
  password
) {

  const cleanUsername =
    username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");

  const internalEmail =
    `${cleanUsername}@strytsh.invalid`;

  if (!supabaseReady()) {
    return;
  }


  const errorBox =
    $("#signupError");

  const button =
    $(
      "#signupForm button[type='submit']"
    );


  clearAuthErrors();


  if (button) {

    button.disabled = true;

    button.textContent =
      "Création...";

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.signUp({
  email: internalEmail,
  password,
  options: {
    data: {
      username: cleanUsername
    }
  }
});

    if (error) {
      throw error;
    }


    if (
      data?.session?.user
    ) {

      currentUser =
        data.session.user;


      loadLocalStateForUser();

      applyTheme();

      await loadUserProfile();

      await loadSupabasePosts();

      setOwnerMode(true);

      showApp();

      playGridVideos();

      toast(
        "Compte créé"
      );


    } else {

      showAuthScreen();

      toast(
        "Compte créé. Connectez-vous maintenant."
      );

    }


  } catch (error) {

    console.error(
      "Erreur inscription :",
      error
    );


    if (errorBox) {

      errorBox.textContent =
        error?.message ||
        "Erreur pendant la création du compte.";

    }


  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "Créer un compte";

    }

  }

}


async function logoutUser() {

  if (!supabaseReady()) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient.auth
        .signOut();


    if (error) {
      throw error;
    }

stopNotificationsRealtime();
stopMessagesRealtime();

currentUser = null;


    state = {

      profile: {
        ...defaults
      },

      posts: [],

      filter: "all",

      liked: {},

      dark: true,

      customMedia: {
        avatar: "",
        cover: ""
      }

    };


    renderProfile();

    renderGrid();


    clearMedia(
      $("#avatarImg"),
      $("#avatarVideo")
    );


    clearMedia(
      $("#coverImg"),
      $("#coverVideo")
    );


    clearAuthErrors();

    showAuthScreen();

    toast(
      "Déconnecté"
    );


  } catch (error) {

    console.error(
      "Erreur déconnexion :",
      error
    );


    toast(
      error?.message ||
      "Impossible de se déconnecter"
    );

  }

}


function setupAuth() {

  const loginForm =
    $("#loginForm");

  const signupForm =
    $("#signupForm");


  if (
    loginForm &&
    !loginForm.dataset.configured
  ) {

    loginForm.dataset.configured =
      "true";


    loginForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const username =
  ($("#loginUsername")?.value || "")
    .trim();

const cleanUsername =
  username
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

const internalEmail =
  `${cleanUsername}@strytsh.invalid`;


        const password =
          $("#loginPassword")
            ?.value;


        if (
  !username ||
  !password
) {

          if ($("#loginError")) {

            $("#loginError")
              .textContent =
              "Veuillez remplir les deux champs.";

          }

          return;
        }


        await loginUser(
  internalEmail,
  password
);

      }
    );

  }


  if (
    signupForm &&
    !signupForm.dataset.configured
  ) {

    signupForm.dataset.configured =
      "true";


    signupForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const username =
  $("#signupUsername")
    ?.value
    .trim();


        const password =
          $("#signupPassword")
            ?.value;


        if (
  !username ||
  !password
) {

          if ($("#signupError")) {

            $("#signupError")
              .textContent =
              "Veuillez remplir les deux champs.";

          }

          return;
        }


        await signupUser(
  username,
  password
);

      }
    );

  }


  $("#logoutBtn")
    ?.addEventListener(
      "click",
      logoutUser
    );


  if (
    supabaseClient &&
    !authEventsConfigured
  ) {

    authEventsConfigured =
      true;


    supabaseClient.auth
      .onAuthStateChange(
        (
          event,
          session
        ) => {

          console.log(
            "Auth event :",
            event
          );


          if (
            event ===
              "SIGNED_OUT" ||
            !session?.user
          ) {

            currentUser =
              null;

            showAuthScreen();

          }

        }
      );

  }

}


/* =========================================================
PROFIL
========================================================= */

async function loadUserProfile() {

  if (
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }


  try {

    const {
      data: profile,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,email,username,name,bio,link,avatar_url,cover_url"
        )
        .eq(
          "id",
          currentUser.id
        )
        .single();


    if (error) {
      throw error;
    }


    state.profile.name =
      profile?.name ||
      profile?.username ||
      "";


    state.profile.username =
      profile?.username ||
      "";


    state.profile.bio =
      profile?.bio ||
      "";


    state.profile.link =
      profile?.link ||
      "";


    state.customMedia.avatar =
      profile?.avatar_url ||
      "";
currentUserAvatar =
  profile?.avatar_url ||
  "";

updateBottomProfileAvatar();

    state.customMedia.cover =
      profile?.cover_url ||
      "";

activeProfileId =
  currentUser.id;

await loadFollowCounts(
  currentUser.id
);

await updateFollowButton(
  currentUser.id
);
    save();

    renderProfile();

    restoreMedia();


  } catch (error) {

    console.error(
      "Erreur chargement profil :",
      error
    );

  }

}


function renderProfile() {

  if ($("#displayName")) {

    $("#displayName")
      .textContent =
      state.profile.name ||
      "";

  }


  if ($("#username")) {

    $("#username")
      .textContent =
      state.profile.username ||
      "";

  }


  if ($("#bioText")) {

    $("#bioText")
      .textContent =
      state.profile.bio ||
      "";

  }


  if ($("#followers")) {

    $("#followers")
      .textContent =
      state.profile.followers ||
      0;

  }


  if ($("#following")) {

    $("#following")
      .textContent =
      state.profile.following ||
      0;

  }

if ($("#totalLikes")) {

  const totalLikes =
    state.posts.reduce(
      (total, post) =>
        total +
        (Number(post.likes) || 0),
      0
    );

  $("#totalLikes")
    .textContent =
    formatLikes(totalLikes);

}
  const bioLink =
    $("#bioLink");


  if (bioLink) {

    const link =
      state.profile.link ||
      "";


    bioLink.textContent =
      link.replace(
        /^https?:\/\//,
        ""
      );


    bioLink.href =
      link ||
      "#";


    bioLink.style.display =
      link
        ? "inline"
        : "none";

  }


  document.title =
    state.profile.username
      ? (
        state.profile.username +
        " — extaze"
      )
      : "extaze";

}
function renderProfileEditAvatar() {

  const box =
    $("#profileEditAvatar");

  if (!box) {
    return;
  }

  box.innerHTML = "";

  const avatarUrl =
    state.customMedia.avatar ||
    currentUserAvatar ||
    "";

  if (avatarUrl) {

    const img =
      document.createElement(
        "img"
      );

    img.src =
      avatarUrl;

    img.alt =
      "Photo de profil";

    box.appendChild(
      img
    );

  } else {

    box.textContent =
      "👤";

  }

}

$("#editProfileBtn")
  ?.addEventListener(
    "click",
    () => {

      if ($("#nameInput")) {

        $("#nameInput").value =
          state.profile.name ||
          "";

      }


      if ($("#usernameInput")) {

        $("#usernameInput").value =
          state.profile.username ||
          "";

      }


      if ($("#bioInput")) {

        $("#bioInput").value =
          state.profile.bio ||
          "";

      }


      if ($("#linkInput")) {

        $("#linkInput").value =
          state.profile.link ||
          "";

      }

renderProfileEditAvatar();
      
      const dialog =
        $("#profileDialog");


      if (
        dialog &&
        typeof dialog.showModal ===
          "function"
      ) {

        dialog.showModal();

      }

    }
  );

$("#profileMediaEditBtn")
  ?.addEventListener(
    "click",
    () => {

      const menu =
        $("#profileMediaMenu");

      if (menu) {
        menu.hidden = false;
      }

    }
  );


$("#profileMediaCancelBtn")
  ?.addEventListener(
    "click",
    () => {

      const menu =
        $("#profileMediaMenu");

      if (menu) {
        menu.hidden = true;
      }

    }
  );

$("#profileAvatarEditBtn")
  ?.addEventListener(
    "click",
    () => {
      
      const menu =
  $("#profileMediaMenu");

if (menu) {
  menu.hidden = true;
}
      $("#avatarInput")
        ?.click();
    }
  );


$("#profileCoverEditBtn")
  ?.addEventListener(
    "click",
    () => {
      
      const menu =
  $("#profileMediaMenu");

if (menu) {
  menu.hidden = true;
}
    

      $("#coverInput")
        ?.click();
    }
  );

$("#profileDialogClose")
  ?.addEventListener(
    "click",
    () => {

      $("#profileDialog")
        ?.close();

    }
  );


$("#profileCancelBtn")
  ?.addEventListener(
    "click",
    () => {

      $("#profileDialog")
        ?.close();

    }
  );


$("#profileForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        !supabaseReady() ||
        !currentUser
      ) {
        return;
      }


      const name =
        $("#nameInput")
          ?.value
          .trim() ||
        "";


      const username =
        $("#usernameInput")
          ?.value
          .trim() ||
        "";


      const bio =
        $("#bioInput")
          ?.value
          .trim() ||
        "";


      const link =
        $("#linkInput")
          ?.value
          .trim() ||
        "";


      try {

        const {
          error
        } =
          await supabaseClient
            .from("profiles")
            .update({
              name,
              username,
              bio,
              link
            })
            .eq(
              "id",
              currentUser.id
            );


        if (error) {
          throw error;
        }


        state.profile = {

          ...state.profile,

          name,

          username,

          bio,

          link

        };


        save();

        renderProfile();


        $("#profileDialog")
          ?.close();


        toast(
          "Profil enregistré"
        );


      } catch (error) {

        console.error(
          "Erreur modification profil :",
          error
        );


        toast(
          error?.message ||
          "Impossible d'enregistrer le profil"
        );

      }

    }
  );


/* =========================================================
MEDIA PROFIL / BANNIERE
========================================================= */

function clearMedia(
  img,
  video
) {

  const placeholder =
    img
      ?.closest(
        ".avatar-wrap"
      )
      ?.querySelector(
        ".avatar-placeholder"
      );


  if (placeholder) {

    placeholder.style.display =
      "block";

  }


  if (img) {

    img.removeAttribute(
      "src"
    );

    img.style.display =
      "none";

  }


  if (video) {

    try {
      video.pause();
    } catch {}


    video.removeAttribute(
      "src"
    );

    video.style.display =
      "none";

  }

}


function displayMedia(
  img,
  video,
  url,
  mime = ""
) {

  const placeholder =
    img
      ?.closest(
        ".avatar-wrap"
      )
      ?.querySelector(
        ".avatar-placeholder"
      );


  if (!url) {

    clearMedia(
      img,
      video
    );

    return;
  }


  const isVideo =
    mime.startsWith(
      "video/"
    ) ||
    /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i
      .test(url);


  if (placeholder) {

    placeholder.style.display =
      "none";

  }


  if (isVideo) {

    if (img) {

      img.style.display =
        "none";

      img.removeAttribute(
        "src"
      );

    }


    if (video) {

      video.src =
        url;

      video.style.display =
        "block";

      video.muted =
        true;

      video.loop =
        true;

      video.autoplay =
        true;

      video.playsInline =
        true;


      video
        .play()
        .catch(
          () => {}
        );

    }


  } else {

    if (video) {

      try {
        video.pause();
      } catch {}


      video.removeAttribute(
        "src"
      );

      video.style.display =
        "none";

    }


    if (img) {

      img.src =
        url;

      img.style.display =
        "block";

    }

  }

}


function restoreMedia() {

  displayMedia(
    $("#avatarImg"),
    $("#avatarVideo"),
    state.customMedia.avatar ||
      ""
  );


  displayMedia(
    $("#coverImg"),
    $("#coverVideo"),
    state.customMedia.cover ||
      ""
  );

}


async function setMedia(
  input,
  img,
  video,
  folder,
  fieldName
) {

  const file =
    input?.files?.[0];


  if (
    !file ||
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }


  const progress =
    $("#uploadProgress");

  const progressText =
    $("#uploadProgressText");

  const progressFill =
    $("#uploadProgressFill");


  if (progress) {

    progress.classList.add(
      "show"
    );

  }


  try {

    if (progressText) {

      progressText.textContent =
        "Envoi… 10%";

    }


    if (progressFill) {

      progressFill.style.width =
        "10%";

    }


    const extension =
      (
        file.name
          .split(".")
          .pop() ||
        "bin"
      )
        .toLowerCase();


    const filename =
      currentUser.id +
      "_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2) +
      "." +
      extension;


    const path =
      folder +
      "/" +
      filename;


    if (progressText) {

      progressText.textContent =
        "Envoi… 35%";

    }


    if (progressFill) {

      progressFill.style.width =
        "35%";

    }


    const {
      error: uploadError
    } =
      await supabaseClient
        .storage
        .from("media")
        .upload(
          path,
          file,
          {
            cacheControl:
              "3600",

            upsert:
              false
          }
        );


    if (uploadError) {
      throw uploadError;
    }


    const {
      data: publicData
    } =
      supabaseClient
        .storage
        .from("media")
        .getPublicUrl(
          path
        );


    const publicUrl =
      publicData?.publicUrl;


    if (!publicUrl) {

      throw new Error(
        "URL publique introuvable."
      );

    }


    const updatePayload =
      fieldName ===
        "avatar_url"

        ? {
          avatar_url:
            publicUrl
        }

        : {
          cover_url:
            publicUrl
        };


    const {
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .update(
          updatePayload
        )
        .eq(
          "id",
          currentUser.id
        );


    if (profileError) {
      throw profileError;
    }


    

      if (
  fieldName ===
  "avatar_url"
) {

  state.customMedia.avatar =
    publicUrl;

  currentUserAvatar =
    publicUrl;

  updateBottomProfileAvatar();

}

if (
  fieldName ===
  "cover_url"
) {

  state.customMedia.cover =
    publicUrl;

}


    save();


    displayMedia(
      img,
      video,
      publicUrl,
      file.type
    );


    if (progressText) {

      progressText.textContent =
        "Envoi… 100%";

    }


    if (progressFill) {

      progressFill.style.width =
        "100%";

    }


    toast(
      fieldName ===
        "avatar_url"

        ? "Photo de profil modifiée"

        : "Bannière modifiée"
    );


  } catch (error) {

    console.error(
      "Erreur upload média :",
      error
    );


    toast(
      error?.message ||
      "Erreur pendant l'envoi"
    );


  } finally {

    if (input) {
      input.value = "";
    }


    setTimeout(
      () => {

        if (progress) {

          progress.classList.remove(
            "show"
          );

        }


        if (progressFill) {

          progressFill.style.width =
            "0%";

        }

      },
      600
    );

  }

}


$("#avatarInput")
  ?.addEventListener(
    "change",
    () => {

      setMedia(
        $("#avatarInput"),
        $("#avatarImg"),
        $("#avatarVideo"),
        "profiles",
        "avatar_url"
      );

    }
  );


$("#coverInput")
  ?.addEventListener(
    "change",
    () => {

      setMedia(
        $("#coverInput"),
        $("#coverImg"),
        $("#coverVideo"),
        "covers",
        "cover_url"
      );

    }
  );


/* =========================================================
PUBLICATIONS
========================================================= */
function formatLikes(number) {

  number = Number(number) || 0;

  if (number >= 1000000) {
    const value = number / 1000000;

    return (
      (value >= 10
        ? Math.floor(value)
        : Math.floor(value * 10) / 10
      )
      .toString()
      .replace(".", ",") + "M"
    );
  }

  if (number >= 1000) {
    const value = number / 1000;

    return (
      (value >= 10
        ? Math.floor(value)
        : Math.floor(value * 10) / 10
      )
      .toString()
      .replace(".", ",") + "K"
    );
  }

  return number.toString();
}
function mediaElement(
  post,
  forViewer = false
) {

  /* IFRAME / EMBED */

  if (
    post.sourceType ===
    "embed"
  ) {

    const iframe =
      document.createElement(
        "iframe"
      );

    iframe.src =
      post.src;

    iframe.loading =
      "lazy";

    iframe.allowFullscreen =
      true;

    iframe.referrerPolicy =
      "strict-origin-when-cross-origin";

    iframe.setAttribute(
      "allow",
      "autoplay; fullscreen; picture-in-picture"
    );

    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
    );

    iframe.style.border =
      "0";

    iframe.style.width =
      "100%";

    iframe.style.height =
      "100%";

    return iframe;

  }


  /* VIDEO */

  if (
    post.type ===
    "video"
  ) {

    const video =
      document.createElement(
        "video"
      );


    video.src =
      post.src;


    video.loop =
      true;


    video.playsInline =
      true;


    video.preload =
      "auto";


    if (forViewer) {

      video.controls =
        true;

      video.muted =
        false;

    } else {

      video.muted =
        true;

      video.autoplay =
        true;

      video.setAttribute(
        "autoplay",
        ""
      );

      video.setAttribute(
        "muted",
        ""
      );

      video.setAttribute(
        "loop",
        ""
      );

      video.setAttribute(
        "playsinline",
        ""
      );

    }


    return video;

  }


  /* IMAGE */

  const img =
    document.createElement(
      "img"
    );


  img.src =
    post.src;


  img.alt =
    post.caption ||
    "Publication";


  img.loading =
    "lazy";


  return img;

}

  


function playGridVideos() {

  $$("#postGrid video")
    .forEach(
      video => {

        video.muted =
          true;

        video.loop =
          true;

        video.playsInline =
          true;


        const promise =
          video.play();


        if (
          promise &&
          typeof promise.catch ===
            "function"
        ) {

          promise.catch(
            () => {}
          );

        }

      }
    );

}


function renderGrid() {

  const grid =
    $("#postGrid");


  if (!grid) {
    return;
  }


  grid.innerHTML =
    "";


  const posts =
    state.posts.filter(
      post =>

        state.filter ===
          "all" ||

        post.type ===
          state.filter
    );


  if ($("#postCount")) {

    $("#postCount")
      .textContent =
      state.posts.length;

  }


  if ($("#emptyState")) {

    $("#emptyState")
      .style.display =
      posts.length
        ? "none"
        : "block";

  }


  posts.forEach(
    post => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "post";


      card.dataset.id =
        post.id;


      const media =
        mediaElement(
          post
        );


      card.appendChild(
        media
      );

      if (
  media.tagName === "IFRAME"
) {

  media.style.pointerEvents =
    "none";
}

      if (
        post.type ===
        "video"
      ) {

        const icon =
          document.createElement(
            "span"
          );


        icon.className =
          "video-icon";


        icon.textContent =
          "▶";


        card.appendChild(
          icon
        );


        if (
  media.tagName ===
  "VIDEO"
) {

  media
    .play()
    .catch(
      () => {}
    );

}

      }


      const likeBadge =
        document.createElement(
          "span"
        );


      likeBadge.className =
        "like-badge";


      likeBadge.innerHTML =
  `<span class="profile-like-heart">♡</span>
   <span class="profile-like-number">${formatLikes(post.likes)}</span>`;


      card.appendChild(
        likeBadge
      );


      let lastTap =
        0;


      card.addEventListener(
        "click",
        () => {

          const now =
            Date.now();


          if (
            now -
              lastTap <
            350
          ) {

            like(
              post.id,
              true
            );


            lastTap =
              0;


            return;
          }


          lastTap =
            now;


          setTimeout(
            () => {

              if (
                Date.now() -
                  lastTap >=
                300
              ) {

                openReels(
  post
);
              }

            },
            320
          );

        }
      );


      grid.appendChild(
        card
      );

    }
  );


  requestAnimationFrame(
    playGridVideos
  );

}


async function uploadPost(
  file
) {

  if (
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }


  const progress =
    $("#uploadProgress");

  const progressText =
    $("#uploadProgressText");

  const progressFill =
    $("#uploadProgressFill");


  if (progress) {

    progress.classList.add(
      "show"
    );

  }


  try {

    const type =
      file.type.startsWith(
        "video/"
      )
        ? "video"
        : "image";


    const extension =
      (
        file.name
          .split(".")
          .pop() ||
        "bin"
      )
        .toLowerCase();


    const filename =
      currentUser.id +
      "_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2) +
      "." +
      extension;


    const path =
      "posts/" +
      filename;


    if (progressText) {

      progressText.textContent =
        "Envoi… 20%";

    }


    if (progressFill) {

      progressFill.style.width =
        "20%";

    }


    const {
      error: uploadError
    } =
      await supabaseClient
        .storage
        .from("media")
        .upload(
          path,
          file,
          {
            cacheControl:
              "3600",

            upsert:
              false
          }
        );


    if (uploadError) {
      throw uploadError;
    }


    const {
      data: publicData
    } =
      supabaseClient
        .storage
        .from("media")
        .getPublicUrl(
          path
        );


    const publicUrl =
      publicData?.publicUrl;


    if (!publicUrl) {

      throw new Error(
        "URL publique introuvable."
      );

    }


    const {
      data,
      error: insertError
    } =
      await supabaseClient
        .from("posts")
        .insert({

          user_id:
            currentUser.id,

          type,

          media_url:
            publicUrl,

          caption:
            "",

          likes:
            0

        })
        .select()
        .single();


    if (insertError) {
      throw insertError;
    }


    state.posts.unshift({

      id:
        data.id,

      type:
        data.type ||
        type,

      src:
        data.media_url ||
        publicUrl,

      caption:
        data.caption ||
        "",

      likes:
        data.likes ||
        0

    });


    save();

    renderGrid();


    if (progressText) {

      progressText.textContent =
        "Envoi… 100%";

    }


    if (progressFill) {

      progressFill.style.width =
        "100%";

    }


    toast(
      type === "video"
        ? "Vidéo publiée"
        : "Photo publiée"
    );


  } catch (error) {

    console.error(
      "Erreur publication :",
      error
    );


    toast(
      error?.message ||
      "Erreur pendant la publication"
    );


  } finally {

    setTimeout(
      () => {

        if (progress) {

          progress.classList.remove(
            "show"
          );

        }


        if (progressFill) {

          progressFill.style.width =
            "0%";

        }

      },
      600
    );

  }

}


async function loadSupabasePosts() {

  if (
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("posts")
        .select(
  "id,user_id,type,source_type,media_url,caption,likes"
)
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "id",
          {
            ascending:
              false
          }
        );


    if (error) {
      throw error;
    }


    state.posts =
      (
        data ||
        []
      ).map(
        post => ({

          id:
            post.id,

          type:
            post.type ||
            "image",
sourceType:
  post.source_type ||
  "upload",
          src:
            post.media_url,

          caption:
            post.caption ||
            "",

          likes:
            post.likes ||
            0

        })
      );
const postIds =
  state.posts.map(
    post => post.id
  );

if (postIds.length) {

  const {
    data: likesData,
    error: likesError
  } =
    await supabaseClient
      .from("post_likes")
      .select("post_id,user_id")
      .in("post_id", postIds);

  if (likesError) {
    throw likesError;
  }

  state.posts.forEach(
    post => {

      post.likes =
        (likesData || [])
          .filter(
            like =>
              like.post_id == post.id
          )
          .length;

      state.liked[post.id] =
        (likesData || [])
          .some(
            like =>
              like.post_id == post.id &&
              like.user_id === currentUser.id
          );

    }
  );

}

    save();

    renderGrid();
renderProfile();

  } catch (error) {

    console.error(
      "Erreur chargement publications :",
      error
    );


    state.posts =
      [];


    renderGrid();


    toast(
      "Impossible de charger les publications"
    );

  }

}


$("#addPostBtn")
  ?.addEventListener(
    "click",
    () => {

      const overlay =
        $("#publishChoiceOverlay");

      if (overlay) {
        overlay.hidden = false;
      }

    }
  );
$("#publishUploadBtn")
  ?.addEventListener(
    "click",
    () => {

      const overlay =
        $("#publishChoiceOverlay");

      if (overlay) {
        overlay.hidden = true;
      }

      $("#postInput")
        ?.click();

    }
  );


$("#publishEmbedBtn")
  ?.addEventListener(
    "click",
    () => {

      const choiceOverlay =
        $("#publishChoiceOverlay");

      const embedOverlay =
        $("#embedPostOverlay");

      if (choiceOverlay) {
        choiceOverlay.hidden = true;
      }

      if ($("#embedPostInput")) {
        $("#embedPostInput").value = "";
      }

      if ($("#embedCaptionInput")) {
        $("#embedCaptionInput").value = "";
      }

      if (embedOverlay) {
        embedOverlay.hidden = false;
      }

    }
  );


$("#publishChoiceCancelBtn")
  ?.addEventListener(
    "click",
    () => {

      const overlay =
        $("#publishChoiceOverlay");

      if (overlay) {
        overlay.hidden = true;
      }

    }
  );


$("#embedCancelBtn")
  ?.addEventListener(
    "click",
    () => {

      const overlay =
        $("#embedPostOverlay");

      if (overlay) {
        overlay.hidden = true;
      }

    }
  );
function extractExternalMedia(
  value
) {

  const text =
    value.trim();

  if (!text) {
    throw new Error(
      "Collez une URL ou une iframe."
    );
  }


  /* IFRAME COMPLETE */

  if (
    /<iframe[\s>]/i.test(
      text
    )
  ) {

    const documentParsed =
      new DOMParser()
        .parseFromString(
          text,
          "text/html"
        );

    const iframe =
      documentParsed
        .querySelector(
          "iframe"
        );

    const src =
      iframe
        ?.getAttribute(
          "src"
        )
        ?.trim();

    if (!src) {
      throw new Error(
        "Cette iframe ne contient pas d’adresse valide."
      );
    }

    const url =
      new URL(
        src,
        location.href
      );

    if (
      url.protocol !==
      "https:"
    ) {
      throw new Error(
        "Seules les adresses HTTPS sont acceptées."
      );
    }

    return {
      url:
        url.href,

      sourceType:
        "embed"
    };

  }
  
/* IMAGE HTML */

if (
  /<img[\s>]/i.test(
    text
  )
) {

  const documentParsed =
    new DOMParser()
      .parseFromString(
        text,
        "text/html"
      );

  const img =
    documentParsed
      .querySelector(
        "img"
      );

  const src =
    img
      ?.getAttribute(
        "src"
      )
      ?.trim();

  if (!src) {
    throw new Error(
      "Cette image ne contient pas d’adresse valide."
    );
  }

  const url =
    new URL(
      src,
      location.href
    );

  if (
    url.protocol !==
    "https:"
  ) {
    throw new Error(
      "Seules les adresses HTTPS sont acceptées."
    );
  }

  return {
    url: url.href,
    sourceType: "external"
  };

}

  /* URL DIRECTE */

  const url =
    new URL(
      text
    );

  if (
    url.protocol !==
    "https:"
  ) {
    throw new Error(
      "Seules les adresses HTTPS sont acceptées."
    );
  }


  return {
    url:
      url.href,

    sourceType:
      "external"
  };

}


$("#embedPublishBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (
        !supabaseReady() ||
        !currentUser
      ) {
        return;
      }


      const mediaInput =
        $("#embedPostInput");

      const captionInput =
        $("#embedCaptionInput");

      const button =
        $("#embedPublishBtn");


      const rawValue =
        mediaInput
          ?.value
          .trim() ||
        "";


      const caption =
        captionInput
          ?.value
          .trim() ||
        "";


      const type =
        document
          .querySelector(
            'input[name="embedMediaType"]:checked'
          )
          ?.value ||
        "video";


      try {

        button.disabled =
          true;

        button.textContent =
          "Publication...";


        const external =
          extractExternalMedia(
            rawValue
          );


        const {
          data,
          error
        } =
          await supabaseClient
            .from("posts")
            .insert({

              user_id:
                currentUser.id,

              type,

              source_type:
                external.sourceType,

              media_url:
                external.url,

              caption,

              likes:
                0

            })
            .select()
            .single();


        if (error) {
          throw error;
        }


        state.posts.unshift({

          id:
            data.id,

          type:
            data.type ||
            type,

          sourceType:
            data.source_type ||
            external.sourceType,

          src:
            data.media_url ||
            external.url,

          caption:
            data.caption ||
            caption,

          likes:
            0

        });


        save();

        renderGrid();

        renderProfile();


        if (mediaInput) {
          mediaInput.value =
            "";
        }

        if (captionInput) {
          captionInput.value =
            "";
        }


        const overlay =
          $("#embedPostOverlay");

        if (overlay) {
          overlay.hidden =
            true;
        }


        toast(
          type === "video"
            ? "Vidéo intégrée"
            : "Photo intégrée"
        );


      } catch (error) {

        console.error(
          "Erreur publication externe :",
          error
        );

        toast(
          error?.message ||
          "Impossible de publier ce média"
        );


      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Publier";

        }

      }

    }
  );

$("#bottomAddPostBtn")
  ?.addEventListener(
    "click",
    () => {

      $("#postInput")
        ?.click();

    }
  );


$("#postInput")
  ?.addEventListener(
    "change",
    async () => {

      const input =
        $("#postInput");


      const file =
        input?.files?.[0];


      if (!file) {
        return;
      }


      await uploadPost(
        file
      );


      input.value =
        "";

    }
  );


/* =========================================================
LIKES
========================================================= */

async function refreshPostLikes(postId) {

  if (!supabaseReady() || !postId) {
    return 0;
  }

  const {
    count,
    error
  } =
    await supabaseClient
      .from("post_likes")
      .select(
        "*",
        {
          count: "exact",
          head: true
        }
      )
      .eq(
        "post_id",
        postId
      );

  if (error) {
    console.error(
      "Erreur compteur likes :",
      error
    );

    return 0;
  }

  const total =
    count || 0;

  const post =
    state.posts.find(
      item =>
        item.id == postId
    );

  if (post) {
    post.likes = total;
  }

  const explorePost =
    explorePosts.find(
      item =>
        item.id == postId
    );

  if (explorePost) {
    explorePost.likes = total;
  }

  return total;
}


async function like(
  id,
  showAnimation = false
) {

  if (
    !supabaseReady() ||
    !currentUser ||
    !id
  ) {
    return;
  }

  try {

    const {
      data: existingLike,
      error: checkError
    } =
      await supabaseClient
        .from("post_likes")
        .select(
          "post_id,user_id"
        )
        .eq(
          "post_id",
          id
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

    if (checkError) {
      throw checkError;
    }


    if (existingLike) {

      const {
        error
      } =
        await supabaseClient
          .from("post_likes")
          .delete()
          .eq(
            "post_id",
            id
          )
          .eq(
            "user_id",
            currentUser.id
          );

      if (error) {
        throw error;
      }

      state.liked[id] =
        false;

    } else {

      const {
        error
      } =
        await supabaseClient
          .from("post_likes")
          .insert({
            post_id: id,
            user_id: currentUser.id
          });

      if (error) {
        throw error;
      }

      state.liked[id] =
        true;

  }


    await refreshPostLikes(
      id
    );

    save();

    renderGrid();


    if (
      showAnimation &&
      state.liked[id]
    ) {

      const target =
        [...(
          $("#postGrid")
            ?.children ||
          []
        )]
          .find(
            element =>
              element.dataset.id ==
              id
          );


      if (target) {

        const heart =
          document.createElement(
            "div"
          );

        heart.className =
          "heart-pop";

        heart.textContent =
          "♥";

        target.appendChild(
          heart
        );

        setTimeout(
          () =>
            heart.remove(),
          750
        );
      }
    }

  } catch (error) {

    console.error(
      "Erreur like Supabase :",
      error
    );

    toast(
      "Impossible d'enregistrer le like"
    );
  }
}

/* =========================================================
OPTIONS PUBLICATION
========================================================= */

let selectedPostForMenu =
  null;


function getPostOwnerId(post) {

  return (
    post?.userId ||
    activeProfileId ||
    currentUser?.id ||
    null
  );

}


function isOwnPost(post) {

  if (
    !post ||
    !currentUser
  ) {
    return false;
  }

  return (
    getPostOwnerId(post) ===
    currentUser.id
  );

}


function openPostMenu(post) {

  if (!isOwnPost(post)) {
    return;
  }

  selectedPostForMenu =
    post;

  const overlay =
    $("#postMenuOverlay");

  if (overlay) {
    overlay.hidden =
      false;
  }

}


function closePostMenu() {

  const overlay =
    $("#postMenuOverlay");

  if (overlay) {
    overlay.hidden =
      true;
  }

}


function addPostOptionsButton(
  container,
  post
) {

  if (!container) {
    return;
  }


  container
    .querySelector(
      ".post-options-btn"
    )
    ?.remove();


  if (!isOwnPost(post)) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";

  button.className =
    "post-options-btn";


  button.setAttribute(
    "aria-label",
    "Options de la publication"
  );


  button.innerHTML =
    `
    <span
      class="post-options-lines"
    ></span>
    `;


  button.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      openPostMenu(
        post
      );

    }
  );


  container.appendChild(
    button
  );

}


function updatePostCaptionLocally(
  postId,
  caption
) {

  const update =
    post => {

      if (
        post &&
        post.id == postId
      ) {

        post.caption =
          caption;

      }

    };


  state.posts.forEach(
    update
  );

  explorePosts.forEach(
    update
  );

  homeFeedPosts.forEach(
    update
  );


  if (
    currentReelPost &&
    currentReelPost.id == postId
  ) {

    currentReelPost.caption =
      caption;

  }

}


/* MODIFIER */

$("#editPostMenuBtn")
  ?.addEventListener(
    "click",
    async () => {

      const post =
        selectedPostForMenu;


      if (!isOwnPost(post)) {
        return;
      }


      closePostMenu();


      const oldCaption =
        post.caption ||
        "";


      const newCaption =
        window.prompt(
          "Modifier la légende :",
          oldCaption
        );


      if (
        newCaption ===
        null
      ) {
        return;
      }


      try {

        const caption =
          newCaption.trim();


        const {
          error
        } =
          await supabaseClient
            .from("posts")
            .update({
              caption
            })
            .eq(
              "id",
              post.id
            )
            .eq(
              "user_id",
              currentUser.id
            );


        if (error) {
          throw error;
        }


        updatePostCaptionLocally(
          post.id,
          caption
        );


        save();

        renderGrid();


        if (
          currentReelPost &&
          currentReelPost.id ==
            post.id &&
          $("#reelsCaption")
        ) {

          $("#reelsCaption")
            .textContent =
            caption;

        }


        toast(
          "Publication modifiée"
        );


      } catch (error) {

        console.error(
          "Erreur modification publication :",
          error
        );

        toast(
          "Impossible de modifier la publication"
        );

      }

    }
  );


/* SUPPRIMER */

$("#deletePostMenuBtn")
  ?.addEventListener(
    "click",
    async () => {

      const post =
        selectedPostForMenu;


      if (!isOwnPost(post)) {
        return;
      }


      const confirmed =
        window.confirm(
          "Supprimer définitivement cette publication ?"
        );


      if (!confirmed) {
        return;
      }


      closePostMenu();


      try {

        const {
          error
        } =
          await supabaseClient
            .from("posts")
            .delete()
            .eq(
              "id",
              post.id
            )
            .eq(
              "user_id",
              currentUser.id
            );


        if (error) {
          throw error;
        }


        state.posts =
          state.posts.filter(
            item =>
              item.id != post.id
          );


        explorePosts =
          explorePosts.filter(
            item =>
              item.id != post.id
          );


        homeFeedPosts =
          homeFeedPosts.filter(
            item =>
              item.id != post.id
          );


        save();

        renderGrid();

        renderProfile();


        if (
          currentReelPost &&
          currentReelPost.id ==
            post.id
        ) {

          closeReels();

        }


        const viewer =
          $("#viewer");

        if (
          viewer?.classList
            .contains("open")
        ) {

          closeViewer();

        }


        toast(
          "Publication supprimée"
        );


      } catch (error) {

        console.error(
          "Erreur suppression publication :",
          error
        );

        toast(
          "Impossible de supprimer la publication"
        );

      }

    }
  );


$("#closePostMenuBtn")
  ?.addEventListener(
    "click",
    () => {

      closePostMenu();

    }
  );


$("#postMenuOverlay")
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "postMenuOverlay"
      ) {

        closePostMenu();

      }

    }
  );
/* =========================================================
COMMENTAIRES
========================================================= */

let commentsPost =
  null;


function formatCommentTime(date) {

  const time =
    new Date(date).getTime();

  const seconds =
    Math.max(
      0,
      Math.floor(
        (Date.now() - time) /
        1000
      )
    );

  if (seconds < 60) {
    return "maintenant";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return minutes + " min";
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return hours + " h";
  }

  const days =
    Math.floor(
      hours / 24
    );

  return days + " j";
}


async function getCommentCount(
  postId
) {

  if (!postId) {
    return 0;
  }

  const {
    count,
    error
  } =
    await supabaseClient
      .from("comments")
      .select(
        "*",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "post_id",
        postId
      );

  if (error) {

    console.error(
      "Erreur compteur commentaires :",
      error
    );

    return 0;
  }

  return count || 0;
}


async function updateCommentCount(
  postId
) {

  const total =
    await getCommentCount(
      postId
    );


  if (
    currentReelPost &&
    currentReelPost.id ==
      postId
  ) {

    const span =
      $("#reelsCommentBtn span");

    if (span) {

      span.textContent =
        formatLikes(total);

    }

  }


  const viewerButton =
    $("#viewerCommentBtn");

  if (
    viewerButton &&
    viewerButton.dataset.postId ==
      String(postId)
  ) {

    const span =
      viewerButton.querySelector(
        "span"
      );

    if (span) {

      span.textContent =
        formatLikes(total);

    }

  }


  return total;
}


function setCommentCurrentAvatar() {

  const box =
    $("#commentCurrentAvatar");

  if (!box) {
    return;
  }

  box.innerHTML = "";


  if (currentUserAvatar) {

    const img =
      document.createElement(
        "img"
      );

    img.src =
      currentUserAvatar;

    img.alt =
      "Votre profil";

    box.appendChild(
      img
    );

  } else {

    box.textContent =
      "👤";

  }

}


async function loadComments(
  postId
) {

  const list =
    $("#commentsList");

  const empty =
    $("#commentsEmpty");


  if (
    !list ||
    !empty ||
    !postId
  ) {
    return;
  }


  list.innerHTML =
    "";

  empty.hidden =
    true;


  try {

    const {
      data: comments,
      error
    } =
      await supabaseClient
        .from("comments")
        .select(
          "id,post_id,user_id,content,created_at"
        )
        .eq(
          "post_id",
          postId
        )
        .order(
          "created_at",
          {
            ascending:false
          }
        );


    if (error) {
      throw error;
    }


    if (
      !comments ||
      !comments.length
    ) {

      empty.hidden =
        false;

      return;
    }


    const userIds =
      [
        ...new Set(
          comments
            .map(
              comment =>
                comment.user_id
            )
            .filter(Boolean)
        )
      ];


    const commentIds =
      comments.map(
        comment =>
          comment.id
      );


    let profiles =
      [];

    let likes =
      [];


    if (userIds.length) {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("profiles")
          .select(
            "id,username,name,avatar_url"
          )
          .in(
            "id",
            userIds
          );


      if (error) {
        throw error;
      }


      profiles =
        data || [];

    }


    if (commentIds.length) {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("comment_likes")
          .select(
            "comment_id,user_id"
          )
          .in(
            "comment_id",
            commentIds
          );


      if (error) {
        throw error;
      }


      likes =
        data || [];

    }


    const profilesMap =
      new Map(
        profiles.map(
          profile => [
            profile.id,
            profile
          ]
        )
      );


    comments.forEach(
      comment => {

        const profile =
          profilesMap.get(
            comment.user_id
          );


        const commentLikes =
          likes.filter(
            like =>
              like.comment_id ===
              comment.id
          );


        const liked =
          commentLikes.some(
            like =>
              like.user_id ===
              currentUser.id
          );


        const row =
          document.createElement(
            "div"
          );

        row.className =
          "comment-item";


        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "comment-avatar";


        if (profile?.avatar_url) {

          const img =
            document.createElement(
              "img"
            );

          img.src =
            profile.avatar_url;

          img.alt =
            profile.username ||
            "";

          avatar.appendChild(
            img
          );

        } else {

          avatar.textContent =
            "👤";

        }


        const body =
          document.createElement(
            "div"
          );

        body.className =
          "comment-body";


        const username =
          document.createElement(
            "span"
          );

        username.className =
          "comment-username";

        username.textContent =
          profile?.username ||
          "Utilisateur";


        const content =
          document.createElement(
            "span"
          );

        content.className =
          "comment-content";

        content.textContent =
          " " +
          comment.content;


        const meta =
          document.createElement(
            "div"
          );

        meta.className =
          "comment-meta";

        meta.textContent =
          formatCommentTime(
            comment.created_at
          );


        body.appendChild(
          username
        );

        body.appendChild(
          content
        );

        body.appendChild(
          meta
        );


        const likeButton =
          document.createElement(
            "button"
          );

        likeButton.type =
          "button";

        likeButton.className =
          "comment-like-btn";


        if (liked) {

          likeButton.classList.add(
            "liked"
          );

        }


        likeButton.innerHTML =
          `
          ${liked ? "♥" : "♡"}
          <span class="comment-like-count">
            ${formatLikes(commentLikes.length)}
          </span>
          `;


        likeButton.addEventListener(
          "click",
          async event => {

            event.stopPropagation();


            try {

              const isLiked =
                likeButton
                  .classList
                  .contains(
                    "liked"
                  );


              if (isLiked) {

                const {
                  error
                } =
                  await supabaseClient
                    .from(
                      "comment_likes"
                    )
                    .delete()
                    .eq(
                      "comment_id",
                      comment.id
                    )
                    .eq(
                      "user_id",
                      currentUser.id
                    );


                if (error) {
                  throw error;
                }

              } else {

                const {
                  error
                } =
                  await supabaseClient
                    .from(
                      "comment_likes"
                    )
                    .insert({
                      comment_id:
                        comment.id,

                      user_id:
                        currentUser.id
                    });


                if (error) {
                  throw error;
                }

              }


              await loadComments(
                postId
              );


            } catch (error) {

              console.error(
                "Erreur like commentaire :",
                error
              );

              toast(
                "Impossible d’aimer ce commentaire"
              );

            }

          }
        );


        row.appendChild(
          avatar
        );

        row.appendChild(
          body
        );

        row.appendChild(
          likeButton
        );


        list.appendChild(
          row
        );

      }
    );


  } catch (error) {

    console.error(
      "Erreur chargement commentaires :",
      error
    );

    empty.textContent =
      "Impossible de charger les commentaires.";

    empty.hidden =
      false;

  }

}


async function openComments(
  post
) {

  if (
    !post ||
    !post.id ||
    !currentUser
  ) {
    return;
  }


  commentsPost =
    post;


  const overlay =
    $("#commentsOverlay");


  if (!overlay) {
    return;
  }


  setCommentCurrentAvatar();


  overlay.hidden =
    false;


  await loadComments(
    post.id
  );


  await updateCommentCount(
    post.id
  );


  setTimeout(
    () => {

      $("#commentInput")
        ?.focus();

    },
    250
  );

}


function closeComments() {

  const overlay =
    $("#commentsOverlay");


  if (overlay) {

    overlay.hidden =
      true;

  }


  if ($("#commentInput")) {

    $("#commentInput").value =
      "";

  }

}


$("#commentsCloseBtn")
  ?.addEventListener(
    "click",
    closeComments
  );


$("#commentsOverlay")
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "commentsOverlay"
      ) {

        closeComments();

      }

    }
  );


$("#commentForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (
        !commentsPost ||
        !currentUser
      ) {
        return;
      }


      const input =
        $("#commentInput");


      const content =
        input?.value
          .trim() ||
        "";


      if (!content) {
        return;
      }


      const button =
        $("#commentSendBtn");


      if (button) {
        button.disabled =
          true;
      }


      try {

        const {
          error
        } =
          await supabaseClient
            .from("comments")
            .insert({
              post_id:
                commentsPost.id,

              user_id:
                currentUser.id,

              content
            });


        if (error) {
          throw error;
        }


        input.value =
          "";


        await loadComments(
          commentsPost.id
        );


        await updateCommentCount(
          commentsPost.id
        );


      } catch (error) {

        console.error(
          "Erreur ajout commentaire :",
          error
        );

        toast(
          "Impossible de publier le commentaire"
        );


      } finally {

        if (button) {

          button.disabled =
            false;

        }

      }

    }
  );


/* BOUTON COMMENTAIRE DES REELS */

$("#reelsCommentBtn")
  ?.addEventListener(
    "click",
    async event => {

      event.stopPropagation();


      if (!currentReelPost) {
        return;
      }


      await openComments(
        currentReelPost
      );

    }
  );


/* ACTIONS SUR LES PHOTOS */

async function addViewerSocialActions(
  post
) {

  const viewer =
    $("#viewer");


  if (
    !viewer ||
    !post
  ) {
    return;
  }


  viewer
    .querySelector(
      ".viewer-social-actions"
    )
    ?.remove();


  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "viewer-social-actions";


  const likeButton =
    document.createElement(
      "button"
    );

  likeButton.type =
    "button";

  likeButton.className =
    "viewer-social-btn";


  const totalLikes =
    await refreshPostLikes(
      post.id
    );


  likeButton.innerHTML =
    `
    ♡
    <span>
      ${formatLikes(totalLikes)}
    </span>
    `;


  likeButton.addEventListener(
    "click",
    async event => {

      event.stopPropagation();


      await like(
        post.id,
        false
      );


      const total =
        await refreshPostLikes(
          post.id
        );


      likeButton.innerHTML =
        `
        ♡
        <span>
          ${formatLikes(total)}
        </span>
        `;

    }
  );


  const commentButton =
    document.createElement(
      "button"
    );

  commentButton.type =
    "button";

  commentButton.id =
    "viewerCommentBtn";

  commentButton.dataset.postId =
    String(post.id);

  commentButton.className =
    "viewer-social-btn";


  const commentsTotal =
    await getCommentCount(
      post.id
    );


  commentButton.innerHTML =
    `
    ◯
    <span>
      ${formatLikes(commentsTotal)}
    </span>
    `;


  commentButton.addEventListener(
    "click",
    async event => {

      event.stopPropagation();

      await openComments(
        post
      );

    }
  );


  actions.appendChild(
    likeButton
  );

  actions.appendChild(
    commentButton
  );


  viewer.appendChild(
    actions
  );

}
/* =========================================================
REELS
========================================================= */

let currentReelPost = null;

let currentReelOwnerId = null;
let reelPosts = [];
let currentReelIndex = -1;


function setReelSequence(
  post
) {

  if (
    typeof explorePosts !== "undefined" &&
    explorePosts.includes(post)
  ) {

    reelPosts =
      explorePosts;

  } else if (
    typeof homeFeedPosts !== "undefined" &&
    homeFeedPosts.includes(post)
  ) {

    reelPosts =
      homeFeedPosts;

  } else if (
    state.posts.includes(post)
  ) {

    reelPosts =
      state.posts;

  } else {

    reelPosts = [
      post
    ];

  }


  currentReelIndex =
    reelPosts.findIndex(
      item =>
        item === post ||
        item.id == post.id
    );


  if (
    currentReelIndex < 0
  ) {
    currentReelIndex = 0;
  }

}

async function updateReelsFollowButton(
  userId
) {

  const button =
    $("#reelsFollowBtn");

  if (
    !button ||
    !currentUser ||
    !userId
  ) {
    return;
  }


  /* Ne pas afficher Suivre sur son propre Reel */

  if (
    userId ===
    currentUser.id
  ) {

    button.hidden = true;

    return;
  }


  button.hidden = false;
  button.disabled = true;


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("follows")
        .select(
          "follower_id,following_id"
        )
        .eq(
          "follower_id",
          currentUser.id
        )
        .eq(
          "following_id",
          userId
        )
        .maybeSingle();


    if (error) {
      throw error;
    }


    const following =
      !!data;


    button.dataset.following =
      following
        ? "true"
        : "false";


    button.textContent =
      following
        ? "Suivi"
        : "Suivre";


    button.classList.toggle(
      "following",
      following
    );


  } catch (error) {

    console.error(
      "Erreur abonnement Reel :",
      error
    );

  } finally {

    button.disabled = false;

  }

}


async function toggleReelsFollow() {

  const button =
    $("#reelsFollowBtn");


  if (
    !button ||
    !currentUser ||
    !currentReelOwnerId ||
    currentReelOwnerId ===
      currentUser.id
  ) {
    return;
  }


  button.disabled = true;


  try {

    const following =
      button.dataset.following ===
      "true";


    if (following) {

      const {
        error
      } =
        await supabaseClient
          .from("follows")
          .delete()
          .eq(
            "follower_id",
            currentUser.id
          )
          .eq(
            "following_id",
            currentReelOwnerId
          );


      if (error) {
        throw error;
      }


      button.dataset.following =
        "false";

      button.textContent =
        "Suivre";

      button.classList.remove(
        "following"
      );


    } else {

      const {
        error
      } =
        await supabaseClient
          .from("follows")
          .insert({
            follower_id:
              currentUser.id,

            following_id:
              currentReelOwnerId
          });


      if (error) {
        throw error;
      }


      button.dataset.following =
        "true";

      button.textContent =
        "Suivi";

      button.classList.add(
        "following"
      );

    }


  } catch (error) {

    console.error(
      "Erreur clic Suivre Reel :",
      error
    );

    toast(
      "Impossible de modifier l’abonnement"
    );

  } finally {

    button.disabled = false;

  }

}


$("#reelsFollowBtn")
  ?.addEventListener(
    "click",
    async event => {

      event.stopPropagation();

      await toggleReelsFollow();

    }
  );
function updateReelsSoundIcon() {

  const button =
    $("#reelsSoundBtn");

  const video =
    $("#reelsVideo");

  if (
    !button ||
    !video
  ) {
    return;
  }


  button.innerHTML =
    video.muted
      ? `
        <svg viewBox="0 0 24 24">
          <path d="M4 10v4h4l5 4V6L8 10H4z"></path>
          <path d="M17 9l4 6"></path>
          <path d="M21 9l-4 6"></path>
        </svg>
      `
      : `
        <svg viewBox="0 0 24 24">
          <path d="M4 10v4h4l5 4V6L8 10H4z"></path>
          <path d="M16 9c1 1 1 5 0 6"></path>
          <path d="M19 7c2 3 2 7 0 10"></path>
        </svg>
      `;

}


$("#reelsSoundBtn")
  ?.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      const video =
        $("#reelsVideo");

      if (!video) return;

      video.muted =
        !video.muted;

      updateReelsSoundIcon();

      video
        .play()
        .catch(() => {});

    }
  );
let reelsTouchStartY = 0;
let reelsTouchStartX = 0;
let reelsTouchActive = false;
let reelsChanging = false;

async function changeReel(
  direction
) {

  if (
    reelsChanging ||
    !reelPosts.length ||
    currentReelIndex < 0
  ) {
    return;
  }

  const nextIndex =
    currentReelIndex +
    direction;

  if (
    nextIndex < 0 ||
    nextIndex >= reelPosts.length
  ) {
    return;
  }

  reelsChanging = true;

  const stage =
    document.querySelector(
      "#reelsPage .reels-stage"
    );

  const exitY =
    direction > 0
      ? "-100%"
      : "100%";

  const enterY =
    direction > 0
      ? "100%"
      : "-100%";

  try {

    if (stage) {

      stage.style.transition =
        "transform 180ms cubic-bezier(.25,.8,.25,1)";

      stage.style.transform =
        `translate3d(0, ${exitY}, 0)`;

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            180
          )
      );

    }

    currentReelIndex =
      nextIndex;

    await openReels(
      reelPosts[
        currentReelIndex
      ],
      true
    );

    if (stage) {

      stage.style.transition =
        "none";

      stage.style.transform =
        `translate3d(0, ${enterY}, 0)`;

      stage.offsetHeight;

      stage.style.transition =
        "transform 220ms cubic-bezier(.25,.8,.25,1)";

      requestAnimationFrame(
        () => {

          stage.style.transform =
            "translate3d(0,0,0)";

        }
      );

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            220
          )
      );

      stage.style.transition =
        "";

      stage.style.transform =
        "";

    }

  } finally {

    setTimeout(
      () => {

        reelsChanging =
          false;

      },
      80
    );

  }

}
function handleReelsTouchMove(
  event
) {

  if (
    !reelsTouchActive ||
    reelsChanging
  ) {
    return;
  }


  const touch =
    event.touches?.[0];

  if (!touch) {
    return;
  }


  const distanceY =
    touch.clientY -
    reelsTouchStartY;


  const distanceX =
    Math.abs(
      touch.clientX -
      reelsTouchStartX
    );


  if (
    Math.abs(distanceY) <=
    distanceX
  ) {
    return;
  }


  event.preventDefault();


  const stage =
    document.querySelector(
      "#reelsPage .reels-stage"
    );


  if (!stage) {
    return;
  }


  let movement =
    distanceY;


  /* RÉSISTANCE SI ON EST
     À LA PREMIÈRE PUBLICATION */

  if (
    movement > 0 &&
    currentReelIndex <= 0
  ) {

    movement *= 0.22;

  }


  /* RÉSISTANCE SI ON EST
     À LA DERNIÈRE PUBLICATION */

  if (
    movement < 0 &&
    currentReelIndex >=
      reelPosts.length - 1
  ) {

    movement *= 0.22;

  }


  stage.style.transition =
    "none";


  stage.style.transform =
    `translate3d(0, ${movement}px, 0)`;

}
function handleReelsTouchStart(
  event
) {

  if (
    event.target.closest(
      "button, input, textarea, a"
    )
  ) {
    return;
  }


  const touch =
    event.touches?.[0];

  if (!touch) {
    return;
  }


  reelsTouchStartY =
    touch.clientY;

  reelsTouchStartX =
    touch.clientX;

  reelsTouchActive =
    true;

}



async function handleReelsTouchEnd(
  event
) {

  if (!reelsTouchActive) {
    return;
  }


  reelsTouchActive =
    false;


  const stage =
    document.querySelector(
      "#reelsPage .reels-stage"
    );


  const resetStage =
    () => {

      if (!stage) {
        return;
      }

      stage.style.transition =
        "transform 220ms cubic-bezier(.25,.8,.25,1)";

      stage.style.transform =
        "translate3d(0,0,0)";

    };


  if (reelsChanging) {

    resetStage();

    return;

  }


  const touch =
    event.changedTouches?.[0];


  if (!touch) {

    resetStage();

    return;

  }


  const distanceY =
    reelsTouchStartY -
    touch.clientY;


  const distanceX =
    Math.abs(
      reelsTouchStartX -
      touch.clientX
    );


  /* PAS ASSEZ DE MOUVEMENT :
     RETOUR À LA POSITION NORMALE */

  if (
    Math.abs(distanceY) < 70 ||
    Math.abs(distanceY) <= distanceX
  ) {

    resetStage();

    return;

  }


  const direction =
    distanceY > 0
      ? 1
      : -1;


  const nextIndex =
    currentReelIndex +
    direction;


  /* PREMIÈRE / DERNIÈRE PUBLICATION :
     EFFET ÉLASTIQUE PUIS RETOUR */

  if (
    nextIndex < 0 ||
    nextIndex >= reelPosts.length
  ) {

    resetStage();

    return;

  }


  await changeReel(
    direction
  );

}


$("#reelsPage")
  ?.addEventListener(
    "touchstart",
    handleReelsTouchStart,
    {
      passive: true
    }
  );

$("#reelsPage")
  ?.addEventListener(
    "touchmove",
    handleReelsTouchMove,
    {
      passive: false
    }
  );

$("#reelsPage")
  ?.addEventListener(
    "touchend",
    handleReelsTouchEnd,
    {
      passive: true
    }
  );
      async function openReels(
  post,
  startWithSound = false
) {

  console.log("Ouverture Reel :", post);

  const page = document.getElementById("reelsPage");
         const video = document.getElementById("reelsVideo");
        const image =
  document.getElementById(
    "reelsImage"
  );
const embed =
  document.getElementById(
    "reelsEmbed"
  );

const soundButton =
  document.getElementById(
    "reelsSoundBtn"
  );

const isEmbed =
  post?.sourceType ===
  "embed";
        const isImage =
  post?.type ===
  "image";
        
  if (!page) {
    console.error("reelsPage introuvable");
    toast("Erreur : page Reels introuvable");
    return;
  }

  if (!video) {
    console.error("reelsVideo introuvable");
    toast("Erreur : lecteur vidéo introuvable");
    return;
  }

  if (!post || !post.src) {
    console.error("Vidéo invalide :", post);
    toast("Impossible de charger cette vidéo");
    return;
  }
        
setReelSequence(
  post
);
        

  currentReelPost = post;

await updateCommentCount(
  post.id
);

addPostOptionsButton(
  page,
  post
);

  page.hidden = false;
  page.removeAttribute("hidden");

  page.style.display = "flex";
  page.style.position = "fixed";
  page.style.inset = "0";
  page.style.zIndex = "99999";

  document.body.style.overflow = "hidden";
if (isEmbed) {

  /* IFRAME */

  try {
    video.pause();
  } catch {}

  video.removeAttribute(
    "src"
  );

  video.load();

  video.hidden = true;


  if (image) {
    image.hidden = true;
    image.removeAttribute(
      "src"
    );
  }


  if (embed) {
    embed.hidden = false;
    embed.src = post.src;
  }


  if (soundButton) {
    soundButton.hidden = true;
  }


} else if (isImage) {

  /* PHOTO */

  try {
    video.pause();
  } catch {}

  video.removeAttribute(
    "src"
  );

  video.load();

  video.hidden = true;


  if (embed) {
    embed.hidden = true;
    embed.removeAttribute(
      "src"
    );
  }


  if (image) {
    image.src = post.src;
    image.hidden = false;
  }


  if (soundButton) {
    soundButton.hidden = true;
  }


} else {

  /* VIDEO NORMALE */

  if (image) {
    image.hidden = true;
    image.removeAttribute(
      "src"
    );
  }


  if (embed) {
    embed.hidden = true;
    embed.removeAttribute(
      "src"
    );
  }


  video.hidden = false;


  try {
    video.pause();
  } catch {}


  video.controls = false;

  video.removeAttribute(
    "controls"
  );


  video.src = post.src;

  video.loop = true;

  video.playsInline = true;


  video.setAttribute(
    "playsinline",
    ""
  );

  video.setAttribute(
    "webkit-playsinline",
    ""
  );


  video.muted =
    !startWithSound;


  if (soundButton) {
    soundButton.hidden = false;
  }


  updateReelsSoundIcon();

  video.load();

}
  
  const likeCount =
    document.getElementById(
      "reelsLikeCount"
    );

  if (likeCount) {
    likeCount.textContent =
      post.likes || 0;
  }

  const caption =
    document.getElementById(
      "reelsCaption"
    );

  if (caption) {
    caption.textContent =
      post.caption || "";
  }

  const profileId =
    post.userId ||
    activeProfileId ||
    currentUser?.id;

currentReelOwnerId =
  profileId;

await updateReelsFollowButton(
  profileId
);

  if (
    profileId &&
    supabaseClient
  ) {

    try {

      const {
        data: profile,
        error
      } =
        await supabaseClient
          .from("profiles")
          .select(
            "id,username,name,avatar_url"
          )
          .eq(
            "id",
            profileId
          )
          .single();

      if (
        !error &&
        profile
      ) {

        const username =
          document.getElementById(
            "reelsUsername"
          );

        if (username) {
          username.textContent =
            profile.username ||
            "Utilisateur";
        }

        const avatar =
          document.getElementById(
            "reelsAvatar"
          );

        if (avatar) {

          avatar.innerHTML = "";

          if (profile.avatar_url) {

            const img =
              document.createElement(
                "img"
              );

            img.src =
              profile.avatar_url;

            img.alt =
              profile.username || "";

            avatar.appendChild(
              img
            );

          } else {

            avatar.textContent =
              "👤";

          }

        }

      }

    } catch (error) {

      console.error(
        "Erreur profil Reel :",
        error
      );

    }

  }

 
if (
  !isEmbed &&
  !isImage
) {

  try {

    await video.play();

  } catch (error) {

    console.error(
      "Erreur lecture Reel :",
      error
    );

  }

}

} // FERME openReels()


function closeReels() {

  const page =
    document.getElementById(
      "reelsPage"
    );

  const video =
    document.getElementById(
      "reelsVideo"
    );
const embed =
  document.getElementById(
    "reelsEmbed"
  );
if (embed) {

  embed.removeAttribute(
    "src"
  );

  embed.hidden =
    true;

}
  if (video) {

    try {
      video.pause();
    } catch {}

    video.removeAttribute(
      "src"
    );

    video.load();

  }


  if (page) {

    page.hidden = true;

    page.setAttribute(
      "hidden",
      ""
    );

    page.style.display =
      "none";

  }


  document.body.style.overflow =
    "";

  currentReelPost =
    null;

currentReelOwnerId =
  null;

}
$("#reelsBackBtn")
  ?.addEventListener(
    "click",
    closeReels
  );
  


$("#reelsVideo")
  ?.addEventListener(
    "click",
    () => {

      const video =
        $("#reelsVideo");

      if (!video) {
        return;
      }


      if (video.paused) {

        video
          .play()
          .catch(() => {});

      } else {

        video.pause();

      }

    }
  );


$("#reelsShareBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard
          .writeText(
            location.href
          );

        toast(
          "Lien copié"
        );

      } catch {

        toast(
          "Impossible de copier le lien"
        );

      }

    }
  );


$("#reelsLikeBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (!currentReelPost) {
        return;
      }

      await like(
        currentReelPost.id,
        false
      );

      await refreshPostLikes(
        currentReelPost.id
      );

      const reelPost =
        explorePosts.find(
          post =>
            post.id ==
            currentReelPost.id
        );

      const total =
        reelPost?.likes ??
        currentReelPost.likes ??
        0;

      currentReelPost.likes =
        total;

      if ($("#reelsLikeCount")) {
        $("#reelsLikeCount")
          .textContent =
          formatLikes(total);
      }

    }
  );
/* =========================================================
VISIONNEUSE
========================================================= */

let viewerIndex =
  0;


function getFilteredPosts() {

  return state.posts.filter(
    post =>

      state.filter ===
        "all" ||

      post.type ===
        state.filter
  );

}


function openViewer(id) {

  const posts =
    getFilteredPosts();


  const index =
    posts.findIndex(
      post =>
        post.id ==
        id
    );


  if (
    index <
    0
  ) {
    return;
  }


  viewerIndex =
    index;


  showViewerPost();


  const viewer =
    $("#viewer");


  if (!viewer) {
    return;
  }


  viewer.classList.add(
    "open"
  );


  viewer.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body
    .style.overflow =
    "hidden";

}


function showViewerPost() {

  const posts =
    getFilteredPosts();


  const post =
    posts[
      viewerIndex
    ];


  if (!post) {
    return;
  }


  const content =
    $("#viewerContent");


  if (!content) {
    return;
  }


  content.innerHTML =
    "";


  const element =
    mediaElement(
      post,
      true
    );


  content.appendChild(
    element
  );

addPostOptionsButton(
  $("#viewer"),
  post
);

addViewerSocialActions(
  post
);

  if (
    post.type ===
    "video"
  ) {

    element.autoplay =
      true;


    element.controls =
      true;


    element
      .addEventListener(
        "canplay",
        () => {

          element
            .play()
            .catch(
              () => {}
            );

        },
        {
          once:
            true
        }
      );

  }


  if (
    $("#viewerCaption")
  ) {

    $("#viewerCaption")
      .textContent =
      post.caption ||
      "";

  }

}


function closeViewer() {

  const viewer =
    $("#viewer");


  if (!viewer) {
    return;
  }


  viewer.classList.remove(
    "open"
  );


  viewer.setAttribute(
    "aria-hidden",
    "true"
  );


  if (
    $("#viewerContent")
  ) {

    $("#viewerContent")
      .innerHTML =
      "";

  }


  document.body
    .style.overflow =
    "";

}


$("#viewerClose")
  ?.addEventListener(
    "click",
    closeViewer
  );


$("#viewer")
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "viewer"
      ) {

        closeViewer();

      }

    }
  );


$("#viewerPrev")
  ?.addEventListener(
    "click",
    () => {

      const posts =
        getFilteredPosts();


      if (
        !posts.length
      ) {
        return;
      }


      viewerIndex =
        (
          viewerIndex -
          1 +
          posts.length
        ) %
        posts.length;


      showViewerPost();

    }
  );


$("#viewerNext")
  ?.addEventListener(
    "click",
    () => {

      const posts =
        getFilteredPosts();


      if (
        !posts.length
      ) {
        return;
      }


      viewerIndex =
        (
          viewerIndex +
          1
        ) %
        posts.length;


      showViewerPost();

    }
  );


document
  .addEventListener(
    "keydown",
    event => {

      const viewer =
        $("#viewer");


      if (
        !viewer ||
        !viewer.classList
          .contains(
            "open"
          )
      ) {
        return;
      }


      if (
        event.key ===
        "Escape"
      ) {

        closeViewer();

      }


      if (
        event.key ===
        "ArrowLeft"
      ) {

        $("#viewerPrev")
          ?.click();

      }


      if (
        event.key ===
        "ArrowRight"
      ) {

        $("#viewerNext")
          ?.click();

      }

    }
  );


/* =========================================================
FILTRES
========================================================= */

$$(".tab")
  .forEach(
    tab => {

      tab.addEventListener(
        "click",
        () => {

          $$(".tab")
            .forEach(
              item => {

                item
                  .classList
                  .remove(
                    "active"
                  );

              }
            );


          tab
            .classList
            .add(
              "active"
            );


          state.filter =
            tab.dataset.filter ||
            "all";


          save();

          renderGrid();

        }
      );

    }
  );
/* =========================================================
ABONNEMENTS
========================================================= */

async function loadFollowCounts(userId) {

  if (
    !supabaseReady() ||
    !userId
  ) {
    return;
  }

  try {

    const [
      followersResult,
      followingResult
    ] = await Promise.all([

      supabaseClient
        .from("follows")
        .select(
          "*",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "following_id",
          userId
        ),

      supabaseClient
        .from("follows")
        .select(
          "*",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "follower_id",
          userId
        )

    ]);

    if (followersResult.error) {
      throw followersResult.error;
    }

    if (followingResult.error) {
      throw followingResult.error;
    }

    state.profile.followers =
      followersResult.count || 0;

    state.profile.following =
      followingResult.count || 0;

    renderProfile();

  } catch (error) {

    console.error(
      "Erreur compteurs abonnements :",
      error
    );

  }
}


async function updateFollowButton(userId) {

  const button =
    $("#followBtn");

  if (
    !button ||
    !currentUser ||
    !userId
  ) {
    return;
  }

  if (
    userId === currentUser.id
  ) {
    button.hidden = true;
    return;
  }

  button.hidden = false;
  button.disabled = true;

  try {

    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select("is_private")
        .eq("id", userId)
        .single();

    if (profileError) {
      throw profileError;
    }


    const {
      data: follow,
      error: followError
    } =
      await supabaseClient
        .from("follows")
        .select("follower_id,following_id")
        .eq(
          "follower_id",
          currentUser.id
        )
        .eq(
          "following_id",
          userId
        )
        .maybeSingle();

    if (followError) {
      throw followError;
    }


    const {
      data: request,
      error: requestError
    } =
      await supabaseClient
        .from("follow_requests")
        .select("requester_id,target_id")
        .eq(
          "requester_id",
          currentUser.id
        )
        .eq(
          "target_id",
          userId
        )
        .maybeSingle();

    if (requestError) {
      throw requestError;
    }


    const isPrivate =
      profile?.is_private === true;


    if (follow) {

      button.dataset.followState =
        "following";

      button.textContent =
        "Abonné(e)";

      button.classList.add(
        "following"
      );

    } else if (request) {

      button.dataset.followState =
        "pending";

      button.textContent =
        "Demande envoyée";

      button.classList.add(
        "following"
      );

    } else {

      button.dataset.followState =
        "none";

      button.textContent =
        "S’abonner";

      button.classList.remove(
        "following"
      );

    }


    button.dataset.private =
      isPrivate
        ? "true"
        : "false";


  } catch (error) {

    console.error(
      "Erreur état abonnement :",
      error
    );

  } finally {

    button.disabled = false;

  }

}


async function toggleFollow() {

  const button =
    $("#followBtn");

  if (
    !button ||
    !currentUser ||
    !activeProfileId ||
    activeProfileId === currentUser.id
  ) {
    return;
  }

  button.disabled = true;

  try {

    const state =
      button.dataset.followState ||
      "none";

    const isPrivate =
      button.dataset.private ===
      "true";


    if (state === "following") {

      const {
        error
      } =
        await supabaseClient
          .from("follows")
          .delete()
          .eq(
            "follower_id",
            currentUser.id
          )
          .eq(
            "following_id",
            activeProfileId
          );

      if (error) {
        throw error;
      }

      toast(
        "Vous ne suivez plus ce compte"
      );

    } else if (state === "pending") {

      const {
        error
      } =
        await supabaseClient
          .from("follow_requests")
          .delete()
          .eq(
            "requester_id",
            currentUser.id
          )
          .eq(
            "target_id",
            activeProfileId
          );

      if (error) {
        throw error;
      }

      toast(
        "Demande annulée"
      );

    } else if (isPrivate) {

      const {
        error
      } =
        await supabaseClient
          .from("follow_requests")
          .insert({
            requester_id:
              currentUser.id,

            target_id:
              activeProfileId
          });

      if (error) {
        throw error;
      }

      toast(
        "Demande d’abonnement envoyée"
      );

    } else {

      const {
        error
      } =
        await supabaseClient
          .from("follows")
          .insert({
            follower_id:
              currentUser.id,

            following_id:
              activeProfileId
          });

      if (error) {
        throw error;
      }

      toast(
        "Vous suivez maintenant ce compte"
      );

    }


    await updateFollowButton(
      activeProfileId
    );

    await loadFollowCounts(
      activeProfileId
    );


  } catch (error) {

    console.error(
      "Erreur abonnement :",
      error
    );

    toast(
      "Impossible de modifier l’abonnement"
    );

  } finally {

    button.disabled = false;

  }

}


$("#followBtn")
  ?.addEventListener(
    "click",
    toggleFollow
  );


      /* =========================================================
LISTE ABONNÉS / ABONNEMENTS
========================================================= */

let followListUsers = [];


function renderFollowList(users) {

  const content =
    $("#followListContent");

  if (!content) {
    return;
  }

  content.innerHTML = "";


  if (!users.length) {

    content.innerHTML =
      `
      <div class="follow-list-empty">
        Aucun utilisateur trouvé
      </div>
      `;

    return;
  }


  users.forEach(
    profile => {

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "follow-list-item";


      const avatar =
        document.createElement(
          "div"
        );

      avatar.className =
        "follow-list-avatar";


      if (profile.avatar_url) {

        const img =
          document.createElement(
            "img"
          );

        img.src =
          profile.avatar_url;

        img.alt =
          profile.username || "";

        avatar.appendChild(
          img
        );

      } else {

        avatar.textContent =
          "👤";

      }


      const text =
        document.createElement(
          "div"
        );

      text.className =
        "follow-list-text";


      const username =
        document.createElement(
          "div"
        );

      username.className =
        "follow-list-username";

      username.textContent =
        profile.username ||
        "Utilisateur";


      const name =
        document.createElement(
          "div"
        );

      name.className =
        "follow-list-name";

      name.textContent =
        profile.name || "";


      text.appendChild(
        username
      );

      text.appendChild(
        name
      );


      row.appendChild(
        avatar
      );

      row.appendChild(
        text
      );


      row.addEventListener(
        "click",
        async () => {

          $("#followListPage").hidden =
            true;

          await openUserProfile(
            profile.id
          );

        }
      );


      content.appendChild(
        row
      );

    }
  );

}


async function openFollowList(type) {

  if (
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }


  const userId =
    activeProfileId ||
    currentUser.id;


  const page =
    $("#followListPage");

  const title =
    $("#followListTitle");

  const searchInput =
    $("#followListSearch");

  const content =
    $("#followListContent");


  if (
    !page ||
    !title ||
    !content
  ) {
    return;
  }


  const isFollowers =
    type === "followers";


  title.textContent =
    isFollowers
      ? "Abonnés"
      : "Abonnements";


  if (searchInput) {
    searchInput.value = "";
  }


  content.innerHTML =
    `
    <div class="follow-list-empty">
      Chargement...
    </div>
    `;


  page.hidden = false;


  try {

    let followResult;


    if (isFollowers) {

      followResult =
        await supabaseClient
          .from("follows")
          .select("follower_id")
          .eq(
            "following_id",
            userId
          );

    } else {

      followResult =
        await supabaseClient
          .from("follows")
          .select("following_id")
          .eq(
            "follower_id",
            userId
          );

    }


    if (followResult.error) {
      throw followResult.error;
    }


    const ids =
      (followResult.data || [])
        .map(
          item =>
            isFollowers
              ? item.follower_id
              : item.following_id
        )
        .filter(Boolean);


    if (!ids.length) {

      followListUsers = [];

      content.innerHTML =
        `
        <div class="follow-list-empty">
          ${
            isFollowers
              ? "Aucun abonné pour le moment"
              : "Aucun abonnement pour le moment"
          }
        </div>
        `;

      return;
    }


    const {
      data: profiles,
      error: profilesError
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,name,avatar_url"
        )
        .in(
          "id",
          ids
        );


    if (profilesError) {
      throw profilesError;
    }


    const profileMap =
      new Map(
        (profiles || []).map(
          profile => [
            profile.id,
            profile
          ]
        )
      );


    followListUsers =
      ids
        .map(
          id =>
            profileMap.get(id)
        )
        .filter(Boolean);


    renderFollowList(
      followListUsers
    );


  } catch (error) {

    console.error(
      "Erreur liste abonnements :",
      error
    );

    content.innerHTML =
      `
      <div class="follow-list-empty">
        Impossible de charger la liste
      </div>
      `;

  }

}


$("#followersBtn")
  ?.addEventListener(
    "click",
    () => {

      openFollowList(
        "followers"
      );

    }
  );


$("#followingBtn")
  ?.addEventListener(
    "click",
    () => {

      openFollowList(
        "following"
      );

    }
  );


$("#followListBack")
  ?.addEventListener(
    "click",
    () => {

      const page =
        $("#followListPage");

      if (page) {
        page.hidden = true;
      }

    }
  );


$("#followListSearch")
  ?.addEventListener(
    "input",
    event => {

      const query =
        event.target.value
          .trim()
          .toLowerCase();


      if (!query) {

        renderFollowList(
          followListUsers
        );

        return;
      }


      const filtered =
        followListUsers.filter(
          profile => {

            const username =
              (
                profile.username ||
                ""
              ).toLowerCase();

            const name =
              (
                profile.name ||
                ""
              ).toLowerCase();


            return (
              username.includes(
                query
              ) ||
              name.includes(
                query
              )
            );

          }
        );


      renderFollowList(
        filtered
      );

    }
  );
/* =========================================================
RECHERCHE UTILISATEURS
========================================================= */

let viewingOtherProfile =
  false;
let activeProfileId =
  null;

function setOwnerMode(
  isOwner
) {

  const addPostBtn =
    $("#addPostBtn");

  const bottomAddPostBtn =
    $("#bottomAddPostBtn");

  const editProfileBtn =
    $("#editProfileBtn");

  const coverEdit =
    $(".cover-edit");

  const avatarPlus =
    $(".avatar-plus");

  const avatarWrap =
    $(".avatar-wrap");
const followBtn =
  $("#followBtn");

  if (addPostBtn) {

    addPostBtn
      .style.display =
      isOwner
        ? ""
        : "none";

  }


  if (
    bottomAddPostBtn
  ) {

    bottomAddPostBtn
      .style.visibility =
      isOwner
        ? "visible"
        : "hidden";

  }


  if (editProfileBtn) {

    editProfileBtn
      .style.display =
      isOwner
        ? ""
        : "none";

  }


  if (coverEdit) {

    coverEdit
      .style.display =
      isOwner
        ? ""
        : "none";

  }


  if (avatarPlus) {

    avatarPlus
      .style.display =
      isOwner
        ? ""
        : "none";

  }


  if (avatarWrap) {

    avatarWrap
      .style.pointerEvents =
      isOwner
        ? ""
        : "none";

  }
if (followBtn) {
  followBtn.hidden =
    isOwner;
    }
}


async function searchUsers(
  query
) {

  if (!supabaseReady()) {
    return;
  }


  const resultsBox =
    $("#userSearchResults");


  if (!resultsBox) {
    return;
  }


  const search =
    query.trim();


  if (
    search.length <
    2
  ) {

    resultsBox.innerHTML =
      "";

    resultsBox
      .classList
      .remove(
        "show"
      );

    return;

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,name,avatar_url"
        )
        .or(
          `username.ilike.%${search}%,name.ilike.%${search}%`
        )
        .limit(
          20
        );


    if (error) {
      throw error;
    }


    resultsBox.innerHTML =
      "";


    if (
      !data ||
      data.length ===
        0
    ) {

      resultsBox.innerHTML =
        `
        <div class="search-empty">
          Aucun utilisateur trouvé
        </div>
        `;


      resultsBox
        .classList
        .add(
          "show"
        );


      return;
    }


    data.forEach(
      profile => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "user-result";


        const avatar =
          document.createElement(
            "div"
          );


        avatar.className =
          "user-result-avatar";


        if (
          profile.avatar_url
        ) {

          const img =
            document.createElement(
              "img"
            );


          img.src =
            profile.avatar_url;


          img.alt =
            profile.username ||
            "";


          avatar.appendChild(
            img
          );


        } else {

          avatar.textContent =
            "👤";

        }


        const text =
          document.createElement(
            "div"
          );


        text.className =
          "user-result-text";


        const username =
          document.createElement(
            "div"
          );


        username.className =
          "user-result-username";


        username.textContent =
          profile.username ||
          "Utilisateur";


        const name =
          document.createElement(
            "div"
          );


        name.className =
          "user-result-name";


        name.textContent =
          profile.name ||
          "";


        text.appendChild(
          username
        );


        text.appendChild(
          name
        );


        row.appendChild(
          avatar
        );


        row.appendChild(
          text
        );


        row.addEventListener(
          "click",
          async () => {

            await openUserProfile(
              profile.id
            );

          }
        );


        resultsBox.appendChild(
          row
        );

      }
    );


    resultsBox
      .classList
      .add(
        "show"
      );


  } catch (error) {

    console.error(
      "Erreur recherche utilisateurs :",
      error
    );


    resultsBox.innerHTML =
      `
      <div class="search-empty">
        Erreur pendant la recherche
      </div>
      `;


    resultsBox
      .classList
      .add(
        "show"
      );

  }

}


async function openUserProfile(
  userId
) {

  if (!supabaseReady()) {
    return;
  }


  try {

    const profileResult =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,name,bio,link,avatar_url,cover_url"
        )
        .eq(
          "id",
          userId
        )
        .single();


    if (
      profileResult.error
    ) {
      throw profileResult.error;
    }


    const postsResult =
      await supabaseClient
        .from("posts")
        .select(
          "id,user_id,type,source_type,media_url,caption,likes"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "id",
          {
            ascending:
              false
          }
        );


    if (
      postsResult.error
    ) {
      throw postsResult.error;
    }


    const profile =
      profileResult.data;


    viewingOtherProfile =
      userId !==
      currentUser?.id;
activeProfileId =
  userId;

    state.profile.name =
      profile.name ||
      "";


    state.profile.username =
      profile.username ||
      "";


    state.profile.bio =
      profile.bio ||
      "";


    state.profile.link =
      profile.link ||
      "";


    state.customMedia.avatar =
      profile.avatar_url ||
      "";


    state.customMedia.cover =
      profile.cover_url ||
      "";


    state.posts =
      (
        postsResult.data ||
        []
      ).map(
        post => ({

          id:
            post.id,

          type:
            post.type ||
            "image",
sourceType:
  post.source_type ||
  "upload",
          src:
            post.media_url,

          caption:
            post.caption ||
            "",

          likes:
            post.likes ||
            0

        })
      );
const postIds =
  state.posts.map(
    post => post.id
  );

if (postIds.length) {

  const {
    data: likesData,
    error: likesError
  } =
    await supabaseClient
      .from("post_likes")
      .select("post_id,user_id")
      .in("post_id", postIds);

  if (likesError) {
    throw likesError;
  }

  state.posts.forEach(
    post => {

      post.likes =
        (likesData || [])
          .filter(
            like =>
              like.post_id == post.id
          )
          .length;

      state.liked[post.id] =
        (likesData || [])
          .some(
            like =>
              like.post_id == post.id &&
              like.user_id === currentUser.id
          );

    }
  );

}

    renderProfile();

    restoreMedia();

    renderGrid();


    setOwnerMode(
      !viewingOtherProfile
    );
await loadFollowCounts(
  userId
);

await updateFollowButton(
  userId
);
const emptyState =
  $("#emptyState");

const followButton =
  $("#followBtn");

if (emptyState) {

  const privateLocked =
    viewingOtherProfile &&
    followButton?.dataset.private ===
      "true" &&
    followButton?.dataset.followState !==
      "following";

  if (privateLocked) {

    emptyState.innerHTML =
      `
      <div class="private-profile-message">
        <div class="private-profile-lock">
          🔒
        </div>

        <strong>
          Ce compte est privé
        </strong>

        <span>
          Abonnez-vous à ce compte pour voir ses photos et vidéos.
        </span>
      </div>
      `;

    emptyState.style.display =
      "block";

  } else {

    emptyState.textContent =
      "Aucune publication.";

  }

}
    const resultsBox =
      $("#userSearchResults");


    if (resultsBox) {

      resultsBox.innerHTML =
        "";


      if (
        viewingOtherProfile
      ) {

        const back =
          document.createElement(
            "button"
          );


        back.type =
          "button";


        back.className =
          "back-profile-btn";


        back.textContent =
          "← Revenir à mon profil";


        back.addEventListener(
          "click",
          returnToOwnProfile
        );


        resultsBox.appendChild(
          back
        );


        resultsBox
          .classList
          .add(
            "show"
          );

      }

    }


    window.scrollTo({
      top:
        0,

      behavior:
        "smooth"
    });


  } catch (error) {

    console.error(
      "Erreur ouverture profil :",
      error
    );


    toast(
      "Impossible d'ouvrir ce profil"
    );

  }

}


async function returnToOwnProfile() {

  if (!currentUser) {
    return;
  }


  viewingOtherProfile =
    false;
activeProfileId =
  currentUser.id;

  setOwnerMode(
    true
  );


  await loadUserProfile();

  await loadSupabasePosts();


  const input =
    $("#userSearchInput");


  const results =
    $("#userSearchResults");


  if (input) {

    input.value =
      "";

  }


  if (results) {

    results.innerHTML =
      "";

    results
      .classList
      .remove(
        "show"
      );

  }


  window.scrollTo({
    top:
      0,

    behavior:
      "smooth"
  });

}


let searchTimer =
  null;


$("#userSearchInput")
  ?.addEventListener(
    "input",
    event => {

      clearTimeout(
        searchTimer
      );


      const value =
        event.target.value;


      searchTimer =
        setTimeout(
          () => {

            searchUsers(
              value
            );

          },
          300
        );

    }
  );

/* =========================================================
EXPLORER
========================================================= */

let explorePosts = [];

async function loadExplorePosts() {

  if (
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }

  const grid =
    $("#exploreGrid");

  const empty =
    $("#exploreEmpty");

  if (!grid) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("posts")
        .select(
          "id,user_id,type,source_type,media_url,caption,likes"
        )
        .order(
          "id",
          {
            ascending: false
          }
        )
        .limit(100);

    if (error) {
      throw error;
    }

    explorePosts =
      (data || []).map(
        post => ({
          id: post.id,
          userId: post.user_id,
          type:
            post.type || "image",
          
            sourceType:
  post.source_type ||
  "upload",
          src:
            post.media_url,
          caption:
            post.caption || "",
          likes:
            post.likes || 0
        })
      );

    renderExploreGrid(
      explorePosts
    );

    if (empty) {
      empty.style.display =
        explorePosts.length
          ? "none"
          : "block";
    }

  } catch (error) {

    console.error(
      "Erreur chargement Explorer :",
      error
    );

    grid.innerHTML = "";

    if (empty) {
      empty.style.display =
        "block";
    }

    toast(
      "Impossible de charger Explorer"
    );
  }
}


function renderExploreGrid(posts) {

  const grid =
    $("#exploreGrid");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  posts.forEach(
    post => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "explore-post";

      card.dataset.id =
        post.id;

      const media =
        mediaElement(
          post
        );

      card.appendChild(
        media
      );
if (
  media.tagName === "IFRAME"
) {
  media.style.pointerEvents =
    "none";
}
      if (
        post.type === "video"
      ) {

        const icon =
          document.createElement(
            "span"
          );

        icon.className =
          "explore-video-icon";

        icon.textContent =
          "▶";

        card.appendChild(
          icon
        );

        if (
  media.tagName ===
  "VIDEO"
) {

  media.muted = true;
  media.loop = true;
  media.autoplay = true;
  media.playsInline = true;

  media
    .play()
    .catch(() => {});

  }

}
      card.addEventListener(
  "click",
  async () => {

    await openReels(
      post,
      post.type === "video"
    );

  }
);

      grid.appendChild(
        card
      );
    }
  );

  requestAnimationFrame(
    playExploreVideos
  );
}


function playExploreVideos() {

  $$("#exploreGrid video")
    .forEach(
      video => {

        video.muted = true;
        video.loop = true;
        video.playsInline = true;

        video
          .play()
          .catch(() => {});

      }
    );
}


async function showExploreInterface() {

  saveCurrentView(
    "explore"
  );

  const profilePage =
    $("#profilePage");

  const profileSearch =
    $("#profileSearchSection");

  const explorePage =
    $("#explorePage");

  const homeFeedPage =
    $("#homeFeedPage");

  const messagesPage =
    $("#messagesPage");

  const notificationsPage =
    $("#notificationsPage");

  const followListPage =
  $("#followListPage");

  const topbar =
    $(".topbar");


  if (homeFeedPage) {
    homeFeedPage.hidden = true;
  }

  if (messagesPage) {
    messagesPage.hidden = true;
  }

  if (notificationsPage) {
    notificationsPage.hidden = true;
  }

  if (followListPage) {
    followListPage.hidden = true;
  }

  if (profilePage) {
    profilePage.hidden = true;
  }

  if (profileSearch) {
    profileSearch.hidden = true;
  }

  if (topbar) {
    topbar.style.display =
      "none";
  }

  if (explorePage) {
    explorePage.hidden = false;
  }

  $$(".bottom-nav-btn")
    .forEach(
      button => {
        button.classList.remove(
          "active"
        );
      }
    );

  $("#bottomSearchBtn")
    ?.classList
    .add(
      "active"
    );

  await loadExplorePosts();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function showProfileInterface() {
  
saveCurrentView(
  "profile"
);
  
  const profilePage =
    $("#profilePage");

  const profileSearch =
    $("#profileSearchSection");

  const explorePage =
    $("#explorePage");

  const topbar =
    $(".topbar");

  if (explorePage) {
    explorePage.hidden = true;
  }

  if (profilePage) {
    profilePage.hidden = false;
  }

  if (profileSearch) {
    profileSearch.hidden = false;
  }

  if (topbar) {
    topbar.style.display =
      "";
  }

  $$(".bottom-nav-btn")
    .forEach(
      button => {
        button.classList.remove(
          "active"
        );
      }
    );

  $("#bottomProfileBtn")
    ?.classList
    .add(
      "active"
    );
}
/* =========================================================
RECHERCHE EXPLORER
========================================================= */

let exploreSearchTimer = null;


async function searchExplore(query) {

  if (!supabaseReady()) {
    return;
  }

  const resultsBox =
    $("#exploreSearchResults");

  if (!resultsBox) {
    return;
  }

  const search =
    query.trim();


  /* AUCUNE RECHERCHE */
  if (!search) {

    resultsBox.innerHTML = "";

    resultsBox.classList.remove(
      "show"
    );

    renderExploreGrid(
      explorePosts
    );

    return;
  }


  /* =====================================================
  RECHERCHE HASHTAG
  ===================================================== */

  if (search.startsWith("#")) {

    const tag =
      search
        .replace(/^#+/, "")
        .trim();


    if (!tag) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("posts")
          .select(
  "id,user_id,type,source_type,media_url,caption,likes"
)
          .ilike(
            "caption",
            `%#${tag}%`
          )
          .order(
            "id",
            {
              ascending: false
            }
          )
          .limit(100);


      if (error) {
        throw error;
      }


      const hashtagPosts =
        (data || []).map(
          post => ({
            id:
              post.id,

            userId:
              post.user_id,

            type:
              post.type ||
              "image",
sourceType:
  post.source_type ||
  "upload",
            src:
              post.media_url,

            caption:
              post.caption ||
              "",

            likes:
              post.likes ||
              0
          })
        );


      resultsBox.innerHTML =
        `
        <div class="explore-hashtag-result">
          #${tag}
          <span>
            ${hashtagPosts.length} publication(s)
          </span>
        </div>
        `;


      resultsBox.classList.add(
        "show"
      );


      renderExploreGrid(
        hashtagPosts
      );


    } catch (error) {

      console.error(
        "Erreur recherche hashtag :",
        error
      );

    }


    return;
  }


  /* =====================================================
  RECHERCHE UTILISATEURS
  ===================================================== */

  if (search.length < 2) {

    resultsBox.innerHTML = "";

    resultsBox.classList.remove(
      "show"
    );

    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,name,avatar_url"
        )
        .or(
          `username.ilike.%${search}%,name.ilike.%${search}%`
        )
        .limit(20);


    if (error) {
      throw error;
    }


    resultsBox.innerHTML = "";


    if (
      !data ||
      data.length === 0
    ) {

      resultsBox.innerHTML =
        `
        <div class="search-empty">
          Aucun utilisateur trouvé
        </div>
        `;

      resultsBox.classList.add(
        "show"
      );

      return;
    }


    data.forEach(
      profile => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "explore-user-result";


        const avatar =
          document.createElement(
            "div"
          );


        avatar.className =
          "explore-user-avatar";


        if (profile.avatar_url) {

          const img =
            document.createElement(
              "img"
            );

          img.src =
            profile.avatar_url;

          img.alt =
            profile.username ||
            "";

          avatar.appendChild(
            img
          );

        } else {

          avatar.textContent =
            "👤";

        }


        const text =
          document.createElement(
            "div"
          );


        text.className =
          "explore-user-text";


        const username =
          document.createElement(
            "div"
          );


        username.className =
          "explore-user-username";


        username.textContent =
          profile.username ||
          "Utilisateur";


        const name =
          document.createElement(
            "div"
          );


        name.className =
          "explore-user-name";


        name.textContent =
          profile.name ||
          "";


        text.appendChild(
          username
        );

        text.appendChild(
          name
        );


        row.appendChild(
          avatar
        );

        row.appendChild(
          text
        );


        row.addEventListener(
          "click",
          async () => {

            await showProfileInterface();

            await openUserProfile(
              profile.id
            );

          }
        );


        resultsBox.appendChild(
          row
        );

      }
    );


    resultsBox.classList.add(
      "show"
    );


  } catch (error) {

    console.error(
      "Erreur recherche Explorer :",
      error
    );

  }

}


$("#exploreSearchInput")
  ?.addEventListener(
    "input",
    event => {

      clearTimeout(
        exploreSearchTimer
      );


      const value =
        event.target.value;


      exploreSearchTimer =
        setTimeout(
          () => {

            searchExplore(
              value
            );

          },
          300
        );

    }
  );
/* =========================================================
FIL D'ACTUALITÉ
========================================================= */

let homeFeedPosts = [];
let homeFeedProfiles = new Map();


async function loadHomeFeed() {

  if (
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }

  const feed =
    $("#homeFeed");

  const stories =
    $("#homeStories");

  const empty =
    $("#homeFeedEmpty");

  if (
    !feed ||
    !stories
  ) {
    return;
  }


  feed.innerHTML = "";
  stories.innerHTML = "";

  if (empty) {
    empty.hidden = true;
  }


  try {

    const {
      data: follows,
      error: followsError
    } =
      await supabaseClient
        .from("follows")
        .select("following_id")
        .eq(
          "follower_id",
          currentUser.id
        );

    if (followsError) {
      throw followsError;
    }


    const followingIds =
      (follows || [])
        .map(
          row =>
            row.following_id
        )
        .filter(Boolean);


    if (!followingIds.length) {

      if (empty) {
        empty.hidden = false;
        empty.textContent =
          "Vous ne suivez encore aucun compte.";
      }

      return;
    }


    const {
      data: profiles,
      error: profilesError
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,name,avatar_url"
        )
        .in(
          "id",
          followingIds
        );

    if (profilesError) {
      throw profilesError;
    }


    homeFeedProfiles =
      new Map(
        (profiles || []).map(
          profile => [
            profile.id,
            profile
          ]
        )
      );


    followingIds.forEach(
      id => {

        const profile =
          homeFeedProfiles.get(id);

        if (!profile) {
          return;
        }


        const story =
          document.createElement(
            "div"
          );

        story.className =
          "home-story";


        const ring =
          document.createElement(
            "div"
          );

        ring.className =
          "home-story-ring";


        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "home-story-avatar";


        if (profile.avatar_url) {

          const img =
            document.createElement(
              "img"
            );

          img.src =
            profile.avatar_url;

          img.alt =
            profile.username ||
            "";

          avatar.appendChild(
            img
          );

        } else {

          avatar.textContent =
            "👤";

        }


        const name =
          document.createElement(
            "div"
          );

        name.className =
          "home-story-name";

        name.textContent =
          profile.username ||
          "Utilisateur";


        ring.appendChild(
          avatar
        );

        story.appendChild(
          ring
        );

        story.appendChild(
          name
        );


        story.addEventListener(
          "click",
          async () => {

            await showProfileInterface();

            await openUserProfile(
              profile.id
            );

          }
        );


        stories.appendChild(
          story
        );

      }
    );


    const {
      data: posts,
      error: postsError
    } =
      await supabaseClient
        .from("posts")
        .select(
         
  "id,user_id,type,source_type,media_url,caption,likes"
)
        .in(
          "user_id",
          followingIds
        )
        .order(
          "id",
          {
            ascending: false
          }
        )
        .limit(100);

    if (postsError) {
      throw postsError;
    }


    homeFeedPosts =
      (posts || []).map(
        post => ({
          id:
            post.id,

          userId:
            post.user_id,

          type:
  post.type ||
  "image",

sourceType:
  post.source_type ||
  "upload",

src:
  post.media_url,

          caption:
            post.caption ||
            "",

          likes:
            0
        })
      );


    const postIds =
      homeFeedPosts.map(
        post => post.id
      );


    let likesData = [];


    if (postIds.length) {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("post_likes")
          .select(
            "post_id,user_id"
          )
          .in(
            "post_id",
            postIds
          );

      if (error) {
        throw error;
      }


      likesData =
        data || [];


      homeFeedPosts.forEach(
        post => {

          post.likes =
            likesData.filter(
              like =>
                like.post_id ==
                post.id
            ).length;

        }
      );

    }


    if (!homeFeedPosts.length) {

      if (empty) {
        empty.hidden = false;
        empty.textContent =
          "Aucune publication pour le moment.";
      }

      return;
    }


    homeFeedPosts.forEach(
      post => {

        const profile =
          homeFeedProfiles.get(
            post.userId
          );

        const article =
          document.createElement(
            "article"
          );

        article.className =
          "feed-post";


        const mediaWrap =
          document.createElement(
            "div"
          );

        mediaWrap.className =
          "feed-post-media-wrap";


        const media =
          mediaElement(
            post
          );

        mediaWrap.appendChild(
          media
        );


        const top =
          document.createElement(
            "div"
          );

        top.className =
          "feed-post-top";


        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "feed-post-avatar";


        if (profile?.avatar_url) {

          const img =
            document.createElement(
              "img"
            );

          img.src =
            profile.avatar_url;

          img.alt =
            profile.username ||
            "";

          avatar.appendChild(
            img
          );

        } else {

          avatar.textContent =
            "👤";

        }


        const userBox =
          document.createElement(
            "div"
          );

        userBox.className =
          "feed-post-user";


        const username =
          document.createElement(
            "div"
          );

        username.className =
          "feed-post-username";

        username.textContent =
          profile?.username ||
          "Utilisateur";


        const audio =
          document.createElement(
            "div"
          );

        audio.className =
          "feed-post-audio";

        audio.textContent =
          post.type === "video"
            ? "♫ Audio d’origine"
            : "";


        userBox.appendChild(
          username
        );

        userBox.appendChild(
          audio
        );


        const menu =
          document.createElement(
            "button"
          );

        menu.className =
          "feed-post-menu";

        menu.type =
          "button";

        menu.textContent =
          "⋯";


        top.appendChild(
          avatar
        );

        top.appendChild(
          userBox
        );

        top.appendChild(
          menu
        );


        top.addEventListener(
          "click",
          async () => {

            if (!post.userId) {
              return;
            }

            await showProfileInterface();

            await openUserProfile(
              post.userId
            );

          }
        );


        mediaWrap.appendChild(
          top
        );


        if (
  post.type === "video"
) {

  /* VIDEO NORMALE */

  if (
    media.tagName ===
    "VIDEO"
  ) {

    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.autoplay = true;

    media
      .play()
      .catch(() => {});


    media.addEventListener(
      "click",
      () => {

        openReels(
          post
        );

      }
    );


    const soundButton =
      document.createElement(
        "button"
      );

    soundButton.type =
      "button";

    soundButton.className =
      "feed-sound-btn";


    function updateSoundIcon() {

      soundButton.innerHTML =
        media.muted
          ? `
            <svg viewBox="0 0 24 24">
              <path d="M4 10v4h4l5 4V6L8 10H4z"></path>
              <path d="M17 9l4 6"></path>
              <path d="M21 9l-4 6"></path>
            </svg>
          `
          : `
            <svg viewBox="0 0 24 24">
              <path d="M4 10v4h4l5 4V6L8 10H4z"></path>
              <path d="M16 9c1 1 1 5 0 6"></path>
              <path d="M19 7c2 3 2 7 0 10"></path>
            </svg>
          `;

    }


    updateSoundIcon();


    soundButton.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        media.muted =
          !media.muted;

        updateSoundIcon();

        media
          .play()
          .catch(() => {});

      }
    );


    mediaWrap.appendChild(
      soundButton
    );

  }


  /* VIDEO IFRAME */

  else if (
    media.tagName ===
    "IFRAME"
  ) {

    media.style.pointerEvents =
      "none";


    const openEmbedButton =
      document.createElement(
        "button"
      );

    openEmbedButton.type =
      "button";

    openEmbedButton.className =
      "feed-embed-open";

    openEmbedButton.setAttribute(
      "aria-label",
      "Ouvrir la vidéo"
    );


    openEmbedButton.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        openReels(
          post
        );

      }
    );


    mediaWrap.appendChild(
      openEmbedButton
    );

  }

}

  
        const actions =
          document.createElement(
            "div"
          );

        actions.className =
          "feed-post-actions";


        const likeBtn =
          document.createElement(
            "button"
          );

        likeBtn.className =
          "feed-action-btn";

        likeBtn.type =
          "button";

        likeBtn.innerHTML =
          `♡ <span>${formatLikes(post.likes)}</span>`;


        likeBtn.addEventListener(
          "click",
          async () => {

            await like(
              post.id,
              false
            );

            const total =
              await refreshPostLikes(
                post.id
              );

            post.likes =
              total;

            likeBtn.innerHTML =
              `♡ <span>${formatLikes(total)}</span>`;

          }
        );


        const commentBtn =
          document.createElement(
            "button"
          );

        commentBtn.className =
          "feed-action-btn";

        commentBtn.type =
          "button";

        commentBtn.innerHTML =
          `◯ <span>0</span>`;


        const shareBtn =
          document.createElement(
            "button"
          );

        shareBtn.className =
          "feed-action-btn";

        shareBtn.type =
          "button";

        shareBtn.textContent =
          "↗";


        shareBtn.addEventListener(
          "click",
          async () => {

            try {

              await navigator.clipboard
                .writeText(
                  location.href
                );

              toast(
                "Lien copié"
              );

            } catch {

              toast(
                "Impossible de copier le lien"
              );

            }

          }
        );


        


        actions.appendChild(
          likeBtn
        );

        actions.appendChild(
          commentBtn
        );

        actions.appendChild(
          shareBtn
        );

        


        const caption =
          document.createElement(
            "div"
          );

        caption.className =
          "feed-post-caption";


        if (post.caption) {

          const strong =
            document.createElement(
              "strong"
            );

          strong.textContent =
            profile?.username ||
            "Utilisateur";

          caption.appendChild(
            strong
          );

          caption.appendChild(
            document.createTextNode(
              post.caption
            )
          );

        }


        article.appendChild(
          mediaWrap
        );

        article.appendChild(
          actions
        );

        article.appendChild(
          caption
        );


        feed.appendChild(
          article
        );

      }
    );


  } catch (error) {

    console.error(
      "Erreur fil actualité :",
      error
    );

    if (empty) {
      empty.hidden = false;
      empty.textContent =
        "Impossible de charger le fil d’actualité.";
    }

  }

}


async function showHomeFeed() {
  
saveCurrentView(
  "home"
);
  
  const profilePage =
    $("#profilePage");

  const explorePage =
    $("#explorePage");

  const homeFeedPage =
    $("#homeFeedPage");

  const topbar =
    $(".topbar");


  if (profilePage) {
    profilePage.hidden = true;
  }

  if (explorePage) {
    explorePage.hidden = true;
  }

  const followListPage =
    $("#followListPage");

  if (followListPage) {
    followListPage.hidden = true;
  }


  if (topbar) {
    topbar.style.display =
      "none";
  }

  if (homeFeedPage) {
    homeFeedPage.hidden = false;
  }


  $$(".bottom-nav-btn")
    .forEach(
      button => {

        button.classList.remove(
          "active"
        );

      }
    );


  $("#bottomHomeBtn")
    ?.classList
    .add(
      "active"
    );


  await loadHomeFeed();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}
/* =========================================================
PAGE NOTIFICATIONS
========================================================= */

let notificationsRealtimeChannel =
  null;


async function refreshNotificationBadge() {

  const badge =
    $("#notificationBadge");


  if (
    !badge ||
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }


  try {

    const {
      count,
      error
    } =
      await supabaseClient
        .from("notifications")
        .select(
          "id",
          {
            count:"exact",
            head:true
          }
        )
        .eq(
          "recipient_id",
          currentUser.id
        )
        .eq(
          "is_read",
          false
        );


    if (error) {
      throw error;
    }


    const total =
      count || 0;


    if (total === 0) {

      badge.hidden =
        true;

      badge.textContent =
        "0";

      return;
    }


    badge.hidden =
      false;


    badge.textContent =
      total > 99
        ? "99+"
        : String(total);


  } catch (error) {

    console.error(
      "Erreur compteur notifications :",
      error
    );

  }

}


function stopNotificationsRealtime() {

  if (
    notificationsRealtimeChannel &&
    supabaseClient
  ) {

    supabaseClient.removeChannel(
      notificationsRealtimeChannel
    );

  }


  notificationsRealtimeChannel =
    null;

}


function startNotificationsRealtime() {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }


  stopNotificationsRealtime();


  refreshNotificationBadge();


  notificationsRealtimeChannel =
    supabaseClient
      .channel(
        "notifications-" +
        currentUser.id +
        "-" +
        Date.now()
      )
      .on(
        "postgres_changes",

        {
          event:"INSERT",

          schema:"public",

          table:"notifications",

          filter:
            `recipient_id=eq.${currentUser.id}`
        },

        payload => {

          console.log(
            "Nouvelle notification :",
            payload
          );


          refreshNotificationBadge();

        }
      )
      .subscribe();

}


async function markAllNotificationsRead() {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }


  try {

    const {
      error
    } =
      await supabaseClient
        .from("notifications")
        .update({
          is_read:true
        })
        .eq(
          "recipient_id",
          currentUser.id
        )
        .eq(
          "is_read",
          false
        );


    if (error) {
      throw error;
    }


    await refreshNotificationBadge();


  } catch (error) {

    console.error(
      "Erreur lecture notifications :",
      error
    );

  }

}

        async function loadNotifications() {

  if (
    !supabaseReady() ||
    !currentUser
  ) {
    return;
  }

  const list =
    $("#notificationsList");

  const empty =
    $("#notificationsEmpty");

  if (!list || !empty) {
    return;
  }

  list.innerHTML = "";
  empty.hidden = true;

  try {

    /* CHARGER LES NOTIFICATIONS */

    const {
      data: notifications,
      error
    } =
      await supabaseClient
        .from("notifications")
        .select(
          "id,recipient_id,actor_id,post_id,type,message,is_read,created_at"
        )
        .eq(
          "recipient_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(100);

    if (error) {

      console.error(
        "Erreur requête notifications :",
        error
      );

      throw error;
    }


    if (
      !notifications ||
      notifications.length === 0
    ) {

      empty.textContent =
        "Aucune notification pour le moment.";

      empty.hidden = false;

      return;
    }


    /* CHARGER LES PROFILS */

    const actorIds =
      [
        ...new Set(
          notifications
            .map(
              notification =>
                notification.actor_id
            )
            .filter(Boolean)
        )
      ];

    let profiles = [];


    if (actorIds.length) {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("profiles")
          .select(
            "id,username,name,avatar_url"
          )
          .in(
            "id",
            actorIds
          );


      if (error) {

        console.error(
          "Erreur profils notifications :",
          error
        );

      } else {

        profiles =
          data || [];

      }

    }


    /* CHARGER LES PUBLICATIONS */

    const postIds =
      [
        ...new Set(
          notifications
            .map(
              notification =>
                notification.post_id
            )
            .filter(Boolean)
        )
      ];

    let posts = [];


    if (postIds.length) {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("posts")
.select(
  "id,user_id,type,source_type,media_url,caption"
)
          .in(
            "id",
            postIds
          );


      if (error) {

        console.error(
          "Erreur publications notifications :",
          error
        );

      } else {

        posts =
          data || [];

      }

    }


    const profilesMap =
      new Map(
        profiles.map(
          profile => [
            profile.id,
            profile
          ]
        )
      );


    const postsMap =
      new Map(
        posts.map(
          post => [
            String(post.id),
            post
          ]
        )
      );


    /* AFFICHER LES NOTIFICATIONS */

    notifications.forEach(
      notification => {

        const profile =
          profilesMap.get(
            notification.actor_id
          );


        const post =
          postsMap.get(
            String(
              notification.post_id
            )
          );


        const item =
          document.createElement(
            "div"
          );

        item.className =
          "notification-item";


        if (!notification.is_read) {

          item.classList.add(
            "unread"
          );

        }


        /* AVATAR */

        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "notification-avatar";


        if (profile?.avatar_url) {

          const img =
            document.createElement(
              "img"
            );

          img.src =
            profile.avatar_url;

          img.alt =
            profile.username ||
            "";

          avatar.appendChild(
            img
          );

        } else {

          avatar.textContent =
            "👤";

        }


        /* TEXTE */

        const text =
          document.createElement(
            "div"
          );

        text.className =
          "notification-text";


        const username =
          document.createElement(
            "span"
          );

        username.className =
          "notification-username";

        username.textContent =
          profile?.username ||
          "Utilisateur";


        const message =
          document.createElement(
            "span"
          );

        message.textContent =
          " " +
          (
            notification.message ||
            (
              notification.type ===
                "comment"

                ? "a commenté votre publication"

                : "a aimé votre publication"
            )
          );


        text.appendChild(
          username
        );

        text.appendChild(
          message
        );


        /* MINIATURE PUBLICATION */

        item.appendChild(
  avatar
);

item.appendChild(
  text
);


/* DEMANDE D'ABONNEMENT */

if (
  notification.type ===
  "follow_request"
) {

  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "notification-request-actions";


  const acceptButton =
    document.createElement(
      "button"
    );

  acceptButton.type =
    "button";

  acceptButton.className =
    "notification-request-accept";

  acceptButton.textContent =
    "Accepter";


  const deleteButton =
    document.createElement(
      "button"
    );

  deleteButton.type =
    "button";

  deleteButton.className =
    "notification-request-delete";

  deleteButton.textContent =
    "Supprimer";


  acceptButton.addEventListener(
    "click",
    async event => {

      event.stopPropagation();

      acceptButton.disabled =
        true;

      deleteButton.disabled =
        true;

      try {

        const {
          error
        } =
          await supabaseClient.rpc(
            "accept_follow_request",
            {
              p_requester:
                notification.actor_id
            }
          );

        if (error) {
          throw error;
        }


        await supabaseClient
          .from("notifications")
          .delete()
          .eq(
            "id",
            notification.id
          );


        toast(
          "Demande acceptée"
        );

        await loadNotifications();

        await refreshNotificationBadge();


      } catch (error) {

        console.error(
          "Erreur acceptation demande :",
          error
        );

        toast(
          "Impossible d’accepter la demande"
        );

        acceptButton.disabled =
          false;

        deleteButton.disabled =
          false;

      }

    }
  );


  deleteButton.addEventListener(
    "click",
    async event => {

      event.stopPropagation();

      acceptButton.disabled =
        true;

      deleteButton.disabled =
        true;

      try {

        const {
          error
        } =
          await supabaseClient.rpc(
            "reject_follow_request",
            {
              p_requester:
                notification.actor_id
            }
          );

        if (error) {
          throw error;
        }


        await supabaseClient
          .from("notifications")
          .delete()
          .eq(
            "id",
            notification.id
          );


        toast(
          "Demande supprimée"
        );

        await loadNotifications();

        await refreshNotificationBadge();


      } catch (error) {

        console.error(
          "Erreur suppression demande :",
          error
        );

        toast(
          "Impossible de supprimer la demande"
        );

        acceptButton.disabled =
          false;

        deleteButton.disabled =
          false;

      }

    }
  );


  actions.appendChild(
    acceptButton
  );

  actions.appendChild(
    deleteButton
  );

  item.appendChild(
    actions
  );

}


/* AUTRES NOTIFICATIONS */

else {

  const cover =
    document.createElement(
      "div"
    );

  cover.className =
    "notification-post-cover";


  if (post?.media_url) {

    if (
      post.type ===
      "video"
    ) {

      const video =
        document.createElement(
          "video"
        );

      video.src =
        post.media_url;

      video.muted =
        true;

      video.playsInline =
        true;

      video.preload =
        "metadata";

      cover.appendChild(
        video
      );

    } else {

      const img =
        document.createElement(
          "img"
        );

      img.src =
        post.media_url;

      img.alt =
        "Publication";

      cover.appendChild(
        img
      );

    }

  }


  item.addEventListener(
    "click",
    async () => {

      if (!post) {
        return;
      }

      if (
        post.type ===
        "video"
      ) {

        openReels({
          id: post.id,
          userId: post.user_id,
          type: post.type,
         sourceType:
  post.source_type ||
  "upload",
          src: post.media_url,
          caption:
            post.caption || "",
          likes: 0
        });

      } else {

        await showProfileInterface();

        await openUserProfile(
          post.user_id
        );

        openViewer(
          post.id
        );

      }

    }
  );


  item.appendChild(
    cover
  );

}
        
        list.appendChild(
          item
        );

      }
    );


  } catch (error) {

  console.error(
    "Erreur chargement notifications :",
    error
  );

  empty.textContent =
    "ERREUR SUPABASE : " +
    (
      error?.message ||
      error?.details ||
      error?.hint ||
      JSON.stringify(error)
    );

  empty.hidden = false;

}

}


async function showNotificationsPage() {

  const notificationsPage =
    $("#notificationsPage");

  const homeFeedPage =
    $("#homeFeedPage");

  const profilePage =
    $("#profilePage");

  const explorePage =
    $("#explorePage");

  const followListPage =
    $("#followListPage");

  const topbar =
    $(".topbar");


  if (homeFeedPage) {
    homeFeedPage.hidden =
      true;
  }


  if (profilePage) {
    profilePage.hidden =
      true;
  }


  if (explorePage) {
    explorePage.hidden =
      true;
  }


  if (followListPage) {
    followListPage.hidden =
      true;
  }


  if (topbar) {

    topbar.style.display =
      "none";

  }


  if (notificationsPage) {

    notificationsPage.hidden =
      false;

  }


  await markAllNotificationsRead();

await loadNotifications();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}
  

$("#notificationsBtn")
  ?.addEventListener(
    "click",
    async () => {

      await showNotificationsPage();

    }
  );


$("#notificationsBackBtn")
  ?.addEventListener(
    "click",
    async () => {

      const notificationsPage =
        $("#notificationsPage");

      if (notificationsPage) {
        notificationsPage.hidden = true;
      }

      await showHomeFeed();

    }
  );
/* =========================================================
MESSAGERIE - STOCKAGE LOCAL INDEXEDDB
========================================================= */

const MESSAGES_DB_NAME =
  "extazeMessages";

const MESSAGES_DB_VERSION =
  1;

const MESSAGES_STORE =
  "messages";


function getConversationId(
  userA,
  userB
) {

  return [
    userA,
    userB
  ]
    .sort()
    .join("__");

}


function openMessagesDB() {

  return new Promise(
    (resolve, reject) => {

      const request =
        indexedDB.open(
          MESSAGES_DB_NAME,
          MESSAGES_DB_VERSION
        );


      request.onupgradeneeded =
        event => {

          const db =
            event.target.result;


          if (
            !db.objectStoreNames
              .contains(
                MESSAGES_STORE
              )
          ) {

            const store =
              db.createObjectStore(
                MESSAGES_STORE,
                {
                  keyPath:
                    "local_id"
                }
              );


            store.createIndex(
              "conversation_id",
              "conversation_id",
              {
                unique:false
              }
            );


            store.createIndex(
              "created_at",
              "created_at",
              {
                unique:false
              }
            );

          }

        };


      request.onsuccess =
        () => {

          resolve(
            request.result
          );

        };


      request.onerror =
        () => {

          reject(
            request.error
          );

        };

    }
  );

}


async function saveLocalMessage(
  message
) {

  if (
    !message?.sender_id ||
    !message?.recipient_id
  ) {
    return;
  }


  const db =
    await openMessagesDB();


  const localId =
    message.local_id ||
    message.server_id ||
    crypto.randomUUID();


  const record = {

    ...message,

    local_id:
      localId,

    conversation_id:
      getConversationId(
        message.sender_id,
        message.recipient_id
      ),

    message_type:
      message.message_type ||
      "text",

    created_at:
      message.created_at ||
      new Date().toISOString()

  };


  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          MESSAGES_STORE,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          MESSAGES_STORE
        );


      store.put(
        record
      );


      transaction.oncomplete =
        () => {

          resolve(
            record
          );

        };


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );

        };

    }
  );

}


async function getLocalConversation(
  userA,
  userB
) {

  const db =
    await openMessagesDB();


  const conversationId =
    getConversationId(
      userA,
      userB
    );


  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          MESSAGES_STORE,
          "readonly"
        );

      const store =
        transaction.objectStore(
          MESSAGES_STORE
        );

      const index =
        store.index(
          "conversation_id"
        );


      const request =
        index.getAll(
          conversationId
        );


      request.onsuccess =
        () => {

          const messages =
            request.result || [];


          messages.sort(
            (a, b) =>
              new Date(
                a.created_at
              ) -
              new Date(
                b.created_at
              )
          );


          resolve(
            messages
          );

        };


      request.onerror =
        () => {

          reject(
            request.error
          );

        };

    }
  );

}
async function getAllLocalMessages() {

  const db =
    await openMessagesDB();

  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          MESSAGES_STORE,
          "readonly"
        );

      const store =
        transaction.objectStore(
          MESSAGES_STORE
        );

      const request =
        store.getAll();

      request.onsuccess =
        () =>
          resolve(
            request.result || []
          );

      request.onerror =
        () =>
          reject(
            request.error
          );

    }
  );
}


async function loadMessagesList() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }

  const list =
    $("#messagesList");

  if (!list) return;

  try {

    const allMessages =
      await getAllLocalMessages();

    const messages =
      allMessages.filter(
        message =>
          message.sender_id === currentUser.id ||
          message.recipient_id === currentUser.id
      );

    if (!messages.length) {
      return;
    }

    const conversations =
      new Map();

    messages.forEach(
      message => {

        const otherId =
          message.sender_id === currentUser.id
            ? message.recipient_id
            : message.sender_id;

        const oldMessage =
          conversations.get(
            otherId
          );

        if (
          !oldMessage ||
          new Date(message.created_at) >
          new Date(oldMessage.created_at)
        ) {
          conversations.set(
            otherId,
            message
          );
        }

      }
    );

    const ids =
      [...conversations.keys()];

    const {
      data: profiles,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,name,avatar_url"
        )
        .in(
          "id",
          ids
        );

    if (error) {
      throw error;
    }

    list.innerHTML = "";

    (profiles || []).forEach(
      profile => {

        const message =
          conversations.get(
            profile.id
          );

        if (!message) return;

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "messages-conversation";

        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "messages-conversation-avatar";

        if (profile.avatar_url) {

          const img =
            document.createElement(
              "img"
            );

          img.src =
            profile.avatar_url;

          avatar.appendChild(
            img
          );

        } else {

          avatar.textContent =
            "👤";

        }

        const text =
          document.createElement(
            "div"
          );

        text.className =
          "messages-conversation-text";

        const name =
          document.createElement(
            "strong"
          );

        name.textContent =
          profile.username ||
          profile.name ||
          "Utilisateur";

        const preview =
          document.createElement(
            "span"
          );

        preview.textContent =
          message.sender_id === currentUser.id
            ? "Vous : " +
              (message.content || "")
            : message.content || "";

        text.appendChild(name);
        text.appendChild(preview);

        row.appendChild(avatar);
        row.appendChild(text);

        row.addEventListener(
          "click",
          () => {

            openChatWithUser(
              profile
            );

          }
        );

        list.appendChild(row);

      }
    );

  } catch (error) {

    console.error(
      "Erreur liste conversations :",
      error
    );

  }
}
function scrollChatToBottom() {

  const box =
    $("#chatMessages");

  if (!box) {
    return;
  }

  box.scrollTop =
    box.scrollHeight;
}


function renderChatMessage(
  message
) {

  const box =
    $("#chatMessages");

  if (
    !box ||
    !currentUser
  ) {
    return;
  }


  const row =
    document.createElement(
      "div"
    );

  const mine =
    message.sender_id ===
    currentUser.id;


  row.className =
    "chat-message " +
    (
      mine
        ? "mine"
        : "theirs"
    );


  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "chat-bubble";

  bubble.textContent =
    message.content || "";


  row.appendChild(
    bubble
  );

  box.appendChild(
    row
  );


  scrollChatToBottom();

}


async function loadLocalChat(
  otherUserId
) {

  if (
    !currentUser ||
    !otherUserId
  ) {
    return;
  }


  const box =
    $("#chatMessages");

  if (!box) {
    return;
  }


  try {

    const messages =
      await getLocalConversation(
        currentUser.id,
        otherUserId
      );


    box.innerHTML = "";


    messages.forEach(
      message => {

        renderChatMessage(
          message
        );

      }
    );


    scrollChatToBottom();


  } catch (error) {

    console.error(
      "Erreur historique local :",
      error
    );

  }

}


async function sendTextMessage(
  text
) {

  if (
    !currentUser ||
    !activeChatUser?.id ||
    !supabaseClient
  ) {
    return;
  }


  const content =
    text.trim();

  if (!content) {
    return;
  }


  const message = {

    local_id:
      crypto.randomUUID(),

    sender_id:
      currentUser.id,

    recipient_id:
      activeChatUser.id,

    message_type:
      "text",

    content,

    created_at:
      new Date().toISOString()

  };


  try {

    /* SAUVEGARDE SUR LE TÉLÉPHONE */

    await saveLocalMessage(
      message
    );


    /* AFFICHAGE IMMÉDIAT */

    renderChatMessage(
      message
    );


    /* BOÎTE TEMPORAIRE SUPABASE */

    const {
      error
    } =
      await supabaseClient
        .from("pending_messages")
        .insert({
          sender_id:
            message.sender_id,

          recipient_id:
            message.recipient_id,

          message_type:
            "text",

          content:
            message.content
        });


    if (error) {
      throw error;
    }


  } catch (error) {

    console.error(
      "Erreur envoi message :",
      error
    );

    toast(
      "Impossible d’envoyer le message"
    );

  }

}


$("#chatForm")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const input =
        $("#chatInput");


      const content =
        input?.value || "";


      if (!content.trim()) {
        return;
      }


      input.value = "";


      await sendTextMessage(
        content
      );

    }
  );
let messagesRealtimeChannel = null;


async function receivePendingMessage(
  row
) {

  if (
    !row ||
    !currentUser ||
    row.recipient_id !== currentUser.id
  ) {
    return;
  }


  const message = {

    server_id:
      row.id,

    sender_id:
      row.sender_id,

    recipient_id:
      row.recipient_id,

    message_type:
      row.message_type || "text",

    content:
      row.content || "",

    created_at:
      row.created_at

  };


  try {

    /* ENREGISTRER SUR LE TÉLÉPHONE */

    await saveLocalMessage(
      message
    );


    /* METTRE À JOUR LA LISTE DES CONVERSATIONS */

await loadMessagesList();


/* SI LA CONVERSATION EST OUVERTE */

if (
  activeChatUser?.id ===
    row.sender_id &&
  $("#chatPage") &&
  !$("#chatPage").hidden
) {

  renderChatMessage(
    message
  );

} else {

  const messagesPage =
    $("#messagesPage");

  const messagesPageOpen =
    messagesPage &&
    !messagesPage.hidden;


  if (!messagesPageOpen) {

    /* NOUVEAU MESSAGE = ENVELOPPE ROUGE */

    setMessagesUnread(
      true
    );

  }

}
    

    /* SUPPRIMER LA COPIE TEMPORAIRE SUPABASE */

    const {
      error
    } =
      await supabaseClient
        .from("pending_messages")
        .delete()
        .eq(
          "id",
          row.id
        );

    if (error) {
      throw error;
    }


  } catch (error) {

    console.error(
      "Erreur réception message :",
      error
    );

  }

}


async function loadPendingMessages() {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("pending_messages")
        .select(
          "id,sender_id,recipient_id,message_type,content,created_at"
        )
        .eq(
          "recipient_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending:true
          }
        );


    if (error) {
      throw error;
    }


    for (
      const row of
      data || []
    ) {

      await receivePendingMessage(
        row
      );

    }


  } catch (error) {

    console.error(
      "Erreur messages en attente :",
      error
    );

  }

}


function stopMessagesRealtime() {

  if (
    messagesRealtimeChannel &&
    supabaseClient
  ) {

    supabaseClient.removeChannel(
      messagesRealtimeChannel
    );

  }

  messagesRealtimeChannel =
    null;

}


function startMessagesRealtime() {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }


  stopMessagesRealtime();


  /* RÉCUPÉRER CE QUI A ÉTÉ ENVOYÉ PENDANT L'ABSENCE */

  loadPendingMessages();


  /* RECEVOIR IMMÉDIATEMENT LES NOUVEAUX MESSAGES */

  messagesRealtimeChannel =
    supabaseClient
      .channel(
        "messages-" +
        currentUser.id +
        "-" +
        Date.now()
      )
      .on(
        "postgres_changes",

        {
          event:"INSERT",

          schema:"public",

          table:"pending_messages",

          filter:
            `recipient_id=eq.${currentUser.id}`
        },

        payload => {

          receivePendingMessage(
            payload.new
          );

        }
      )
      .subscribe();

}
function saveCurrentView(
  view
) {

  if (!currentUser) {
    return;
  }

  localStorage.setItem(
    "extazeCurrentView:" +
      currentUser.id,
    view
  );

}


function getCurrentView() {

  if (!currentUser) {
    return "profile";
  }

  return (
    localStorage.getItem(
      "extazeCurrentView:" +
        currentUser.id
    ) ||
    "profile"
  );

}


async function restoreCurrentView() {

  const view =
    getCurrentView();


  if (view === "explore") {

    await showExploreInterface();
    return;

  }


  if (view === "messages") {

    await showMessagesPage();
    return;

  }


  if (view === "home") {

    await showHomeFeed();
    return;

  }


  await showProfileInterface();

}
/* =========================================================
NAVIGATION BAS
========================================================= */ 

$("#bottomSearchBtn")
  ?.addEventListener(
    "click",
    async () => {

      await showExploreInterface();

      setTimeout(
        () => {
          $("#exploreSearchInput")
            ?.focus();
        },
        300
      );

    }
  );

function setMessagesUnread(hasUnread) {

  const button =
    $("#bottomMessagesBtn");

  if (!button) {
    return;
  }

  button.dataset.unread =
    hasUnread
      ? "true"
      : "false";

  button.style.color =
    hasUnread
      ? "#ff3040"
      : "";
}


async function showMessagesPage() {
  
saveCurrentView(
  "messages"
);
  
  const messagesPage =
    $("#messagesPage");

  if (!messagesPage) {
    return;
  }

  const homeFeedPage =
    $("#homeFeedPage");

  const explorePage =
    $("#explorePage");

  const profilePage =
    $("#profilePage");

  const notificationsPage =
    $("#notificationsPage");

  const followListPage =
    $("#followListPage");

  if (homeFeedPage) {
    homeFeedPage.hidden = true;
  }

  if (explorePage) {
    explorePage.hidden = true;
  }

  if (profilePage) {
    profilePage.hidden = true;
  }

  if (notificationsPage) {
    notificationsPage.hidden = true;
  }

  if (followListPage) {
    followListPage.hidden = true;
  }

  messagesPage.hidden =
    false;

  setMessagesUnread(
    false
  );
await loadMessagesList();
  
  $$(".bottom-nav-btn")
    .forEach(
      button => {
        button.classList.remove(
          "active"
        );
      }
    );

  $("#bottomMessagesBtn")
    ?.classList
    .add(
      "active"
    );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


$("#bottomMessagesBtn")
  ?.addEventListener(
    "click",
    showMessagesPage
  );


$("#messagesBackBtn")
  ?.addEventListener(
    "click",
    async () => {

      const page =
        $("#messagesPage");

      if (page) {
        page.hidden = true;
      }

      await showHomeFeed();

    }
  );
/* =========================================================
NOUVEAU MESSAGE
========================================================= */

let newMessageSearchTimer = null;


function openNewMessagePage() {

  const messagesPage =
    $("#messagesPage");

  const newMessagePage =
    $("#newMessagePage");

  const input =
    $("#newMessageSearchInput");

  const results =
    $("#newMessageResults");


  if (!newMessagePage) {
    return;
  }


  if (messagesPage) {
    messagesPage.hidden = true;
  }

  newMessagePage.hidden = false;


  if (input) {
    input.value = "";
  }

  if (results) {
    results.innerHTML =
      `
      <div class="new-message-empty">
        Recherchez une personne pour commencer une conversation.
      </div>
      `;
  }


  setTimeout(
    () => {
      input?.focus();
    },
    200
  );

}


function closeNewMessagePage() {

  const messagesPage =
    $("#messagesPage");

  const newMessagePage =
    $("#newMessagePage");


  if (newMessagePage) {
    newMessagePage.hidden = true;
  }

  if (messagesPage) {
    messagesPage.hidden = false;
  }

}

let activeChatUser = null;


function setChatAvatar(
  container,
  profile
) {

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (profile?.avatar_url) {

    const img =
      document.createElement(
        "img"
      );

    img.src =
      profile.avatar_url;

    img.alt =
      profile.username || "";

    container.appendChild(
      img
    );

  } else {

    container.textContent =
      "👤";

  }

}


function openChatWithUser(
  profile
) {

  if (!profile?.id) {
    return;
  }

  activeChatUser =
    profile;


  const newMessagePage =
    $("#newMessagePage");

  const messagesPage =
    $("#messagesPage");

  const chatPage =
    $("#chatPage");


  if (!chatPage) {
    return;
  }


  if (newMessagePage) {
    newMessagePage.hidden = true;
  }

  if (messagesPage) {
    messagesPage.hidden = true;
  }

  chatPage.hidden =
    false;


  setChatAvatar(
    $("#chatHeaderAvatar"),
    profile
  );

  setChatAvatar(
    $("#chatProfileAvatar"),
    profile
  );


  const displayName =
    profile.name ||
    profile.username ||
    "Utilisateur";


  if ($("#chatHeaderName")) {
    $("#chatHeaderName")
      .textContent =
      displayName;
  }

  if ($("#chatHeaderUsername")) {
    $("#chatHeaderUsername")
      .textContent =
      profile.username
        ? "@" + profile.username
        : "";
  }

  if ($("#chatProfileName")) {
    $("#chatProfileName")
      .textContent =
      displayName;
  }

  if ($("#chatProfileUsername")) {
    $("#chatProfileUsername")
      .textContent =
      profile.username
        ? "@" + profile.username
        : "";
  }


  const messages =
    $("#chatMessages");

  if (messages) {
    messages.innerHTML = "";
  }
loadLocalChat(
  profile.id
);

  setTimeout(
    () => {
      $("#chatInput")
        ?.focus();
    },
    200
  );

}

function renderNewMessageUsers(
  users
) {

  const results =
    $("#newMessageResults");

  if (!results) {
    return;
  }

  results.innerHTML = "";


  if (!users.length) {

    results.innerHTML =
      `
      <div class="new-message-empty">
        Aucun utilisateur trouvé.
      </div>
      `;

    return;
  }


  users.forEach(
    profile => {

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "new-message-user";


      const avatar =
        document.createElement(
          "div"
        );

      avatar.className =
        "new-message-avatar";


      if (profile.avatar_url) {

        const img =
          document.createElement(
            "img"
          );

        img.src =
          profile.avatar_url;

        img.alt =
          profile.username || "";

        avatar.appendChild(
          img
        );

      } else {

        avatar.textContent =
          "👤";

      }


      const text =
        document.createElement(
          "div"
        );

      text.className =
        "new-message-user-text";


      const username =
        document.createElement(
          "div"
        );

      username.className =
        "new-message-user-username";

      username.textContent =
        profile.username ||
        "Utilisateur";


      const name =
        document.createElement(
          "div"
        );

      name.className =
        "new-message-user-name";

      name.textContent =
        profile.name || "";


      text.appendChild(
        username
      );

      text.appendChild(
        name
      );


      row.appendChild(
        avatar
      );

      row.appendChild(
        text
      );


      row.addEventListener(
  "click",
  () => {

    openChatWithUser(
      profile
    );

  }
);


      results.appendChild(
        row
      );

    }
  );

}


async function searchMessageUsers(
  query
) {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }


  const search =
    query.trim();

  const results =
    $("#newMessageResults");


  if (!results) {
    return;
  }


  if (search.length < 2) {

    results.innerHTML =
      `
      <div class="new-message-empty">
        Recherchez une personne pour commencer une conversation.
      </div>
      `;

    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,name,avatar_url"
        )
        .neq(
          "id",
          currentUser.id
        )
        .or(
          `username.ilike.%${search}%,name.ilike.%${search}%`
        )
        .limit(30);


    if (error) {
      throw error;
    }


    renderNewMessageUsers(
      data || []
    );


  } catch (error) {

    console.error(
      "Erreur recherche messagerie :",
      error
    );

    results.innerHTML =
      `
      <div class="new-message-empty">
        Impossible d’effectuer la recherche.
      </div>
      `;

  }

}


$("#newMessageBtn")
  ?.addEventListener(
    "click",
    openNewMessagePage
  );


$("#newMessageBackBtn")
  ?.addEventListener(
    "click",
    closeNewMessagePage
  );


$("#newMessageSearchInput")
  ?.addEventListener(
    "input",
    event => {

      clearTimeout(
        newMessageSearchTimer
      );

      const value =
        event.target.value;


      newMessageSearchTimer =
        setTimeout(
          () => {

            searchMessageUsers(
              value
            );

          },
          250
        );

    }
  );
$("#chatBackBtn")
  ?.addEventListener(
    "click",
    () => {

      const chatPage =
        $("#chatPage");

      const messagesPage =
        $("#messagesPage");

      if (chatPage) {
        chatPage.hidden = true;
      }

      if (messagesPage) {
        messagesPage.hidden = false;
      }

    }
  );


$("#chatViewProfileBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (!activeChatUser?.id) {
        return;
      }

      const chatPage =
        $("#chatPage");

      const messagesPage =
        $("#messagesPage");

      if (chatPage) {
        chatPage.hidden = true;
      }

      if (messagesPage) {
        messagesPage.hidden = true;
      }

      await showProfileInterface();

      await openUserProfile(
        activeChatUser.id
      );

    }
  );

$("#bottomProfileBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (!currentUser) {
        return;
      }

      const homeFeedPage =
        $("#homeFeedPage");

      const explorePage =
        $("#explorePage");

      const notificationsPage =
        $("#notificationsPage");

      const followListPage =
        $("#followListPage");


      if (homeFeedPage) {
        homeFeedPage.hidden =
          true;
      }

      if (explorePage) {
        explorePage.hidden =
          true;
      }

      if (notificationsPage) {
        notificationsPage.hidden =
          true;
      }

      if (followListPage) {
        followListPage.hidden =
          true;
      }


      await showProfileInterface();

      await returnToOwnProfile();


      $("#bottomProfileBtn")
        ?.classList
        .add(
          "active"
        );

    }
  );


$("#bottomHomeBtn")
  ?.addEventListener(
    "click",
    async () => {

      await showHomeFeed();

    }
  );


/* =========================================================
PARTAGE
========================================================= */

$("#shareBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard
          .writeText(
            location.href
          );


        toast(
          "Lien du profil copié"
        );


      } catch {

        toast(
          "Copie du lien impossible"
        );

      }

    }
  );


/* =========================================================
THEME
========================================================= */

function applyTheme() {

  document.body
    .classList
    .toggle(
      "light",
      !state.dark
    );


  const button =
    $("#themeBtn");


  if (button) {

    button.textContent =
      state.dark
        ? "☀"
        : "☾";

  }

}


$("#themeBtn")
  ?.addEventListener(
    "click",
    () => {

      state.dark =
        !state.dark;


      save();

      applyTheme();

    }
  );


/* =========================================================
PARAMETRES
========================================================= */


function openSettingsPage() {

  const page =
    $("#settingsPage");

  if (!page) {
    return;
  }

  page.hidden =
    false;

  document.body.style.overflow =
    "hidden";


  const email =
    $("#settingsEmailValue");

  if (email) {

    email.textContent =
      currentUser?.email ||
      "";

  }

}


function closeSettingsPage() {

  const page =
    $("#settingsPage");

  if (page) {

    page.hidden =
      true;

  }

  document.body.style.overflow =
    "";

}


$("#settingsBtn")
  ?.addEventListener(
    "click",
    openSettingsPage
  );


$("#settingsBackBtn")
  ?.addEventListener(
    "click",
    closeSettingsPage
  );


$("#settingsEditProfileBtn")
  ?.addEventListener(
    "click",
    () => {

      closeSettingsPage();

      $("#editProfileBtn")
        ?.click();

    }
  );


$("#settingsEmailBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (
        !supabaseClient ||
        !currentUser
      ) {
        return;
      }

      const currentEmail =
        currentUser.email || "";

      const newEmail =
        window.prompt(
          "Nouvelle adresse e-mail :",
          currentEmail
        );

      if (newEmail === null) {
        return;
      }

      const email =
        newEmail
          .trim()
          .toLowerCase();

      if (!email) {
        toast(
          "Adresse e-mail invalide"
        );
        return;
      }

      if (
        email ===
        currentEmail.toLowerCase()
      ) {
        toast(
          "Cette adresse est déjà utilisée"
        );
        return;
      }

      try {

        const {
          data,
          error
        } =
          await supabaseClient
            .functions
            .invoke(
              "update-email",
              {
                body: {
                  email
                }
              }
            );

        if (error) {
          throw error;
        }

        if (data?.error) {
          throw new Error(
            data.error
          );
        }

        currentUser = {
          ...currentUser,
          email:
            data?.email ||
            email
        };

        const emailValue =
          $("#settingsEmailValue");

        if (emailValue) {
          emailValue.textContent =
            currentUser.email;
        }

        toast(
          "Adresse e-mail modifiée"
        );

      } catch (error) {

        console.error(
          "Erreur modification e-mail :",
          error
        );

        toast(
          error?.message ||
          "Impossible de modifier l’adresse e-mail"
        );

      }

    }
  );

$("#settingsPasswordBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (
        !supabaseClient ||
        !currentUser
      ) {
        return;
      }

      const newPassword =
        window.prompt(
          "Entrez votre nouveau mot de passe :"
        );

      if (newPassword === null) {
        return;
      }

      if (newPassword.length < 8) {

        toast(
          "Le mot de passe doit contenir au moins 8 caractères"
        );

        return;
      }

      const confirmation =
        window.prompt(
          "Confirmez votre nouveau mot de passe :"
        );

      if (confirmation === null) {
        return;
      }

      if (
        newPassword !==
        confirmation
      ) {

        toast(
          "Les deux mots de passe ne correspondent pas"
        );

        return;
      }

      try {

        const {
          error
        } =
          await supabaseClient.auth
            .updateUser({
              password:
                newPassword
            });

        if (error) {
          throw error;
        }

        toast(
          "Mot de passe modifié"
        );

      } catch (error) {

        console.error(
          "Erreur modification mot de passe :",
          error
        );

        toast(
          error?.message ||
          "Impossible de modifier le mot de passe"
        );

      }

    }
  );

async function openPrivacyPage() {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }

  const page =
    $("#privacyPage");

  const toggle =
    $("#privateAccountToggle");

  if (
    !page ||
    !toggle
  ) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select("is_private")
        .eq(
          "id",
          currentUser.id
        )
        .single();

    if (error) {
      throw error;
    }

    toggle.checked =
      data?.is_private === true;

    const privacyValue =
      $("#settingsPrivacyValue");

    if (privacyValue) {

      privacyValue.textContent =
        toggle.checked
          ? "Privé"
          : "Public";

    }

    closeSettingsPage();

    page.hidden =
      false;

    document.body.style.overflow =
      "hidden";

  } catch (error) {

    console.error(
      "Erreur confidentialité :",
      error
    );

    toast(
      "Impossible de charger la confidentialité"
    );

  }

}


function closePrivacyPage() {

  const page =
    $("#privacyPage");

  if (page) {
    page.hidden = true;
  }

  openSettingsPage();

}


$("#settingsPrivacyBtn")
  ?.addEventListener(
    "click",
    openPrivacyPage
  );


$("#privacyBackBtn")
  ?.addEventListener(
    "click",
    closePrivacyPage
  );


$("#privateAccountToggle")
  ?.addEventListener(
    "change",
    async event => {

      if (
        !supabaseClient ||
        !currentUser
      ) {
        return;
      }

      const toggle =
        event.target;

      const isPrivate =
        toggle.checked;

      toggle.disabled =
        true;

      try {

        const {
          error
        } =
          await supabaseClient
            .from("profiles")
            .update({
              is_private:
                isPrivate
            })
            .eq(
              "id",
              currentUser.id
            );

        if (error) {
          throw error;
        }

        const privacyValue =
          $("#settingsPrivacyValue");

        if (privacyValue) {

          privacyValue.textContent =
            isPrivate
              ? "Privé"
              : "Public";

        }

        toast(
          isPrivate
            ? "Compte passé en privé"
            : "Compte passé en public"
        );

      } catch (error) {

        console.error(
          "Erreur changement confidentialité :",
          error
        );

        toggle.checked =
          !isPrivate;

        toast(
          "Impossible de modifier la confidentialité"
        );

      } finally {

        toggle.disabled =
          false;

      }

    }
  );


$("#settingsLogoutBtn")
  ?.addEventListener(
    "click",
    async () => {

      const confirmed =
        window.confirm(
          "Voulez-vous vous déconnecter ?"
        );

      if (!confirmed) {
        return;
      }

      closeSettingsPage();

      await logoutUser();

    }
  );


/* =========================================================
REPRISE VIDEOS QUAND ON REVIENT SUR LA PAGE
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      !document.hidden
    ) {

      playGridVideos();

    }

  }
);


/* =========================================================
INITIALISATION
========================================================= */

async function initializeApp() {

  try {

    setupAuth();

    if (!supabaseReady()) {

      showAuthScreen();
      return;

    }

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();

    if (error) {
      throw error;
    }

    const session =
      data?.session;

    if (!session?.user) {

      currentUser = null;

      showAuthScreen();

      return;
    }

    currentUser =
      session.user;

    loadLocalStateForUser();

    applyTheme();

    await loadUserProfile();

    await loadSupabasePosts();

    setOwnerMode(true);

showApp();

await restoreCurrentView();

playGridVideos();

} catch (error) {

    console.error(
      "Erreur initialisation :",
      error
    );

    currentUser = null;

    showAuthScreen();

  }

}


initializeApp();

/* =========================================================
   ÉCRAN CONNEXION / INSCRIPTION
========================================================= */

(() => {

  const openBtn =
    document.getElementById("openSignupBtn");

  const backBtn =
    document.getElementById("backToLoginBtn");

  const loginPanel =
    document.getElementById("loginPanel");

  const signupPanel =
    document.getElementById("signupPanel");


  if (
    openBtn &&
    backBtn &&
    loginPanel &&
    signupPanel
  ) {

    openBtn.addEventListener(
      "click",
      () => {

        loginPanel.hidden = true;
        signupPanel.hidden = false;

      }
    );


    backBtn.addEventListener(
      "click",
      () => {

        signupPanel.hidden = true;
        loginPanel.hidden = false;

      }
    );

  }

})();
