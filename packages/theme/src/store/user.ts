import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import { router } from "../router";
import type { PermissionType } from "../modules/users";

const SESSION_KEY = "lc_session";

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(data: object) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable (e.g. private mode quota)
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export const useUserStore = defineStore("user", () => {
  const saved = readSession();

  const authToken = ref<string>(saved?.authToken ?? "");
  const user = reactive({
    userId: saved?.userId ?? "",
    name: saved?.name ?? "",
    username: saved?.username ?? "",
    email: saved?.email ?? "",
    avatar: saved?.avatar ?? "",
    isOwner: saved?.isOwner ?? false,
  });
  const permissions = ref<string[]>(saved?.permissions ?? []);

  const getUser = computed(() => user);
  const getUserId = computed(() => user.userId);

  // Payload ke liye type
  interface UserPayload {
    authToken?: string;
    userId?: string;
    name?: string;
    username?: string;
    email?: string;
    avatar?: string;
    isOwner?: boolean;
  }

  function setUser(payload: UserPayload) {
    authToken.value = payload.authToken || "";
    user.userId = payload.userId || "";
    user.name = payload.name || "";
    user.username = payload.username || "";
    user.email = payload.email || "";
    user.avatar = payload.avatar || "";
    user.isOwner = payload.isOwner ?? false;

    writeSession({
      authToken: authToken.value,
      userId: user.userId,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOwner: user.isOwner,
      permissions: permissions.value,
    });
  }

  function setPermissions(payload: PermissionType) {
    permissions.value = payload;
    // Update the cached permissions too
    writeSession({
      authToken: authToken.value,
      userId: user.userId,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOwner: user.isOwner,
      permissions: permissions.value,
    });
  }

  function login(payload: UserPayload) {
    setUser(payload);
  }

  async function logout() {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // best-effort — clear local state regardless
    }

    clearSession();

    authToken.value = "";
    user.userId = "";
    user.name = "";
    user.username = "";
    user.email = "";
    user.avatar = "";
    user.isOwner = false;
    permissions.value = [];

    if (router.currentRoute.value.fullPath !== "/") {
      router.push("/");
    }
  }

  return {
    // state
    authToken,
    user,
    permissions,

    // getters
    getUser,
    getUserId,

    // actions
    setUser,
    login,
    logout,
    setPermissions,
  };
});
