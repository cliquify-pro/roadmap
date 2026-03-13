import { useUserStore } from "../store/user";

// TODO: Add TS types
// biome-ignore lint: Add TS types
const tokenError = (error: any) => {
  const { logout } = useUserStore();

  logout();

  if (error.response.data.code === "USER_NOT_FOUND") {
    if (router.currentRoute.value.fullPath !== "/") {
      router.push("/");
    }
  }

  const loginUrl =
    import.meta.env.VITE_CLIQUIFY_LOGIN_URL || "http://localhost:3001";
  const redirectTarget = `${loginUrl}/login?redirect=${window.location.origin}`;

  // invalid token or invalid JWT
  if (["INVALID_TOKEN", "INVALID_JWT"].includes(error.response.data.code)) {
    window.location.href = redirectTarget;
  }

  // invalid auth header format
  if (error.response.data.code === "INVALID_AUTH_HEADER_FORMAT") {
    window.location.href = redirectTarget;
  }
};

export default tokenError;
