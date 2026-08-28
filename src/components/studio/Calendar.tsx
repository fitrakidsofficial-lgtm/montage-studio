"use client";

import { useState, useEffect, useMemo } from "react";
import {
  loadSequences,
  saveSequences,
  type ContentSequence,
  type ContentFormat,
} from "@/lib/studio-types";

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const FORMAT_DOTS: Record<ContentFormat, string> = {
  carrousel: "bg-purple-500",
  reel: "bg-pink-500",
  story: "bg-amber-500",
  image: "bg-teal-500",
};

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  // Monday = 0
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= lastDay; d++) days.push(d);
  return days;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface Props {
  projectId: string;
}

export function Calendar({ projectId }: Props) {
  const [sequences, setSequences] = useState<ContentSequence[]>([]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragSeqId, setDragSeqId] = useState<string | null>(null);

  useEffect(() => {
    // Restore only the active project's editorial calendar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSequences(loadSequences(projectId));
  }, [projectId]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const byDate = useMemo(() => {
    const map: Record<string, ContentSequence[]> = {};
    for (const seq of sequences) {
      if (seq.scheduledDate) {
        if (!map[seq.scheduledDate]) map[seq.scheduledDate] = [];
        map[seq.scheduledDate].push(seq);
      }
    }
    return map;
  }, [sequences]);

  const unscheduled = sequences.filter((s) => !s.scheduledDate);
  const selectedContents = selectedDate ? byDate[selectedDate] || [] : [];

  const scheduleToDate = (seqId: string, date: string) => {
    const updated = sequences.map((s) =>
      s.id === seqId ? { ...s, scheduledDate: date } : s,
    );
    setSequences(updated);
    saveSequences(updated, projectId);
  };

  const unschedule = (seqId: string) => {
    const updated = sequences.map((s) =>
      s.id === seqId ? { ...s, scheduledDate: undefined } : s,
    );
    setSequences(updated);
    saveSequences(updated, projectId);
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const today = new Date();
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Calendrier editorial</h2>
        <p className="text-sm text-zinc-500">
          Glisse tes sequences sur les jours pour planifier.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              &larr;
            </button>
            <h3 className="text-sm font-bold text-zinc-200">
              {MONTHS_FR[month]} {year}
            </h3>
            <button
              onClick={nextMonth}
              className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              &rarr;
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_FR.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] text-zinc-600 font-medium py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="h-20" />;
              }
              const dateStr = toDateStr(year, month, day);
              const contents = byDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("ring-1", "ring-amber-500");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove(
                      "ring-1",
                      "ring-amber-500",
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(
                      "ring-1",
                      "ring-amber-500",
                    );
                    if (dragSeqId) {
                      scheduleToDate(dragSeqId, dateStr);
                      setDragSeqId(null);
                    }
                  }}
                  className={`h-20 rounded-lg p-1.5 text-left transition-colors ${
                    isSelected
                      ? "bg-zinc-700 border border-amber-500"
                      : isToday
                        ? "bg-zinc-800/80 border border-zinc-600"
                        : "bg-zinc-900 border border-zinc-800/50 hover:border-zinc-600"
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium ${isToday ? "text-amber-400" : "text-zinc-400"}`}
                  >
                    {day}
                  </div>
                  {contents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {contents.map((c) => (
                        <div
                          key={c.id}
                          className={`w-2 h-2 rounded-full ${FORMAT_DOTS[c.format]}`}
                          title={c.subject}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 space-y-4">
          {/* Selected day detail */}
          {selectedDate && (
            <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-300 mb-2">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                  "fr-FR",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  },
                )}
              </h4>
              {selectedContents.length === 0 ? (
                <p className="text-[11px] text-zinc-600">
                  Rien de prevu. Glisse un contenu ici.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedContents.map((c) => (
                    <div
                      key={c.id}
                      className="bg-zinc-800 rounded-lg p-2 text-xs"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${FORMAT_DOTS[c.format]}`}
                        />
                        <span className="text-zinc-300 font-medium truncate">
                          {c.subject}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        {c.slides.length} slides
                      </div>
                      <button
                        onClick={() => unschedule(c.id)}
                        className="text-[10px] text-zinc-600 hover:text-red-400 mt-1"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unscheduled (draggable) */}
          {unscheduled.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2">
                Non planifies ({unscheduled.length})
              </h4>
              <div className="space-y-1.5">
                {unscheduled.map((seq) => (
                  <div
                    key={seq.id}
                    draggable
                    onDragStart={() => setDragSeqId(seq.id)}
                    onDragEnd={() => setDragSeqId(null)}
                    className="bg-zinc-800 rounded-lg p-2.5 cursor-grab active:cursor-grabbing border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${FORMAT_DOTS[seq.format]}`}
                      />
                      <span className="text-xs text-zinc-300 font-medium truncate">
                        {seq.subject}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">
                      {seq.slides.length} slides
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sequences.length === 0 && (
            <div className="text-xs text-zinc-600 text-center py-8">
              Genere des sequences dans l&apos;onglet Planifier pour les voir
              ici.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
