

<script lang="ts">
import { defineComponent } from 'vue';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import EndPointAccess from '../services/EndPointAccess';

const FORECAST_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=1&longitude=114&hourly=temperature_2m';

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

interface DataCuaca {
  time: string;
  temp: number;
}

interface ResponsCuaca {
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
}

export default defineComponent({
  name: 'HomePage',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
  },
  data(): { dataCuaca: DataCuaca[]; isLoading: boolean; pesanError: string } {
    return {
      dataCuaca: [],
      isLoading: false,
      pesanError: '',
    };
  },
  methods: {
    formatWaktu(iso: string): string {
      const [tanggal, jam] = iso.split('T');
      const [tahun, bulan, hari] = tanggal.split('-');
      return `${Number(hari)} ${BULAN_INDONESIA[Number(bulan) - 1]} ${tahun}, ${jam}`;
    },
    async ambilData(): Promise<void> {
      this.isLoading = true;
      this.pesanError = '';
      try {
        const akses = new EndPointAccess(FORECAST_URL);
        const res = await akses.getRes();
        const hourly = (res.data as ResponsCuaca).hourly;
        this.dataCuaca = hourly.time
          .map((time, index) => ({ time, temp: hourly.temperature_2m[index] }))
          .slice(0, 10);
      } catch {
        this.dataCuaca = [];
        this.pesanError = 'Gagal mengambil data cuaca. Silakan coba lagi.';
      } finally {
        this.isLoading = false;
      }
    },
  },
});
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Prakiraan Cuaca Sumatra</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="wrap">
        <h1>Prakiraan Cuaca Sumatra</h1>
        <p class="subtitle">Suhu udara per jam (10 data pertama)</p>

        <ion-button @click="ambilData" :disabled="isLoading">
          {{ isLoading ? 'Mengambil data...' : 'Ambil Data' }}
        </ion-button>

        <p v-if="pesanError" class="error">{{ pesanError }}</p>

        <table v-if="dataCuaca.length > 0">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Suhu</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in dataCuaca" :key="item.time">
              <td>{{ formatWaktu(item.time) }}</td>
              <td>{{ item.temp }} °C</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ion-content>
  </ion-page>
</template>


<style scoped>
.wrap {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px;
  text-align: center;
}

.wrap h1 {
  font-size: 22px;
  margin: 0 0 4px;
}

.subtitle {
  color: #666;
  font-size: 14px;
  margin: 0 0 16px;
}

.error {
  color: #b00020;
  font-size: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid #e0e0e0;
}

th {
  background: #3880ff;
  color: #fff;
}

tbody tr:nth-child(even) {
  background: #f5f7fa;
}
</style>
