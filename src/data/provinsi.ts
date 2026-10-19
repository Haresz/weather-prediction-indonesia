export interface Provinsi {
  nama: string;
  latitude: number;
  longitude: number;
}

export const PROVINSI_DEFAULT: string = 'Kalimantan Timur';

export const daftarProvinsi: Provinsi[] = [
  { nama: 'Aceh', latitude: 5.54, longitude: 95.33 },
  { nama: 'Bali', latitude: -8.65, longitude: 115.22 },
  { nama: 'Banten', latitude: -6.12, longitude: 106.15 },
  { nama: 'Bengkulu', latitude: -3.79, longitude: 102.26 },
  { nama: 'DI Yogyakarta', latitude: -7.8, longitude: 110.36 },
  { nama: 'DKI Jakarta', latitude: -6.21, longitude: 106.85 },
  { nama: 'Gorontalo', latitude: 0.54, longitude: 123.06 },
  { nama: 'Jambi', latitude: -1.61, longitude: 103.62 },
  { nama: 'Jawa Barat', latitude: -6.92, longitude: 107.61 },
  { nama: 'Jawa Tengah', latitude: -6.99, longitude: 110.42 },
  { nama: 'Jawa Timur', latitude: -7.26, longitude: 112.75 },
  { nama: 'Kalimantan Barat', latitude: -0.03, longitude: 109.34 },
  { nama: 'Kalimantan Selatan', latitude: -3.33, longitude: 114.59 },
  { nama: 'Kalimantan Tengah', latitude: -2.21, longitude: 113.91 },
  { nama: 'Kalimantan Timur', latitude: -0.5, longitude: 117.15 },
  { nama: 'Kalimantan Utara', latitude: 3.33, longitude: 117.63 },
  { nama: 'Kepulauan Bangka Belitung', latitude: -2.13, longitude: 106.11 },
  { nama: 'Kepulauan Riau', latitude: 0.92, longitude: 104.46 },
  { nama: 'Lampung', latitude: -5.45, longitude: 105.27 },
  { nama: 'Maluku', latitude: -3.7, longitude: 128.17 },
  { nama: 'Maluku Utara', latitude: 0.79, longitude: 127.38 },
  { nama: 'Nusa Tenggara Barat', latitude: -8.58, longitude: 116.12 },
  { nama: 'Nusa Tenggara Timur', latitude: -10.18, longitude: 123.6 },
  { nama: 'Papua', latitude: -2.53, longitude: 140.72 },
  { nama: 'Papua Barat', latitude: -0.86, longitude: 134.06 },
  { nama: 'Papua Barat Daya', latitude: -0.88, longitude: 131.25 },
  { nama: 'Papua Pegunungan', latitude: -4.1, longitude: 138.95 },
  { nama: 'Papua Selatan', latitude: -8.49, longitude: 140.4 },
  { nama: 'Papua Tengah', latitude: -3.36, longitude: 135.49 },
  { nama: 'Riau', latitude: 0.51, longitude: 101.45 },
  { nama: 'Sulawesi Barat', latitude: -2.67, longitude: 118.89 },
  { nama: 'Sulawesi Selatan', latitude: -5.15, longitude: 119.43 },
  { nama: 'Sulawesi Tengah', latitude: -0.9, longitude: 119.88 },
  { nama: 'Sulawesi Tenggara', latitude: -3.99, longitude: 122.51 },
  { nama: 'Sulawesi Utara', latitude: 1.47, longitude: 124.84 },
  { nama: 'Sumatera Barat', latitude: -0.95, longitude: 100.41 },
  { nama: 'Sumatera Selatan', latitude: -2.97, longitude: 104.77 },
  { nama: 'Sumatera Utara', latitude: 3.59, longitude: 98.67 },
];
