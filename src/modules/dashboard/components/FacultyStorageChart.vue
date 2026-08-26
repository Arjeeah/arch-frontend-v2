<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { intlLocale, isolate } from '../utils/format'
import type { FacultyStorageRow } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps<{ rows: FacultyStorageRow[] }>()

const { locale } = useI18n()

const isRtl = computed(() => locale.value === 'ar')

/**
 * The axis numbers are formatted by Chart.js, not by us, so they have to be
 * handed the same Latin-digit locale `utils/format` uses. Passing the bare
 * `'ar'` tag here would print the y-axis in Arabic-Indic digits (٥٠٠ ج.ب) while
 * every other figure on the page stays Latin.
 */
const numberLocale = computed(() => intlLocale(locale.value))

/** Faculty names come in both languages; show the one matching the UI locale. */
const labels = computed(() =>
  props.rows.map((row) => (isRtl.value ? row.nameAr || row.nameEn : row.nameEn || row.nameAr)),
)

const BYTE_UNITS = [
  { suffix: 'B', factor: 1 },
  { suffix: 'KB', factor: 1024 },
  { suffix: 'MB', factor: 1024 ** 2 },
  { suffix: 'GB', factor: 1024 ** 3 },
  { suffix: 'TB', factor: 1024 ** 4 },
] as const

const peakBytes = computed(() => Math.max(0, ...props.rows.map((row) => row.usedBytes)))

/** One unit for the whole axis, chosen from the largest bar. */
const unit = computed(() => {
  for (let i = BYTE_UNITS.length - 1; i >= 0; i -= 1) {
    if (peakBytes.value >= BYTE_UNITS[i]!.factor) return BYTE_UNITS[i]!
  }
  return BYTE_UNITS[0]!
})

const values = computed(() => props.rows.map((row) => row.usedBytes / unit.value.factor))

/**
 * Rounds up to the next "nice" number so the axis has a sensible top and four
 * whole steps. The old chart hard-coded `max: 160`, which silently clipped any
 * bar past it — this scales with whatever the API actually returns.
 */
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (value <= step * magnitude) return step * magnitude
  }
  return 10 * magnitude
}

const axisMax = computed(() => niceCeil(Math.max(...values.value, 0)))

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: unit.value.suffix,
      data: values.value,
      backgroundColor: '#2F6FB2',
      borderRadius: 4,
      borderSkipped: false,
      maxBarThickness: 44,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  locale: numberLocale.value,
  plugins: {
    legend: { display: false },
    tooltip: {
      rtl: isRtl.value,
      textDirection: isRtl.value ? 'rtl' : 'ltr',
      callbacks: {
        // The API already formatted every value ("1.4 GB"); reuse that string
        // rather than re-deriving it from the scaled number on the axis.
        // Isolated because the tooltip runs RTL in Arabic, which would
        // otherwise reorder "1.4 GB" into "GB 1.4".
        label: (context) => isolate(props.rows[context.dataIndex]?.usedFormatted ?? ''),
      },
    },
  },
  scales: {
    x: {
      // Categories read right-to-left in Arabic, matching the rest of the page.
      reverse: isRtl.value,
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 10 }, color: '#727272', autoSkip: false, maxRotation: 0 },
    },
    y: {
      position: isRtl.value ? 'right' : 'left',
      min: 0,
      max: axisMax.value,
      grid: { color: '#F0F0F0' },
      border: { display: false },
      ticks: {
        stepSize: axisMax.value / 4,
        font: { size: 11 },
        color: '#727272',
        // Number and unit isolated together — the canvas inherits the page's
        // RTL direction, which would otherwise print the axis as "GB 500".
        callback: (value) =>
          isolate(
            `${Number(value).toLocaleString(numberLocale.value, { maximumFractionDigits: 1 })} ${unit.value.suffix}`,
          ),
      },
    },
  },
}))
</script>

<template>
  <div class="h-[220px]">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
