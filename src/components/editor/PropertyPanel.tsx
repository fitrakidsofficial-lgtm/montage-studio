"use client";

import type {
  VideoProject,
  BrollLayout,
  ConceptCard,
  CustomTextContent,
  CtaContent,
  PriceTagContent,
} from "@/lib/types";
import type { SelectedElement } from "./Timeline";

interface Props {
  project: VideoProject;
  update: (patch: Partial<VideoProject>) => void;
  selectedElement: SelectedElement;
  onDeselect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

function TimeInput({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <input
        type="number"
        step={0.1}
        min={0}
        max={max}
        value={Math.round(value * 10) / 10}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(0, Math.min(max, v)));
        }}
        className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white text-right outline-none focus:border-zinc-500"
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-zinc-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-zinc-500 resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-zinc-500"
        />
      )}
    </label>
  );
}

function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-zinc-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">{label}</span>
        <span className="text-[11px] text-zinc-400">
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-white"
      />
    </label>
  );
}

// ── Section wrapper ──

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
        {title}
      </h4>
      {children}
    </div>
  );
}

// ── B-roll properties ──

function BrollProps({
  project,
  update,
  id,
}: {
  project: VideoProject;
  update: (p: Partial<VideoProject>) => void;
  id: string;
}) {
  const broll = project.brolls.find((b) => b.id === id);
  if (!broll) return null;

  const patchBroll = (patch: Partial<typeof broll>) => {
    update({
      brolls: project.brolls.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const dur = project.mainVideoDurationSeconds;

  return (
    <>
      <Section title="Timing">
        <TimeInput
          label="Debut"
          value={broll.startTime}
          onChange={(v) => patchBroll({ startTime: v })}
          max={dur}
        />
        <TimeInput
          label="Fin"
          value={broll.endTime}
          onChange={(v) => patchBroll({ endTime: v })}
          max={dur}
        />
        <div className="text-[10px] text-zinc-600 text-right">
          Duree: {fmt(broll.endTime - broll.startTime)}
        </div>
      </Section>

      <Section title="Affichage">
        <SelectInput<BrollLayout>
          label="Layout"
          value={broll.layout ?? "auto"}
          options={[
            { value: "auto", label: "Auto" },
            { value: "fullscreen", label: "Plein ecran" },
            { value: "bottom-half", label: "Moitie bas" },
            { value: "top-half", label: "Moitie haut" },
            { value: "overlay", label: "Superpose" },
            { value: "picture-in-picture", label: "PiP" },
            { value: "centered-card", label: "Carte centree" },
          ]}
          onChange={(v) => patchBroll({ layout: v })}
        />
      </Section>
    </>
  );
}

// ── Card content editor (type-safe narrowing) ──

function CardContentEditor({
  card,
  patchCard,
}: {
  card: ConceptCard;
  patchCard: (patch: Partial<ConceptCard>) => void;
}) {
  const c = card.content;
  if (c.type === "custom-text") {
    return (
      <>
        {c.lines.map((line, i) => (
          <TextInput
            key={i}
            label={`Ligne ${i + 1}`}
            value={line.text}
            onChange={(v) => {
              const newLines = [...c.lines];
              newLines[i] = { ...newLines[i], text: v };
              patchCard({ content: { ...c, lines: newLines } });
            }}
          />
        ))}
      </>
    );
  }
  if (c.type === "cta") {
    return (
      <>
        <TextInput
          label="Texte principal"
          value={c.mainText}
          onChange={(v) => patchCard({ content: { ...c, mainText: v } })}
        />
        <TextInput
          label="Sous-texte"
          value={c.subText}
          onChange={(v) => patchCard({ content: { ...c, subText: v } })}
        />
      </>
    );
  }
  if (c.type === "price-tag") {
    return (
      <>
        <TextInput
          label="Titre"
          value={c.headline}
          onChange={(v) => patchCard({ content: { ...c, headline: v } })}
        />
        <TextInput
          label="Prix"
          value={c.price}
          onChange={(v) => patchCard({ content: { ...c, price: v } })}
        />
      </>
    );
  }
  return null;
}

// ── Card properties ──

function CardProps({
  project,
  update,
  id,
}: {
  project: VideoProject;
  update: (p: Partial<VideoProject>) => void;
  id: string;
}) {
  const card = project.cards.find((c) => c.id === id);
  if (!card) return null;

  const patchCard = (patch: Partial<typeof card>) => {
    update({
      cards: project.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const dur = project.mainVideoDurationSeconds;

  return (
    <>
      <Section title="Timing">
        <TimeInput
          label="Debut"
          value={card.startTime}
          onChange={(v) => patchCard({ startTime: v })}
          max={dur}
        />
        <TimeInput
          label="Fin"
          value={card.endTime}
          onChange={(v) => patchCard({ endTime: v })}
          max={dur}
        />
      </Section>

      <Section title="Contenu">
        <div className="text-[11px] text-zinc-400">
          Type: <span className="text-zinc-300">{card.content.type}</span>
        </div>
        <CardContentEditor card={card} patchCard={patchCard} />
      </Section>
    </>
  );
}

// ── Zoom properties ──

function ZoomProps({
  project,
  update,
  id,
}: {
  project: VideoProject;
  update: (p: Partial<VideoProject>) => void;
  id: string;
}) {
  const idx = parseInt(id);
  const zoom = (project.zooms ?? [])[idx];
  if (!zoom) return null;

  const patchZoom = (patch: Partial<typeof zoom>) => {
    update({
      zooms: (project.zooms ?? []).map((z, i) =>
        i === idx ? { ...z, ...patch } : z,
      ),
    });
  };

  return (
    <>
      <Section title="Timing">
        <TimeInput
          label="Debut"
          value={zoom.time}
          onChange={(v) => patchZoom({ time: v })}
          max={project.mainVideoDurationSeconds}
        />
        <SliderInput
          label="Duree"
          value={zoom.duration}
          onChange={(v) => patchZoom({ duration: v })}
          min={0.5}
          max={10}
          step={0.5}
          unit="s"
        />
      </Section>

      <Section title="Intensite">
        <SliderInput
          label="Scale"
          value={zoom.scale}
          onChange={(v) => patchZoom({ scale: v })}
          min={1.05}
          max={1.5}
          step={0.05}
          unit="x"
        />
      </Section>
    </>
  );
}

// ── TexteCle properties ──

function TexteCleProps({
  project,
  update,
  id,
}: {
  project: VideoProject;
  update: (p: Partial<VideoProject>) => void;
  id: string;
}) {
  const idx = parseInt(id);
  const tc = (project.texteCles ?? [])[idx];
  if (!tc) return null;

  const patchTc = (patch: Partial<typeof tc>) => {
    update({
      texteCles: (project.texteCles ?? []).map((t, i) =>
        i === idx ? { ...t, ...patch } : t,
      ),
    });
  };

  return (
    <>
      <Section title="Timing">
        <TimeInput
          label="Debut"
          value={tc.time}
          onChange={(v) => patchTc({ time: v })}
          max={project.mainVideoDurationSeconds}
        />
        <SliderInput
          label="Duree"
          value={tc.duration}
          onChange={(v) => patchTc({ duration: v })}
          min={0.5}
          max={10}
          step={0.5}
          unit="s"
        />
      </Section>

      <Section title="Contenu">
        <TextInput
          label="Texte"
          value={tc.text}
          onChange={(v) => patchTc({ text: v })}
          multiline
        />
      </Section>
    </>
  );
}

// ── Pattern interrupt properties ──

function PatternInterruptProps({
  project,
  update,
  id,
}: {
  project: VideoProject;
  update: (p: Partial<VideoProject>) => void;
  id: string;
}) {
  const idx = parseInt(id);
  const pi = (project.patternInterrupts ?? [])[idx];
  if (!pi) return null;

  const patchPi = (patch: Partial<typeof pi>) => {
    update({
      patternInterrupts: (project.patternInterrupts ?? []).map((p, i) =>
        i === idx ? { ...p, ...patch } : p,
      ),
    });
  };

  return (
    <Section title="Timing">
      <TimeInput
        label="Debut"
        value={pi.time}
        onChange={(v) => patchPi({ time: v })}
        max={project.mainVideoDurationSeconds}
      />
      <SliderInput
        label="Duree"
        value={pi.duration}
        onChange={(v) => patchPi({ duration: v })}
        min={0.2}
        max={3}
        step={0.1}
        unit="s"
      />
    </Section>
  );
}

// ── Main PropertyPanel ──

const TYPE_LABELS: Record<string, string> = {
  broll: "B-roll",
  card: "Carte",
  zoom: "Zoom",
  texteCle: "Texte cle",
  patternInterrupt: "Flash",
  silenceCut: "Jump cut",
  subtitle: "Sous-titre",
};

export function PropertyPanel({
  project,
  update,
  selectedElement,
  onDeselect,
  onDuplicate,
  onDelete,
}: Props) {
  const { type, id } = selectedElement;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">
            {TYPE_LABELS[type] ?? type}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">
            {fmt(selectedElement.time)}
          </span>
        </div>
        <button
          onClick={onDeselect}
          className="text-zinc-500 hover:text-white text-xs transition-colors"
        >
          Fermer
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {type === "broll" && (
          <BrollProps project={project} update={update} id={id} />
        )}
        {type === "card" && (
          <CardProps project={project} update={update} id={id} />
        )}
        {type === "zoom" && (
          <ZoomProps project={project} update={update} id={id} />
        )}
        {type === "texteCle" && (
          <TexteCleProps project={project} update={update} id={id} />
        )}
        {type === "patternInterrupt" && (
          <PatternInterruptProps project={project} update={update} id={id} />
        )}
        {type === "silenceCut" && (
          <Section title="Jump cut">
            <div className="text-[11px] text-zinc-400">
              Les jump cuts ne sont pas modifiables directement. Utilisez
              l’agent IA pour les ajuster.
            </div>
          </Section>
        )}
        {type === "subtitle" && (
          <Section title="Sous-titre">
            <div className="text-[11px] text-zinc-400">
              Modifiez les sous-titres via le panneau Sous-titres.
            </div>
          </Section>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-zinc-800/50 flex gap-2">
        <button
          onClick={onDuplicate}
          className="flex-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] text-zinc-300 transition-colors"
          title="Dupliquer (Cmd+D)"
        >
          Dupliquer
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded text-[11px] transition-colors"
          title="Supprimer (Suppr)"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
