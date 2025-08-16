<template>
  <div class="main-navbar">
    <!-- Logo Section -->
    <div class="navbar-brand">
      <router-link to="/dashboard" class="brand-link">
        <span class="logo-text"><img src="./icons/CliquifyLogo.svg" /></span>
      </router-link>
    </div>

    <!-- Divider -->
    <div class="divider-wrapper">
      <div class="divider"></div>
    </div>

    <!-- Navigation Items -->
    <nav class="nav-items">
      <router-link to="/" class="nav-link" exact>
        <div class="item-icon-wrapper">
         <img src="./icons//image.png"/>
        </div>
      </router-link>

      <router-link to="/roadmaps" class="nav-link">
        <div class="item-icon-wrapper">
          <RoadmapIcon />
        </div>
      </router-link>

      <router-link to="/boards" class="nav-link">
        <div class="item-icon-wrapper">
          <BoardIcon />
        </div>
      </router-link>
    </nav>

    <!-- Create Button -->
    <div class="create-btn-wrapper" v-if="!createPostPermissionDisabled">
      <button class="create-btn" @click="openOffcanvas">
        <PlusIcon />
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-grow"></div>

    <!-- Dropdown Profile Menu -->
    <dropdown-wrapper v-if="userStore.user.userId" class="sidebar-profile">
      <template #toggle>
        <avatar class="cursor-pointer" :src="userStore.user.avatar"
          :name="userStore.user.name || userStore.user.username" />
      </template>
      <template #default="dropdown">
        <dropdown v-if="dropdown.active" class="nav-profile-dropdown">
          <dropdown-item v-if="accessDashboard" @click="openDashboard">
            <template #icon>
              <DashboardIcon />
            </template>
            Dashboard
          </dropdown-item>
          <dropdown-item @click="openSettings">
            <template #icon>
              <SettingsIcon />
            </template>
            Settings
          </dropdown-item>
          <dropdown-spacer />
          <dropdown-item @click="userStore.logout">
            <template #icon>
              <LogoutIcon />
            </template>
            Sign out
          </dropdown-item>
          <dropdown-item v-if="showVersion" :disabled="true">
            {{ version }}
          </dropdown-item>
        </dropdown>
      </template>
    </dropdown-wrapper>

    <!-- Offcanvas for creating a post -->
    <OffcanvasCreatePost :visible="isOffcanvasOpen" @close="closeOffcanvas" @post-created="handlePostCreated" />
  </div>
</template>

<script setup lang="ts">
// Icons
import {
  Home as HomeIcon,
  Columns as BoardIcon,
  LayoutDashboard as DashboardIcon,
  Settings as SettingsIcon,
  LogOut as LogoutIcon,
  Plus as PlusIcon,
} from "lucide-vue";
import RoadmapIcon from "./icons/Roadmap.vue";

// Stores
import { useUserStore } from "../store/user";
import { useSettingStore } from "../store/settings";
// Components
import DropdownWrapper from "./ui/dropdown/DropdownWrapper.vue";
import Dropdown from "./ui/dropdown/Dropdown.vue";
import DropdownItem from "./ui/dropdown/DropdownItem.vue";
import DropdownSpacer from "./ui/dropdown/DropdownSpacer.vue";
import { Avatar } from "./ui/Avatar";
import { useRouter } from "vue-router";
import { computed, ref } from "vue";
import OffcanvasCreatePost from "./post/OffcanvasCreatePost.vue";

const userStore = useUserStore();
const settingsStore = useSettingStore();
const router = useRouter();
const isOffcanvasOpen = ref(false); // State for offcanvas

const accessDashboard = computed(() =>
  userStore.permissions.includes("dashboard:read"),
);

function openDashboard() {
  router.push("/dashboard");
}

function openSettings() {
  router.push("/settings");
}

const showVersion = computed(() => {
  return (
    userStore.permissions.includes("dashboard:read") &&
    settingsStore.get.developer_mode
  );
});

const version = computed(() => {
  return null; // Set version if needed, or use import.meta.env.VITE_APP_VERSION
});

// Permission check for create post
const createPostPermissionDisabled = computed(() => {
  return !userStore.permissions.includes("post:create");
});

// Open offcanvas function
function openOffcanvas() {
  if (userStore.user.userId) {
    isOffcanvasOpen.value = true;
  } else {
    console.log("Please log in to create a post");
    // Optionally redirect to login
  }
}

// Close offcanvas function
function closeOffcanvas() {
  isOffcanvasOpen.value = false;
  console.log("Offcanvas closed"); // Debug log
}

// Handle post creation
function handlePostCreated(newPost) {
  console.log("New post created:", newPost);
  isOffcanvasOpen.value = false; // Close offcanvas after creation
}
</script>

<style scoped lang="scss">
.main-navbar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 70px;
  padding: 1rem;
  gap: 1rem;
  background: linear-gradient(0deg, #5443B1 0%, #5F4176 100%);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: visible;
}

.navbar-brand {
  display: flex;
  justify-content: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.logo-text {
  color: white;
  font-weight: bold;
}

.divider-wrapper {
  display: flex;
  justify-content: center;
}

.divider {
  border: 1px solid #D8CBE14D;
  width: 24px;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 10px;
  color: #ccc;
  text-decoration: none;
  font-weight: 500;
  transition: 0.3s ease;

  &.router-link-exact-active {
    background: #3c1e5399;
    color: white;
    border-radius: 8px;

    .item-icon-wrapper svg {
      stroke: white;
    }
  }

  &:hover {
    background: #3c1e5399;
    color: #fff;
    border-radius: 8px;
  }
}

.item-icon-wrapper {
  display: flex;

  svg {
    width: 18px;
    height: 18px;
    stroke: #ccc;
  }
}

.flex-grow {
  flex-grow: 1;
}

/* Create Button Styling */
.create-btn-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;

  svg {
    width: 18px;
    height: 18px;
    stroke: #666;
  }

  &:hover {
    background: #f0f0f0;
    border-color: #ccc;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

/* Profile Dropdown in Sidebar */
.sidebar-profile {
  display: flex;
  justify-content: center;
  margin-top: auto;
}

.nav-profile-dropdown {
  position: absolute;
  bottom: 80px;
  left: 110%;
  background: #fff;
  color: #333;
  border-radius: 8px;
  padding: 0.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 110000000;
  min-width: 180px;
  overflow: hidden;
  font-size: 14px;
  animation: fadeIn 0.2s ease-in-out;
  margin-left: 60px;
  inset: auto auto 0px 0px;
}

/* Dropdown item styling */
.nav-profile-dropdown a,
.nav-profile-dropdown button {
  display: block;
  width: 100%;
  padding: 0.6rem 1rem;
  text-align: left;
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  color: #333;
  font-weight: 500;
  transition: background 0.2s ease, color 0.2s ease;
}

/* Hover effect */
.nav-profile-dropdown a:hover,
.nav-profile-dropdown button:hover {
  background: #f5f5f5;
  color: #000;
}

/* Divider */
.nav-profile-dropdown hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 0.3rem 0;
}

/* Smooth fade-in animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>