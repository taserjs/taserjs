<script setup lang="ts">
import { api } from "./api";
import { useApi } from "./composables/useApi";
import Hello from "./Hello.vue";

const { data, loading, error, refetch } = useApi(() => api.$get());
</script>

<template>
  <h1>Vue Router + Taser.js</h1>
  <p v-if="loading">Loading...</p>
  <p v-else-if="error">Request failed</p>
  <p v-else-if="data">{{ data.message }}</p>
  <button :disabled="loading" @click="refetch">Refetch</button>

  <Hello />
</template>
