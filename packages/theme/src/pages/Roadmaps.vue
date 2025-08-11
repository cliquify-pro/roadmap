<template>
  <div>
    <div class="filter">
      <div>
        <div class="roadmap-title">Roadmap</div>
        <div><input type="text"/></div>
      </div>
      <div class="filter-box">
        <l-select
          v-model="selectedView"
          label="Select View"
          :options="viewOptions"
          placeholder="Choose an option"
          @change="handleViewChange"
        />
        <input
          v-if="selectedView === 'quarterly'"
          v-model.number="selectedYear"
          type="number"
          @change="getRoadmaps"
          min="2025"
          max="2030"
          class="year-input"
          placeholder="Select Year"
        />
      </div>
    </div>

    <div v-if="roadmaps.length > 0" class="roadmap">
      <RoadmapColumn
        v-for="roadmap in roadmaps"
        :key="roadmap.id"
        :roadmap="roadmap"
        @postMoved="onPostMoved"
      />
    </div>

    <p v-if="roadmaps.length === 0">There are no roadmaps.</p>
  </div>
</template>

<script lang="ts">
export default {
  name: "Roadmaps",
};
</script>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useHead } from "@vueuse/head";

// stores & modules
import { getAllRoadmaps } from "../modules/roadmaps";
import { updatePost } from "../modules/posts";
import { useSettingStore } from "../store/settings";

// components
import InfiniteScroll, { InfiniteScrollStateType } from "../components/ui/InfiniteScroll.vue";
import RoadmapColumn from "../ee/components/roadmap/RoadmapColumn.vue";
import LSelect from "../components/ui/input/LSelect.vue";

const { get: siteSettings } = useSettingStore();
const roadmaps = ref<any[]>([]);
const state = ref<InfiniteScrollStateType>();
const selectedView = ref<string>("roadmap");
const selectedYear = ref<number>(new Date().getFullYear());
const viewOptions = ref([
  { id: "roadmap", name: "Roadmap" },
  { id: "quarterly", name: "Quarterly" },
]);

// Fetch roadmaps and store their posts
async function getRoadmaps() {
  state.value = "LOADING";

  try {
    const response = await getAllRoadmaps(
      selectedView.value,
      selectedView.value === "quarterly" ? selectedYear.value : null
    );
    roadmaps.value = response.data.result || [];
    state.value = roadmaps.value.length > 0 ? "LOADED" : "COMPLETED";
  } catch (err) {
    console.error(err);
    state.value = "ERROR";
  }
}

// Handle view change and trigger fetch
function handleViewChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  selectedView.value = value;
  getRoadmaps();
}

// Handle post drag-and-drop between columns
async function onPostMoved({
  postId,
  toRoadmapId,
  newIndex,
}: {
  postId: string;
  toRoadmapId: string;
  newIndex: number;
}) {
  try {
    await updatePost({
      id: postId,
      roadmap_id: toRoadmapId,
    });
    console.log("Post moved successfully");
    getRoadmaps(); // Refresh data after move
  } catch (err) {
    console.error("Failed to update post roadmap", err);
  }
}

useHead({
  title: "Roadmaps",
  meta: [
    {
      name: "og:title",
      content: () => `Roadmaps • ${siteSettings.title}`,
    },
  ],
});

onMounted(() => getRoadmaps());

// Watch for changes in view or year to trigger fetch
watch([selectedView, selectedYear], () => {
  getRoadmaps();
});
</script>

<style lang="sass">
.roadmap
  display: grid
  grid-auto-flow: column
  grid-auto-columns: minmax(22rem, 24rem)
  grid-column-gap: 1rem
  overflow-x: scroll
</style>

<style scoped>
.filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 16px;
}

.filter-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.year-input {
  padding: 0.5rem;
  font-size: 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  width: 100px;
}
.roadmap-title{
font-weight: 500;
font-style: Medium;
font-size: 32px;
line-height: 110.00000000000001%;
vertical-align: middle;
}
</style>