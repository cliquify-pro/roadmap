<template>
  <div v-if="visible" class="offcanvas-wrapper">
    <!-- Overlay for outside click -->
    <div class="overlay" @click="handleOverlayClick" />

    <transition name="slide">
      <div class="drawer">
        <div class="drawer-header">
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="drawer-body">
          <PostView :slug="slug" />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import PostView from "./PostView.vue";

defineProps<{
  visible: boolean;
  slug: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

function handleOverlayClick(event: MouseEvent) {
  const drawer = (event.target as HTMLElement).closest(".drawer");
  if (!drawer) {
    emit("close");
  }
}
</script>

<style scoped>
.offcanvas-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 9999;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: 700px;
  height: 100vh;
  background-color: #fff;
  z-index: 10001;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  transition: transform 0.3s ease-in-out;
}

.drawer-header {
  padding: 1rem;
  text-align: right;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
}

.drawer-body {
  padding: 1rem;
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>