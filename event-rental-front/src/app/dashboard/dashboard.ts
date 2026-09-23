import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EquipmentStore } from '../equipment/equipment.store';
import { RentalsStore } from '../rentals/rentals.store';

interface CategoryRevenue { name: string; value: number; color: string; dasharray: string; dashoffset: string; }

@Component({ selector: 'app-dashboard', imports: [FormsModule], templateUrl: './dashboard.html', styleUrl: './dashboard.scss' })
export class DashboardComponent {
  readonly rentalsStore = inject(RentalsStore);
  readonly equipmentStore = inject(EquipmentStore);
  private readonly today = new Date();
  private readonly initialPeriod = this.latestRentalPeriod();
  readonly selectedMonth = signal(this.initialPeriod.month);
  readonly selectedYear = signal(this.initialPeriod.year);
  readonly months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  readonly years = computed(() => [...new Set([...this.rentalsStore.rentals().map((r) => Number(r.dateLivraison.slice(0, 4))).filter(Number.isInteger), this.today.getFullYear()])].sort((a, b) => b - a));
  readonly selectedRentals = computed(() => this.rentalsStore.rentals().filter((r) => { const [year, month] = r.dateLivraison.split('-').map(Number); return year === this.selectedYear() && month === this.selectedMonth(); }));
  readonly revenue = computed(() => this.selectedRentals().reduce((sum, r) => sum + r.prixTotal, 0));
  readonly outstanding = computed(() => this.selectedRentals().reduce((sum, r) => sum + Math.max(0, r.prixTotal - r.paid), 0));
  readonly depositToReturn = computed(() => this.selectedRentals().filter((r) => r.statut !== 'Termin\u00e9').reduce((sum, r) => sum + r.caution, 0));
  readonly ongoingCount = computed(() => this.selectedRentals().filter((r) => r.statut === 'En cours').length);
  readonly yearlyRevenue = computed(() => this.months.map((label, index) => ({ label: label.slice(0, 3), value: this.rentalsStore.rentals().filter((r) => { const [year, month] = r.dateLivraison.split('-').map(Number); return year === this.selectedYear() && month === index + 1; }).reduce((sum, r) => sum + r.prixTotal, 0) })));
  readonly chartPoints = computed(() => { const values = this.yearlyRevenue(); const max = Math.max(1, ...values.map((item) => item.value)); return values.map((item, index) => `${10 + index * 28},${110 - (item.value / max) * 88}`).join(' '); });
  readonly categoryRevenue = computed<CategoryRevenue[]>(() => {
    const totals = new Map<number, number>(); const ids = new Set(this.selectedRentals().map((r) => r.id));
    this.rentalsStore.rentalItems().forEach((item) => { if (!ids.has(item.rentalId)) return; const id = this.equipmentStore.equipment().find((e) => e.id === item.materielId)?.categoryId; if (id) totals.set(id, (totals.get(id) ?? 0) + item.total); });
    const total = [...totals.values()].reduce((sum, value) => sum + value, 0); let offset = 0;
    return [...totals.entries()].map(([id, value]) => { const category = this.equipmentStore.categories.find((c) => c.id === id); const percent = total ? value / total * 100 : 0; const segment = { name: category?.name ?? 'Sans catégorie', value, color: category?.color ?? '#94a3b8', dasharray: `${percent} ${100 - percent}`, dashoffset: `${-offset}` }; offset += percent; return segment; });
  });
  private readonly formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  selectMonth(value: string) { this.selectedMonth.set(Number(value)); }
  selectYear(value: string) { this.selectedYear.set(Number(value)); }
  formatAmount(value: number) { return `${this.formatter.format(value)} Ar`; }

  private latestRentalPeriod() {
    const latest = this.rentalsStore.rentals().map((rental) => rental.dateLivraison)
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().at(-1);
    if (!latest) return { month: this.today.getMonth() + 1, year: this.today.getFullYear() };
    const [year, month] = latest.split('-').map(Number);
    return { month, year };
  }
}
