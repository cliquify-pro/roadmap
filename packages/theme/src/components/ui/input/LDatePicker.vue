<template>
  <div class="l-date-picker">
    <label :for="id" class="label">{{ label }}</label>
    <input
      :id="id"
      v-model="internalValue"
      type="date"
      :disabled="disabled"
      :placeholder="placeholder"
      class="input"
      @input="$emit('update:modelValue', internalValue)"
      @blur="validate"
    />
    <span v-if="hasError && error.show" class="error-message">{{ error.message }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { FormFieldErrorType } from "./formBaseProps";

const props = defineProps<{
  modelValue: string | null; // v-model binding
  label: string;
  disabled?: boolean;
  placeholder?: string;
  error?: FormFieldErrorType; // Optional error prop
}>();

const emit = defineEmits(["update:modelValue"]);

const id = `date-picker-${Math.random().toString(36).substr(2, 9)}`; // Unique ID
const internalValue = ref<string | null>(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    internalValue.value = newVal;
  },
);

const error = computed(() => props.error || { show: false, message: "" }); // Default empty object if undefined
const hasError = computed(() => props.error !== undefined); // Check if error prop is provided

function validate() {
  if (!internalValue.value && hasError.value) {
    error.value.show = true;
    error.value.message = "Date is required";
  } else if (hasError.value) {
    error.value.show = false;
    error.value.message = "";
  }
}
</script>

<style scoped>
.l-date-picker {
  margin-bottom: 1rem;
}

.label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}
</style>