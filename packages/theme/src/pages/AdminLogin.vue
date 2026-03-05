<template>
  <div class="admin-login-container">
    <div class="admin-login-card">
      <h1 class="admin-login-title">Admin Login</h1>

      <div v-if="errorMessage" class="admin-login-error">
        {{ errorMessage }}
      </div>

      <form class="admin-login-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@example.com"
            autocomplete="email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="admin-login-btn" :disabled="loading">
          {{ loading ? "Signing in…" : "Sign in" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { useUserStore } from "../store/user";
import { getPermissions } from "../modules/users";

const router = useRouter();
const userStore = useUserStore();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  if (!email.value || !password.value) return;

  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/v1/auth/login`,
      { email: email.value, password: password.value },
      { withCredentials: true },
    );

    userStore.setUser({
      authToken: response.data.authToken || "",
      userId: response.data.user.userId,
      name: response.data.user.name,
      username: response.data.user.username,
      email: response.data.user.email,
      avatar: response.data.user.avatar,
      isOwner: response.data.user.isOwner,
    });

    const permissions = await getPermissions();
    userStore.setPermissions(permissions.data.permissions);

    router.push("/dashboard");
  } catch (err: any) {
    const code =
      err?.response?.data?.errors?.[0]?.type || err?.response?.data?.code;

    if (code === "USER_NOT_FOUND" || code === "NOT_ADMIN") {
      errorMessage.value = "Access denied.";
    } else if (code === "INCORRECT_PASSWORD") {
      errorMessage.value = "Wrong password.";
    } else {
      errorMessage.value = "Login failed. Please try again.";
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.admin-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.admin-login-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.admin-login-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #1a1a1a;
}

.admin-login-error {
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.admin-login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.form-group input:focus {
  border-color: #5443b1;
  box-shadow: 0 0 0 2px rgba(84, 67, 177, 0.15);
}

.admin-login-btn {
  margin-top: 0.5rem;
  padding: 0.625rem;
  background: #5443b1;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.admin-login-btn:hover:not(:disabled) {
  background: #4535a0;
}

.admin-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
