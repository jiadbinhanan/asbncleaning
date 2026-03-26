export type BookingRow = {
  id: number;
  booking_ref: string | null;
  cleaning_time: string;
  status: string;
  work_status: string | null;
  unit_number: string;
  building_name: string;
  company_name: string;
  team_name: string | null;
  is_delivered: boolean;
  is_collected: boolean;
};

export type LoadItem = {
  equipment_id: number;
  item_name: string;
  item_type: string;
  suggested_qty: number;
  extra_qty: number;
};

export type ReturnItem = {
  item_name: string;
  item_type: string;
  collected: number;
  qc_good: number;
  qc_bad: number;
};

export const TYPE_COLORS = {
  returnable: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    dot:   "bg-orange-400",
    section: "bg-orange-50 border-orange-100 text-orange-800",
    label: "Linens & Towels",
  },
  refillable: {
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    dot:   "bg-sky-400",
    section: "bg-sky-50 border-sky-100 text-sky-800",
    label: "Dispensers",
  },
  consumable: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot:   "bg-emerald-400",
    section: "bg-emerald-50 border-emerald-100 text-emerald-800",
    label: "Amenities",
  },
} as const;

export const formatTime = (t: string) => {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":");
    const d = new Date(); d.setHours(+h); d.setMinutes(+m);
    const hrs = d.getHours() % 12 || 12;
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins} ${d.getHours() >= 12 ? "PM" : "AM"}`;
  } catch { return t; }
};