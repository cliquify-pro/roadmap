import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import { router } from "../router";
import type { PermissionType } from "../modules/users";

export const useUserStore = defineStore("user", () => {
  const authToken = ref<string>("");
  const user = reactive({
    userId: "",
    name: "",
    username: "",
    email: "",
    avatar: "",
    isOwner: false, // Default false
  });
  const permissions = ref<string[]>([]);

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
    user.isOwner = payload.isOwner ?? false; // Default false if undefined

    localStorage.setItem(
      "user",
      JSON.stringify({
        authToken: authToken.value,
        ...user,
      }),
    );
  }

  function setPermissions(payload: PermissionType) {
    permissions.value = payload;
  }

  function login(payload: UserPayload) {
    setUser(payload);
  }

  function logout() {
    setUser({
      authToken: "",
      userId: "",
      name: "",
      username: "",
      email: "",
      avatar: "",
      isOwner: false, // Reset to false
    });

    setPermissions([]);

    localStorage.removeItem("user");
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
