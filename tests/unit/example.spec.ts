import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import Home from '@/views/Home.vue'

vi.mock('@/services/EndPointAccess', () => ({
  default: class {
    theUrl: string
    constructor(url: string) {
      this.theUrl = url
    }
    async getRes() {
      return {
        data: {
          hourly: {
            time: ['2026-10-19T00:00', '2026-10-19T01:00', '2026-10-19T02:00'],
            temperature_2m: [27.4, null, 31.5],
          },
          timezone: 'Asia/Makassar',
          timezone_abbreviation: 'GMT+8',
        },
      }
    }
  },
}))

vi.mock('@/components/SuhuChart.vue', () => ({
  default: {
    name: 'SuhuChart',
    template: '<div data-testid="suhu-chart" />',
  },
}))

describe('Home.vue', () => {
  test('memuat data otomatis dan menampilkan ringkasan, zona waktu, serta tabel', async () => {
    const wrapper = mount(Home)
    await flushPromises()

    const teks = wrapper.text()
    expect(teks).toContain('Kalimantan Timur')
    expect(teks).toContain('Tampilkan Data')
    expect(teks).toContain('Asia/Makassar (GMT+8)')
    expect(teks).toContain('Rata-rata')
    expect(teks).toContain('27.4 °C')
    expect(teks).toContain('31.5 °C')
    expect(teks).toContain('19 Okt 2026, 00:00')

    const baris = wrapper.findAll('tbody tr')
    expect(baris).toHaveLength(3)
    expect(baris[1].text()).toContain('-')
  })

  test('menolak rentang tanggal yang tidak valid', async () => {
    const wrapper = mount(Home)
    await flushPromises()

    await wrapper.setData({ tanggalMulai: '2026-10-20', tanggalAkhir: '2026-10-19' })
    await wrapper.find('ion-button').trigger('click')

    expect(wrapper.text()).toContain('Tanggal akhir tidak boleh sebelum tanggal mulai.')
  })
})
