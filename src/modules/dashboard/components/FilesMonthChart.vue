<!-- src/modules/dashboard/components/FilesMonthChart.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { filesPerMonth } from '../data/mockDashboard'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const chartData = computed(() => ({
  labels: [...filesPerMonth.labels],
  datasets: [
    {
      label: 'Files',
      data: [...filesPerMonth.data],
      borderColor: '#2F6FB2',
      backgroundColor: 'rgba(47, 111, 178, 0.08)',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: '#2F6FB2',
      fill: true,
      tension: 0.4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 11 }, color: '#727272' },
    },
    y: {
      min: 0,
      max: 180,
      grid: { color: '#F0F0F0' },
      border: { display: false, dash: [4, 4] },
      ticks: { stepSize: 45, font: { size: 11 }, color: '#727272' },
    },
  },
}
</script>

<template>
  <div class="bg-white rounded-[10px] border border-border p-5 shadow-sm">
    <h3 class="text-sm font-display font-medium text-text-primary mb-4">Files / Month</h3>
    <div class="h-[200px]">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
