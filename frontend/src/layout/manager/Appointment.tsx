import { useState, useRef, useEffect } from "react";
import {
  CalendarDays, Clock, User, Mail, Phone,
  MoreVertical, Check, X, CheckCircle2, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: number;
  time: string;
  name: string;
  service: string;
  barber: string;
};

type DateGroup = {
  label: string;
  sortKey: string;
  appointments: Appointment[];
};

type PendingRequest = {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string;
  barber: string;
  dateLabel: string;
  dateSortKey: string;
  dateGroupLabel: string;
  time: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_APPROVED: DateGroup[] = [
  {
    label: "Monday, April 20, 2026",
    sortKey: "2026-04-20",
    appointments: [
      { id: 1, time: "9:00 AM",  name: "Carlos Lopez",   service: "Deluxe Haircut + Hot Towel",   barber: "Miguel Santos" },
      { id: 2, time: "11:00 AM", name: "Luis Martinez",  service: "Beard Trim",                   barber: "Jose Garcia"   },
      { id: 3, time: "1:00 PM",  name: "Ana Rodriguez",  service: "Kids Haircut",                 barber: "Ramon Cruz"    },
    ],
  },
  {
    label: "Tuesday, April 21, 2026",
    sortKey: "2026-04-21",
    appointments: [
      { id: 4, time: "10:00 AM", name: "Roberto Cruz",   service: "Premium Haircut + Beard Trim", barber: "Carlos Reyes"  },
      { id: 5, time: "4:00 PM",  name: "Sofia Gonzales", service: "Hair Color",                   barber: "Miguel Santos" },
    ],
  },
];

const MOCK_PENDING: PendingRequest[] = [
  {
    id: 1,
    name: "Juan Dela Cruz",
    email: "juan.delacruz@gmail.com",
    phone: "+63 917 123 4567",
    service: "Premium Haircut",
    barber: "Miguel Santos",
    dateLabel: "Apr 22, 2026",
    dateSortKey: "2026-04-22",
    dateGroupLabel: "Wednesday, April 22, 2026",
    time: "10:00 AM",
  },
  {
    id: 2,
    name: "Maria Garcia",
    email: "maria.garcia@gmail.com",
    phone: "+63 928 234 5678",
    service: "Hair Color",
    barber: "Carlos Reyes",
    dateLabel: "Apr 23, 2026",
    dateSortKey: "2026-04-23",
    dateGroupLabel: "Thursday, April 23, 2026",
    time: "2:00 PM",
  },
  {
    id: 3,
    name: "Rico Santos",
    email: "rico.santos@gmail.com",
    phone: "+63 939 345 6789",
    service: "Beard Trim",
    barber: "Ramon Cruz",
    dateLabel: "Apr 22, 2026",
    dateSortKey: "2026-04-22",
    dateGroupLabel: "Wednesday, April 22, 2026",
    time: "3:00 PM",
  },
];

// ─── Action Menu ──────────────────────────────────────────────────────────────

function ActionMenu({ onSelect }: { onSelect: (action: "completed" | "no-show") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-40 bg-white rounded-xl border border-gray-200 shadow-lg py-1 text-sm">
          <button
            onClick={() => { onSelect("completed"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-gray-700"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed
          </button>
          <button
            onClick={() => { onSelect("no-show"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-gray-700"
          >
            <UserX className="w-4 h-4 text-red-400" /> No-show
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Appointment Row ──────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  onRemove,
}: {
  appt: Appointment;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-gray-900 text-sm">{appt.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900 text-sm">{appt.name}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Service: {appt.service}
          <span className="mx-2 text-gray-300">•</span>
          Barber: {appt.barber}
        </p>
      </div>
      <ActionMenu onSelect={() => onRemove(appt.id)} />
    </div>
  );
}

// ─── Pending Card ─────────────────────────────────────────────────────────────

function PendingCard({
  req,
  onApprove,
  onCancel,
}: {
  req: PendingRequest;
  onApprove: (req: PendingRequest) => void;
  onCancel: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-gray-900 text-sm">{req.name}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Mail className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{req.email}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <Phone className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{req.phone}</span>
      </div>
      <div className="border-t border-yellow-200 mb-3" />
      <div className="text-xs text-gray-600 space-y-0.5 mb-4">
        <p><span className="font-medium text-gray-800">Service:</span> {req.service}</p>
        <p><span className="font-medium text-gray-800">Barber:</span> {req.barber}</p>
        <p><span className="font-medium text-gray-800">Date:</span> {req.dateLabel}</p>
        <p><span className="font-medium text-gray-800">Time:</span> {req.time}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onApprove(req)}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-sm h-9"
        >
          <Check className="w-4 h-4" /> Approve
        </Button>
        <Button
          onClick={() => onCancel(req.id)}
          className="bg-red-500 hover:bg-red-600 text-white gap-1.5 text-sm h-9"
        >
          <X className="w-4 h-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

let nextId = 100;

export function Appointment() {
  const [groups,  setGroups]  = useState<DateGroup[]>(INITIAL_APPROVED);
  const [pending, setPending] = useState<PendingRequest[]>(MOCK_PENDING);

  // Remove appointment from group; also remove the group if it becomes empty
  function handleRemove(apptId: number) {
    setGroups(prev =>
      prev
        .map(g => ({ ...g, appointments: g.appointments.filter(a => a.id !== apptId) }))
        .filter(g => g.appointments.length > 0)
    );
  }

  // Approve: remove from pending, add to correct date group (create if needed)
  function handleApprove(req: PendingRequest) {
    setPending(prev => prev.filter(r => r.id !== req.id));
    setGroups(prev => {
      const newAppt: Appointment = {
        id: nextId++,
        time: req.time,
        name: req.name,
        service: req.service,
        barber: req.barber,
      };
      const exists = prev.find(g => g.sortKey === req.dateSortKey);
      if (exists) {
        return prev.map(g =>
          g.sortKey === req.dateSortKey
            ? { ...g, appointments: [...g.appointments, newAppt] }
            : g
        );
      }
      const newGroup: DateGroup = {
        label: req.dateGroupLabel,
        sortKey: req.dateSortKey,
        appointments: [newAppt],
      };
      return [...prev, newGroup].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    });
  }

  function handleCancel(id: number) {
    setPending(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="w-full bg-slate-100 p-6 font-sans min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-500 mt-1">Manage appointment requests and scheduled appointments</p>
      </div>

      <div className="grid grid-cols-[1fr_420px] gap-4 items-start">

        {/* ── Approved Appointments ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900">Approved Appointments</h2>
          <p className="text-sm text-gray-400 mb-5">Scheduled appointments grouped by date</p>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <CalendarDays className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No appointments scheduled.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map(group => (
                <div key={group.sortKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <CalendarDays className="w-5 h-5 text-blue-500" />
                    <span className="font-bold text-gray-900 text-sm">{group.label}</span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {group.appointments.length} appointment{group.appointments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.appointments.map(appt => (
                      <AppointmentRow key={appt.id} appt={appt} onRemove={handleRemove} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Pending Requests ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900">Pending Requests</h2>
          <p className="text-sm text-gray-400 mb-4">{pending.length} pending</p>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Check className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">All requests have been handled.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(req => (
                <PendingCard
                  key={req.id}
                  req={req}
                  onApprove={handleApprove}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}