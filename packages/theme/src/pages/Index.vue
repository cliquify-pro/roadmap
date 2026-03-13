<template>
  <div class="filter">
    <div>
      <div class="home-title">Feature ideas</div>

    </div>
    <div class="filter-box"></div>
  </div>
  <div class="homepage-container flex flex-col-reverse lg:flex-row mb-16 lg:space-x-8">
    <main class="grow-[2] shrink basis-0">
      <post-item
        v-for="post in posts"
        :key="post.postId"
        :post="post"
        @open-drawer="handleOpenDrawer"
      />

      <infinite-scroll @infinite="getBoardPosts" :state="state" />
    </main>
    <aside class="flex-1 mb-6 lg:mb-0">
      <site-setup-card v-if="showSiteSetupCard" />
      <login-card v-if="!userStore.getUserId && !showSiteSetupCard" />
    </aside>
    <!-- Add PostDrawer here -->
    <post-drawer :visible="drawerVisible" :slug="selectedSlug" @close="drawerVisible = false" />
  </div>
</template>

<script lang="ts">
export default {
  name: "Homepage",
};
</script>

<script setup lang="ts">
// packages
import { onMounted, ref } from "vue";
import { useHead } from "@vueuse/head";

// modules
import { isSiteSetup } from "../modules/site";
import { getPosts } from "../modules/posts";
import { useSettingStore } from "../store/settings";
import { useUserStore } from "../store/user";

// components
import InfiniteScroll, { InfiniteScrollStateType } from "../components/ui/InfiniteScroll.vue";
import PostItem from "../components/post/PostItem.vue";
import SiteSetupCard from "../components/site/SiteSetupCard.vue";
import LoginCard from "../components/auth/LoginCard.vue";
import PostDrawer from "../components/PostDrawer.vue"; // Import PostDrawer

const settingsStore = useSettingStore();
const userStore = useUserStore();

// TODO: Add TS type
const posts = ref<unknown>([]);
const page = ref<number>(1);
const showSiteSetupCard = ref<boolean>(false);
const state = ref<InfiniteScrollStateType>();
const drawerVisible = ref(false); // Control drawer visibility
const selectedSlug = ref(""); // Store selected post slug

async function isSetup() {
  try {
    const response = await isSiteSetup();
    showSiteSetupCard.value = !response.data.is_setup;
  } catch (error) {
    console.error(error);
  }
}

function handleOpenDrawer(slug: string) {
  selectedSlug.value = slug;
  drawerVisible.value = true;
}

async function getBoardPosts() {
  state.value = "LOADING";

  try {
    const response = await getPosts({
      page: page.value,
      sort: "DESC",
    });

    if (response.data.posts.length) {
      posts.value.push(...response.data.posts);
      page.value += 1;
      state.value = "LOADED";
    } else {
      state.value = "COMPLETED";
    }
  } catch (error) {
    console.error(error);
    state.value = "ERROR";
  }
}

onMounted(() => isSetup());

useHead({
  title: "Home",
  meta: [
    {
      name: "og:title",
      content: () => `Home • ${settingsStore.get.title}`,
    },
  ],
});
</script>

<style lang="sass">
.homepage-container
  width: 100%
  max-width: 100%
  margin: 0 auto
  padding: 0 1rem
  box-sizing: border-box
  overflow-x: hidden
</style>

<style lang="css">
.home-title {
  font-weight: 500;
  font-style: Medium;
  font-size: 32px;
  line-height: 110.00000000000001%;
  vertical-align: middle;
  padding: 16px;
}
</style>