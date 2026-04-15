<!-- src/modules/dashboard/components/BorrowingsFacultyChart.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js'
import { borrowingsByFaculty } from '../data/mockDashboard'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

const chartData = computed(() => ({
  labels: [...borrowingsByFaculty.labels],
  datasets: [
    {
      label: 'Borrowings',
      data: [...borrowingsByFaculty.data],
      backgroundColor: '#2F6FB2',
      borderRadius: 4,
      borderSkipped: false,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 10 }, color: '#727272' },
    },
    y: {
      min: 0,
      max: 160,
      grid: { color: '#F0F0F0' },
      border: { display: false },
      ticks: { stepSize: 40, font: { size: 11 }, color: '#727272' },
    },
  },
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
    <h3 class="text-sm font-display font-medium text-text-primary mb-4">Borrowings by Faculty</h3>
    <div class="h-[200px]">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
