<template>
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <div class="main-content">
        <div class="right-panel">
            <router-view />
            <!-- <PowerBy v-if="settingsStore.get.isPoweredBy" /> -->
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from "../components/Sidebar.vue";
import PowerBy from "../components/PowerBy.vue";
import { useSettingStore } from "../store/settings";

const settingsStore = useSettingStore();
</script>

<style scoped lang="scss">
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(0deg, #5443B1 0%, #5F4176 100%);
  padding: 16px 16px 0 0;
}

.main-content {
  margin-left: 70px;
  flex: 1;
  
}

.right-panel {
  background: #fff;
//  padding: 16px 0 0; 
  padding: 16px;
  position: relative;
  z-index: 0;
  border-radius: 8px;
  min-height: 100dvh;
}
</style>
