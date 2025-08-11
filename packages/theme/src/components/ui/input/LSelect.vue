<template>
  <label class="input">
    <p v-if="label" data-test="input-field-label" class="input-field-label">{{ label }}</p>
    <select
      data-test="input-field"
      class="input-field input-select"
      :class="{ 'input-field-disabled': disabled, 'input-error': error.show }"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @change="input"
    >
    <option value="" disabled selected>{{ placeholder }}</option>
    <option v-for="option in options" :key="option.id" :value="option.id">
        {{ option.name }}
      </option>
    </select>
    <p v-if="error.show" data-test="input-error-message" class="input-error-message">
      {{ error.message }}
    </p>
  </label>
</template>

<script setup lang="ts">
import type { FormFieldErrorType } from "./formBaseProps";
import { formBaseProps } from "./formBaseProps";
import { formInputBind } from "./formInputBind";

defineProps({
  options: {
    type: Array as () => { id: string; name: string }[],
    required: true,
  },
  ...formBaseProps,
  ...formInputBind,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

function input(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:modelValue", value);
}
</script>

<style scoped>
.input {
  display: block;
  margin-bottom: 1rem;
}

.input-field-label {
  display: block;
  font-size: 0.875rem;
  color: #333;
  margin-bottom: 0.25rem;
}

.input-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1rem;
}

.input-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
}

.input-field-disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.input-error {
  border-color: #dc3545;
}

.input-error-message {
  font-size: 0.75rem;
  color: #dc3545;
  margin-top: 0.25rem;
}
</style>