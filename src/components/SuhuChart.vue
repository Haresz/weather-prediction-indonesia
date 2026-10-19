<template>
  <div class="chart-wadah">
    <canvas ref="kanvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip);

export interface TitikSuhu {
  time: string;
  temp: number | null;
}

type ChartInstan = ChartJS<'line', (number | null)[], string>;

const BULAN_INDONESIA = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export default defineComponent({
  name: 'SuhuChart',
  props: {
    data: {
      type: Array as PropType<TitikSuhu[]>,
      required: true,
    },
  },
  data(): { chart: ChartInstan | null } {
    return {
      chart: null,
    };
  },
  watch: {
    data: {
      handler() {
        this.gambar();
      },
      deep: true,
    },
  },
  mounted() {
    this.gambar();
  },
  beforeUnmount() {
    this.hancurkan();
  },
  methods: {
    hancurkan(): void {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
    },
    formatRingkas(iso: string): string {
      const [tanggal, jam] = iso.split('T');
      const [, bulan, hari] = tanggal.split('-');
      return `${Number(hari)} ${BULAN_INDONESIA[Number(bulan) - 1]} ${jam}`;
    },
    formatLengkap(iso: string): string {
      const [tanggal, jam] = iso.split('T');
      const [tahun, bulan, hari] = tanggal.split('-');
      return `${Number(hari)} ${BULAN_INDONESIA[Number(bulan) - 1]} ${tahun}, ${jam}`;
    },
    gambar(): void {
      this.hancurkan();
      if (this.data.length === 0) return;
      const el = this.$refs.kanvas as HTMLCanvasElement | undefined;
      if (!el) return;

      this.chart = new ChartJS(el, {
        type: 'line',
        data: {
          labels: this.data.map((d) => this.formatRingkas(d.time)),
          datasets: [
            {
              label: 'Suhu',
              data: this.data.map((d) => d.temp),
              borderColor: '#0284c7',
              backgroundColor: '#0ea5e9',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
              spanGaps: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => {
                  const idx = items[0]?.dataIndex ?? -1;
                  const titik = this.data[idx];
                  return titik ? this.formatLengkap(titik.time) : '';
                },
                label: (item) => {
                  const nilai = item.formattedValue;
                  return `Suhu: ${nilai === 'null' ? '-' : nilai} °C`;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                autoSkip: true,
                maxTicksLimit: 8,
                maxRotation: 0,
              },
            },
            y: {
              title: {
                display: true,
                text: 'Suhu (°C)',
              },
            },
          },
        },
      });
    },
  },
});
</script>

<style scoped>
.chart-wadah {
  position: relative;
  height: 300px;
  width: 100%;
}
</style>
