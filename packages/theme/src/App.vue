<template>
  <div
    :style="{
      '--color-brand-color': `#${settingsStore.get.accentColor}`
    }"
    class="app-container"
  >
    <div class="alerts">
      <Alert
        v-for="(alert, index) in getAlerts"
        :key="alert.time"
        :title="alert.title"
        :type="alert.type"
        :timeout="alert.timeout"
        @remove="removeAlert(index)"
        :is-toast="true"
      />
    </div>
    <router-view />
  </div>
</template>

<script setup lang="ts">
// packages
import axios from "axios";
import { computed, onMounted } from "vue";
// import gtag, { setOptions, bootstrap } from "vue-gtag";
import { useHead } from "@vueuse/head";

import packageJson from "../package.json";
import { VITE_API_URL } from "./constants";

import { useSettingStore } from "./store/settings";
import { useUserStore } from "./store/user";
import { useAlertStore } from "./store/alert";
import { getPermissions } from "./modules/users";

// components
import { Alert } from "./components/ui/Alert";

const settingsStore = useSettingStore();
const { getAlerts, remove: removeAlert } = useAlertStore();
const userStore = useUserStore();

const logchimpVersion = computed(() => packageJson.version);

function getSiteSettings() {
  axios({
    method: "get",
    url: `${VITE_API_URL}/api/v1/settings/site`,
  })
    .then((response) => {
      settingsStore.update(response.data.settings);
    })
    .catch((error) => {
      console.error(error);
    });
}

onMounted(async () => {
  getSiteSettings();

  // set google analytics
  if (settingsStore.get.googleAnalyticsId) {
    // TODO: Properly implement 'vue-gtag' feature
    // setOptions({
    //   config: {
    //     id: settingsStore.get.googleAnalyticsId,
    //   },
    // });
    // bootstrap(gtag).then();
  }

  // Only call /auth/me if there's no cached session (first load / new tab)
  // On hard refresh, sessionStorage preserves the token so no round-trip needed
  if (!userStore.getUserId) {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/me`,
        { withCredentials: true },
      );

      if (response.data.user) {
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
      }
    } catch (err) {
      // No cookie or invalid — stay on page, show Login button
      console.log("Not authenticated via cookie");
    }
  }
});

useHead({
  titleTemplate: (title) =>
    `${title ? `${title} • ` : ""}${settingsStore.get.title}`,
  htmlAttrs: {
    lang: "en",
  },
  meta: [
    {
      name: "generator",
      content: () => `LogChimp v${logchimpVersion.value}`,
    },
    {
      name: "description",
      content: () => `${settingsStore.get.description}. Powered By Cliquify.`,
    },
    {
      name: "robots",
      content: "index, follow",
    },
    // {
    // 	rel: "canonical",
    // 	href: "this.$route.fullPath"
    // },
    {
      name: "language",
      content: "es",
    },
    {
      name: "copyright",
      content: settingsStore.get.title,
    },

    // openGraph
    {
      name: "og:type",
      content: "website",
    },
    {
      name: "og:description",
      content: () => `${settingsStore.get.description}. Powered By Cliquify.`,
    },

    {
      name: "theme-color",
      content: settingsStore.get.accentColor,
    },
    {
      name: "msapplication-TileColor",
      content: settingsStore.get.accentColor,
    },
  ],
});
</script>

<style lang='sass'>
.app-container
  width: 100vw // Full viewport width
  min-height: 100vh // Optional: Ensure it takes at least full viewport height
  margin: 0
  padding: 0
  box-sizing: border-box

.alerts
  position: fixed
  top: 1.5rem
  right: 1.5rem
  z-index: 10
</style>
