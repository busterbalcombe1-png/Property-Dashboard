import { Router, type IRouter } from "express";
import { db, propertiesTable, tenantsTable, maintenanceTable, refurbTable, operatingCostsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [properties, tenants, maintenance, refurbs, operatingCosts] = await Promise.all([
      db.select().from(propertiesTable),
      db.select().from(tenantsTable),
      db.select().from(maintenanceTable),
      db.select().from(refurbTable),
      db.select().from(operatingCostsTable),
    ]);

    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.status === "occupied").length;
    const vacantProperties = properties.filter(p => p.status === "vacant").length;

    const totalPortfolioValue = properties.reduce((sum, p) => sum + parseFloat(p.currentValue), 0);
    const totalMortgageBalance = properties.reduce((sum, p) => sum + parseFloat(p.monthlyMortgage) * 12 * 20, 0);
    const totalEquity = totalPortfolioValue - totalMortgageBalance;
    const totalPurchaseValue = properties.reduce((sum, p) => sum + parseFloat(p.purchasePrice), 0);

    // Live rent from tenants
    const rentByPropId: Record<number, number> = {};
    for (const t of tenants) {
      rentByPropId[t.propertyId] = (rentByPropId[t.propertyId] ?? 0) + parseFloat(t.monthlyRent);
    }
    const monthlyRentIncome = Object.values(rentByPropId).reduce((a, b) => a + b, 0);

    // Fixed monthly costs
    const monthlyMortgageCosts = properties.reduce((sum, p) => sum + parseFloat(p.monthlyMortgage), 0);

    // Operating costs monthly equivalent (landlord-paid, active only)
    const monthlyOperatingCosts = operatingCosts
      .filter(oc => oc.paidBy === "me" && oc.active)
      .reduce((sum, oc) => {
        const amt = parseFloat(oc.amount as string);
        if (oc.billingPeriod === "quarterly") return sum + amt / 3;
        if (oc.billingPeriod === "annual") return sum + amt / 12;
        return sum + amt;
      }, 0);

    const monthlyExpenses = monthlyMortgageCosts + monthlyOperatingCosts;
    const monthlyCashflow = monthlyRentIncome - monthlyExpenses;
    const annualCashflow = monthlyCashflow * 12;

    const openMaintenanceRequests = maintenance.filter(m => m.status === "open" || m.status === "in_progress").length;
    const activeRefurbProjects = refurbs.filter(r => r.status === "in_progress" || r.status === "planned").length;

    // --- Real cashflow by month (last 12 months) ---
    const now = new Date();

    // Maintenance costs grouped by month (use completedDate or reportedDate)
    const maintenanceCostByMonth: Record<string, number> = {};
    for (const m of maintenance) {
      const dateStr = m.completedDate ?? m.reportedDate;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cost = parseFloat((m.actualCost ?? m.estimatedCost) as string) || 0;
      maintenanceCostByMonth[key] = (maintenanceCostByMonth[key] ?? 0) + cost;
    }

    // Build 12 months of data
    const cashflowByMonth = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const monthLabel = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      // Income: current rent total applies to every month (ongoing recurring)
      // If there are no tenants (no data), this will be 0
      const income = Math.round(monthlyRentIncome);

      // Expenses: fixed costs + any maintenance that occurred this month
      const maintenanceThisMonth = maintenanceCostByMonth[key] ?? 0;
      const expenses = Math.round(monthlyExpenses + maintenanceThisMonth);

      return {
        month: monthLabel,
        income,
        expenses,
        cashflow: income - expenses,
      };
    });

    // Portfolio value history (simulated growth from purchase price to current value)
    const portfolioValueHistory = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const monthLabel = d.toLocaleString("default", { month: "short", year: "2-digit" });
      // Linear interpolation from ~95% of current value 11 months ago to current value now
      const progress = i / 11;
      const value = Math.round(totalPortfolioValue * (0.95 + 0.05 * progress));
      return {
        month: monthLabel,
        value,
        equity: Math.round(value - totalMortgageBalance),
      };
    });

    // Rent by property (use live tenant totals)
    const rentByProperty = properties.map(p => ({
      address: p.address.split(",")[0].trim(),
      rent: rentByPropId[p.id] ?? 0,
    }));

    res.json({
      totalProperties,
      occupiedProperties,
      vacantProperties,
      totalPortfolioValue,
      totalPurchaseValue,
      totalEquity,
      monthlyRentIncome,
      monthlyMortgageCosts,
      monthlyOperatingCosts,
      monthlyExpenses,
      monthlyCashflow,
      annualCashflow,
      totalTenants: tenants.length,
      openMaintenanceRequests,
      activeRefurbProjects,
      cashflowByMonth,
      portfolioValueHistory,
      rentByProperty,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
