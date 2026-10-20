
<script lang="ts">
import { defineComponent } from 'vue';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { isAxiosError } from 'axios';
import EndPointAccess from '../services/EndPointAccess';
import SuhuChart from '../components/SuhuChart.vue';
import { daftarProvinsi, PROVINSI_DEFAULT, type Provinsi } from '../data/provinsi';

const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

interface DataCuaca {
  time: string;
  temp: number | null;
}

interface ResponsCuaca {
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
  };
  timezone?: string;
  timezone_abbreviation?: string;
}

function hariIniStr(): string {
  const sekarang = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${sekarang.getFullYear()}-${pad(sekarang.getMonth() + 1)}-${pad(sekarang.getDate())}`;
}

function keMs(dateStr: string): number {
  const [tahun, bulan, hari] = dateStr.split('-').map(Number);
  return Date.UTC(tahun, bulan - 1, hari);
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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSelect,
    IonSelectOption,
    SuhuChart,
  },
  data() {
    return {
      provinsiList: daftarProvinsi,
      provinsiTerpilih: PROVINSI_DEFAULT,
      tanggalMulai: hariIniStr(),
      tanggalAkhir: hariIniStr(),
      dataCuaca: [] as DataCuaca[],
      timezone: '',
      singkatanZona: '',
      isLoading: false,
      pesanValidasi: '',
      pesanError: '',
      dataPernahDiambil: false,
    };
  },
  computed: {
    provinsiAktif(): Provinsi {
      return (
        this.provinsiList.find((p) => p.nama === this.provinsiTerpilih) ?? this.provinsiList[0]
      );
    },
    adaData(): boolean {
      return this.dataCuaca.length > 0;
    },
    ringkasan(): { min: number | null; max: number | null; rata: number | null } {
      const nilai = this.dataCuaca
        .map((d) => d.temp)
        .filter((t): t is number => t !== null);
      if (nilai.length === 0) {
        return { min: null, max: null, rata: null };
      }
      const total = nilai.reduce((a, b) => a + b, 0);
      return {
        min: Math.min(...nilai),
        max: Math.max(...nilai),
        rata: total / nilai.length,
      };
    },
    rentangTeks(): string {
      if (!this.tanggalMulai || !this.tanggalAkhir) return '-';
      return `${this.formatTanggal(this.tanggalMulai)} – ${this.formatTanggal(this.tanggalAkhir)}`;
    },
    infoWaktuTeks(): string {
      if (!this.timezone) return '-';
      return `${this.timezone} (${this.singkatanZona})`;
    },
    pesanKosong(): string {
      if (this.isLoading || this.adaData || this.pesanError) return '';
      return this.dataPernahDiambil
        ? 'Tidak ada data untuk rentang tanggal yang dipilih.'
        : 'Belum ada data. Tekan tombol "Tampilkan Data" untuk memuat prakiraan.';
    },
  },
  mounted() {
    this.ambilData();
  },
  methods: {
    formatTanggal(dateStr: string): string {
      const [tahun, bulan, hari] = dateStr.split('-').map(Number);
      return new Date(tahun, bulan - 1, hari).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    },
    formatWaktu(iso: string): string {
      const [tanggal, jam] = iso.split('T');
      const [tahun, bulan, hari] = tanggal.split('-').map(Number);
      const tgl = new Date(tahun, bulan - 1, hari).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return `${tgl}, ${jam}`;
    },
    formatSuhu(temp: number | null): string {
      return temp === null ? '-' : `${temp} °C`;
    },
    formatRata(nilai: number | null): string {
      return nilai === null ? '-' : `${nilai.toFixed(1)} °C`;
    },
    kelasSuhu(temp: number | null): string {
      if (temp === null) return 'tanpa-data';
      if (temp < 24) return 'suhu-dingin';
      if (temp < 31) return 'suhu-sejuk';
      if (temp <= 34) return 'suhu-panas';
      return 'suhu-sangat-panas';
    },
    validasi(): string {
      if (!this.tanggalMulai || !this.tanggalAkhir) {
        return 'Tanggal mulai dan tanggal akhir wajib diisi.';
      }
      const selisihHari = Math.round((keMs(this.tanggalAkhir) - keMs(this.tanggalMulai)) / 86400000);
      if (selisihHari < 0) {
        return 'Tanggal akhir tidak boleh sebelum tanggal mulai.';
      }
      if (selisihHari + 1 > 7) {
        return 'Rentang tanggal maksimal 7 hari.';
      }
      const batasAkhir = keMs(hariIniStr()) + 15 * 86400000;
      if (keMs(this.tanggalAkhir) > batasAkhir) {
        return 'Prakiraan cuaca maksimal 16 hari ke depan. Silakan pilih tanggal yang lebih dekat.';
      }
      return '';
    },
    bangunUrl(): string {
      const prov = this.provinsiAktif;
      const params = new URLSearchParams({
        latitude: String(prov.latitude),
        longitude: String(prov.longitude),
        hourly: 'temperature_2m',
        timezone: 'auto',
        start_date: this.tanggalMulai,
        end_date: this.tanggalAkhir,
      });
      return `${FORECAST_BASE_URL}?${params.toString()}`;
    },
    async ambilData(): Promise<void> {
      this.pesanValidasi = this.validasi();
      if (this.pesanValidasi) return;

      this.isLoading = true;
      this.pesanError = '';
      try {
        const akses = new EndPointAccess(this.bangunUrl());
        const res = await akses.getRes();
        const body = res.data as ResponsCuaca;
        this.timezone = body.timezone ?? '';
        this.singkatanZona = body.timezone_abbreviation ?? '';
        this.dataCuaca = body.hourly.time.map((time, index) => ({
          time,
          temp: body.hourly.temperature_2m[index] ?? null,
        }));
        this.dataPernahDiambil = true;
      } catch (err) {
        this.dataCuaca = [];
        if (isAxiosError(err) && err.response?.status === 400) {
          this.pesanError =
            'Tanggal ditolak oleh server prakiraan. Pastikan rentang berada dalam jangkauan (maksimal 16 hari ke depan).';
        } else {
          this.pesanError = 'Gagal mengambil data cuaca. Silakan coba lagi.';
        }
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
        <p class="subtitle">Suhu udara per jam dari Open-Meteo</p>

        <ion-card class="kartu">
          <ion-card-header>
            <ion-card-title>Filter</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="filter-grid">
              <label class="field">
                <span>Provinsi</span>
                <ion-select v-model="provinsiTerpilih" interface="popover">
                  <ion-select-option
                    v-for="prov in provinsiList"
                    :key="prov.nama"
                    :value="prov.nama"
                  >
                    {{ prov.nama }}
                  </ion-select-option>
                </ion-select>
              </label>
              <label class="field">
                <span>Tanggal mulai</span>
                <input type="date" v-model="tanggalMulai" />
              </label>
              <label class="field">
                <span>Tanggal akhir</span>
                <input type="date" v-model="tanggalAkhir" />
              </label>
            </div>

            <p v-if="pesanValidasi" class="error">{{ pesanValidasi }}</p>

            <ion-button @click="ambilData" :disabled="isLoading">
              {{ isLoading ? 'Memuat data...' : 'Tampilkan Data' }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <p v-if="pesanError" class="error">{{ pesanError }}</p>

        <ion-card class="kartu">
          <ion-card-header>
            <ion-card-title>Ringkasan</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="ringkasan-grid">
              <div class="ringkasan-item">
                <span class="label">Lokasi</span>
                <span class="nilai">{{ provinsiAktif.nama }}</span>
              </div>
              <div class="ringkasan-item">
                <span class="label">Rentang tanggal</span>
                <span class="nilai">{{ rentangTeks }}</span>
              </div>
              <div class="ringkasan-item">
                <span class="label">Zona waktu</span>
                <span class="nilai">{{ infoWaktuTeks }}</span>
              </div>
              <div class="ringkasan-item">
                <span class="label">Suhu minimum</span>
                <span class="nilai aksen">{{ formatSuhu(ringkasan.min) }}</span>
              </div>
              <div class="ringkasan-item">
                <span class="label">Suhu maksimum</span>
                <span class="nilai aksen">{{ formatSuhu(ringkasan.max) }}</span>
              </div>
              <div class="ringkasan-item">
                <span class="label">Rata-rata</span>
                <span class="nilai aksen">{{ formatRata(ringkasan.rata) }}</span>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="adaData" class="kartu">
          <ion-card-header>
            <ion-card-title>Grafik Suhu</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <suhu-chart :data="dataCuaca" />
          </ion-card-content>
        </ion-card>

        <ion-card v-if="adaData" class="kartu">
          <ion-card-header>
            <ion-card-title>Tabel Suhu</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="tabel-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th class="kolom-suhu">Suhu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in dataCuaca" :key="item.time">
                    <td>{{ formatWaktu(item.time) }}</td>
                    <td class="sel-suhu" :class="kelasSuhu(item.temp)">
                      {{ formatSuhu(item.temp) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ion-card-content>
        </ion-card>

        <p v-if="pesanKosong" class="kosong">{{ pesanKosong }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>


<style scoped>
.wrap {
  max-width: 760px;
  margin: 0 auto;
  padding: 16px 12px 32px;
  font-size: 16px;
  color: #0f172a;
}

.wrap h1 {
  font-size: 24px;
  margin: 8px 0 4px;
  color: #0f172a;
}

.subtitle {
  color: #334155;
  font-size: 16px;
  margin: 0 0 16px;
}

.kartu {
  border-radius: 12px;
  border: 1px solid #e0f2fe;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  margin: 0 0 16px;
}

.kartu ion-card-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  text-align: left;
}

.field ion-select {
  --background: #ffffff;
  font-size: 16px;
  font-weight: 400;
  color: #0f172a;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  min-height: 44px;
}

input[type='date'] {
  font-size: 16px;
  font-family: inherit;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 10px 12px;
  min-height: 44px;
}

input[type='date']:focus {
  outline: 2px solid #38bdf8;
  outline-offset: 1px;
}

.error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 16px;
  margin: 12px 0 0;
}

.ringkasan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.ringkasan-item {
  background: #f8fafc;
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.ringkasan-item .label {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
}

.ringkasan-item .nilai {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.ringkasan-item .nilai.aksen {
  font-size: 20px;
  color: #0369a1;
}

.tabel-scroll {
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #0369a1;
  color: #ffffff;
  font-weight: 700;
  font-size: 16px;
  text-align: left;
  padding: 12px;
}

thead th.kolom-suhu {
  text-align: right;
}

tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  color: #0f172a;
  background: #ffffff;
}

tbody tr:nth-child(even) td {
  background: #f8fafc;
}

tbody tr:hover td {
  background: #e0f2fe;
}

td.sel-suhu {
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}

td.suhu-dingin {
  background: #dbeafe;
  color: #1e3a8a;
}

td.suhu-sejuk {
  background: #dcfce7;
  color: #14532d;
}

td.suhu-panas {
  background: #ffedd5;
  color: #7c2d12;
}

td.suhu-sangat-panas {
  background: #fee2e2;
  color: #7f1d1d;
}

td.tanpa-data {
  color: #64748b;
}

.kosong {
  text-align: center;
  color: #334155;
  font-size: 16px;
  background: #f8fafc;
  border: 1px dashed #7dd3fc;
  border-radius: 12px;
  padding: 16px;
  margin: 0;
}

@media (max-width: 480px) {
  .wrap {
    padding: 12px 8px 24px;
  }

  .wrap h1 {
    font-size: 20px;
  }

  thead th,
  tbody td {
    padding: 8px;
  }
}
</style>
