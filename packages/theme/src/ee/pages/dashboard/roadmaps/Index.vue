<template>
  <div>
    <header class="form-header">
      <breadcrumbs>
        <h5 class="breadcrum-item">Roadmaps</h5>
      </breadcrumbs>

      <Button
        type="primary"
        :disabled="createRoadmapButtonDisabled"
        :loading="createRoadmapButtonLoading"
        @click="createRoadmapHandler"
      >
        Create roadmap
      </Button>
    </header>

    <div class="table-container">
      <div class="table-header">
        <div class="w-14" />
        <div class="table-header-item flex-1">name</div>
        <div class="table-header-item" />
      </div>

      <div class="table-body">
        <draggable
          :list="roadmaps"
          group="roadmap"
          handle=".grip-handler"
          item-key="id"
          :move="moveItem"
          @start="drag = true"
          @end="initialiseSort"
        >
          <template #item="{ element: roadmap }">
            <div class="table-row">
              <div class="grip-handler table-data-icon px-5 py-4">
                <grip-icon />
              </div>
              <div class="table-data flex-1">
                {{ roadmap.name }}
              </div>
              <div class="table-icon-group boards-table-icons">
                <div class="table-data table-data-icon">
                  <eye-icon v-if="roadmap.display" />
                  <eye-off-icon v-else />
                </div>
                <dropdown-wrapper>
                  <template #toggle>
                    <div class="table-data table-data-icon boards-table-icon-settings dropdown-menu-icon">
                      <more-icon />
                    </div>
                  </template>
                  <template #default="dropdown">
                    <dropdown v-if="dropdown.active">
                      <dropdown-item
                        @click="router.push(`/dashboard/roadmaps/${roadmap.url}/settings`)"
                      >
                        <template #icon>
                          <settings-icon />
                        </template>
                        Settings
                      </dropdown-item>
                      <dropdown-item
                        v-if="settings.developer_mode"
                        @click="useCopyText(roadmap.id)"
                      >
                        <template #icon>
                          <copy-icon />
                        </template>
                        Copy ID
                      </dropdown-item>
                      <dropdown-spacer />
                      <dropdown-item
                        :disabled="deleteRoadmapPermissionDisabled"
                        class="color-danger"
                        @click="deleteRoadmapHandler(roadmap.id)"
                      >
                        <template #icon>
                          <delete-icon />
                        </template>
                        Delete
                      </dropdown-item>
                    </dropdown>
                  </template>
                </dropdown-wrapper>
              </div>
            </div>
          </template>
        </draggable>

        <!-- Show fallback message if empty -->
        <div v-if="roadmaps.length === 0 && state !== 'LOADING'" class="p-4 text-center text-gray-500">
          No roadmaps available.
        </div>

        <infinite-scroll @infinite="getRoadmaps" :state="state" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import {
  GripVertical as GripIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  MoreHorizontal as MoreIcon,
  Clipboard as CopyIcon,
  Trash2 as DeleteIcon,
  Settings as SettingsIcon,
} from "lucide-vue";
import draggable from "vuedraggable";
import { useHead } from "@vueuse/head";

// modules
import type { DraggableSortFromToType } from "../../../../types";
import type { Roadmap } from "../../../../modules/roadmaps";
import { router } from "../../../../router";
import { useSettingStore } from "../../../../store/settings";
import { useUserStore } from "../../../../store/user";
import { getAllRoadmaps } from "../../../../modules/roadmaps";
import {
  createRoadmap,
  sortRoadmap,
  deleteRoadmap,
} from "../../../modules/roadmaps";
import { useCopyText } from "../../../../hooks";

// components
import InfiniteScroll, {
  InfiniteScrollStateType,
} from "../../../../components/ui/InfiniteScroll.vue";
import Button from "../../../../components/ui/Button.vue";
import DropdownWrapper from "../../../../components/ui/dropdown/DropdownWrapper.vue";
import Dropdown from "../../../../components/ui/dropdown/Dropdown.vue";
import DropdownItem from "../../../../components/ui/dropdown/DropdownItem.vue";
import DropdownSpacer from "../../../../components/ui/dropdown/DropdownSpacer.vue";
import Breadcrumbs from "../../../../components/Breadcrumbs.vue";

const { settings } = useSettingStore();
const { permissions } = useUserStore();

const roadmaps = ref<Roadmap[]>([]);
const createRoadmapButtonLoading = ref(false);
const sort = ref<DraggableSortFromToType>({
  from: { id: "", index: "" },
  to: { id: "", index: "" },
});
const drag = ref(false);
const state = ref<InfiniteScrollStateType>("IDLE");

const createRoadmapButtonDisabled = computed(() => {
  return !permissions.includes("roadmap:create");
});

const deleteRoadmapPermissionDisabled = computed(() => {
  return !permissions.includes("roadmap:destroy");
});

//  Fetch roadmaps on mount
onMounted(() => {
  getRoadmaps();
});

async function createRoadmapHandler() {
  createRoadmapButtonLoading.value = true;
  try {
    const response = await createRoadmap();
    const url = response.data.roadmap.url;
    router.push(`/dashboard/roadmaps/${url}/settings`);
  } catch (err) {
    console.error(err);
  } finally {
    createRoadmapButtonLoading.value = false;
  }
}

function moveItem(event: any) {
  sort.value.to = {
    id: event.draggedContext.element.id,
    index: event.draggedContext.futureIndex + 1,
  };
  sort.value.from = {
    id: event.relatedContext.element.id,
    index: event.draggedContext.index + 1,
  };
}

async function initialiseSort() {
  try {
    const response = await sortRoadmap(sort.value);
    if (response.status === 200) {
      drag.value = false;
      getRoadmaps();
    }
  } catch (err) {
    console.error(err);
  } finally {
    drag.value = false;
  }
}

// Main roadmap fetch function
async function getRoadmaps() {
  state.value = "LOADING";
  console.log("Fetching roadmaps...");

  try {
    const response = await getAllRoadmaps();
    console.log("API Response:", response);

    if (Array.isArray(response.data.result)) {
      roadmaps.value = response.data.result;
      console.log("Loaded roadmaps:", roadmaps.value.length);
    } else {
      console.warn("Unexpected response format:", response.data);
    }

    state.value = "COMPLETED";
  } catch (err) {
    console.error("Error fetching roadmaps:", err);
    state.value = "ERROR";
  }
}

async function deleteRoadmapHandler(id: string) {
  try {
    const response = await deleteRoadmap(id);
    if (response.status === 204) {
      getRoadmaps();
    }
  } catch (err) {
    console.error(err);
  }
}

useHead({
  title: "Roadmaps • Dashboard",
});
</script>

<style lang="scss">
.roadmap-table-name {
  flex: 6;
}
</style>
