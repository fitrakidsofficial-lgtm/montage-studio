import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const FPS = 30;
const DURATION = 49.2;

const C = {
  night: "#061A2A",
  gold: "#F8B831",
  teal: "#1D776A",
  orange: "#C6611D",
  white: "#F7FAF9",
  ink: "#102536",
};

const A = {
  facecam: staticFile(
    "opinion-series/01-illustration-verset-2/facecam-projet-livret.mp4",
  ),
  star: staticFile(
    "opinion-series/01-illustration-verset-2/option-a-etoile.png",
  ),
  earth: staticFile(
    "opinion-series/01-illustration-verset-2/option-b-terre.png",
  ),
  pageStar: staticFile(
    "opinion-series/01-illustration-verset-2/contexte-a-page-etoile.png",
  ),
  pageEarth: staticFile(
    "opinion-series/01-illustration-verset-2/contexte-b-page-terre.png",
  ),
  headerA: staticFile(
    "opinion-series/02-entete-page/option-a-entete-epuree.png",
  ),
  headerB: staticFile(
    "opinion-series/02-entete-page/option-b-entete-kids-moderne.png",
  ),
  headerC: staticFile(
    "opinion-series/02-entete-page/option-c-entete-arrondie.png",
  ),
  logo: staticFile("fitra-kids-logo.png"),
};

type Subtitle = { start: number; end: number; text: string };

const SUBTITLES: Subtitle[] = [
  {
    start: 0,
    end: 3.3,
    text: "Je travaille sur un projet qui me tient réellement à cœur :",
  },
  {
    start: 3.3,
    end: 6.5,
    text: "créer un livret Mission Sourates, un vrai livret,",
  },
  {
    start: 6.5,
    end: 10.8,
    text: "pour aider les enfants à découvrir, comprendre et mémoriser les sourates de façon ludique.",
  },
  {
    start: 10.8,
    end: 14.45,
    text: "Mais je ne veux pas le créer, cette fois-ci, seule dans mon coin.",
  },
  {
    start: 14.45,
    end: 16.8,
    text: "Puisqu’il est destiné à vos enfants, à nos enfants,",
  },
  {
    start: 16.8,
    end: 19.16,
    text: "j’ai envie de le créer avec vous, et surtout avec eux.",
  },
  {
    start: 19.16,
    end: 23.35,
    text: "Régulièrement, je vais vous montrer plusieurs versions d’une page,",
  },
  {
    start: 23.35,
    end: 26.05,
    text: "d’une illustration ou d’une activité, et vous pourrez m’aider à choisir.",
  },
  {
    start: 26.64,
    end: 31.4,
    text: "On commence aujourd’hui avec la sourate Al-Fatiha, l’Ouverture.",
  },
  {
    start: 31.4,
    end: 34.85,
    text: "Pour illustrer l’expression « Seigneur des mondes », j’hésite entre deux images :",
  },
  {
    start: 34.85,
    end: 38.9,
    text: "la version A, l’étoile, et la version B, la Terre.",
  },
  {
    start: 38.9,
    end: 42.1,
    text: "Laquelle parle le mieux à votre enfant ?",
  },
  {
    start: 42.1,
    end: 44.8,
    text: "Demandez-lui et écrivez A ou B en commentaire.",
  },
  {
    start: 44.8,
    end: 48.32,
    text: "Votre choix participera vraiment à la création de ce livret.",
  },
  { start: 48.32, end: 49.2, text: "Je compte sur vous." },
];

const rangeOpacity = (
  frame: number,
  start: number,
  end: number,
  edge = 9,
) =>
  Math.min(
    interpolate(frame, [start, start + edge], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }),
    interpolate(frame, [end - edge, end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.quad),
    }),
  );

function BrandHeader() {
  return (
    <div
      style={{
        position: "absolute",
        top: 38,
        left: 42,
        right: 42,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          padding: "11px 18px",
          borderRadius: 999,
          background: "rgba(6,26,42,.82)",
          border: "1px solid rgba(255,255,255,.15)",
          color: C.gold,
          fontFamily: "'Poppins', sans-serif",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 2.2,
        }}
      >
        MISSION SOURATES · AVIS 01
      </div>
      <div
        style={{
          padding: "8px 14px",
          borderRadius: 18,
          background: "rgba(247,250,249,.92)",
          display: "flex",
        }}
      >
        <Img src={A.logo} style={{ width: 112, height: 43, objectFit: "contain" }} />
      </div>
    </div>
  );
}

function SubtitleLayer() {
  const frame = useCurrentFrame();
  const time = frame / FPS;
  const current = SUBTITLES.find((s) => time >= s.start && time < s.end);
  if (!current) return null;

  const localStart = Math.round(current.start * FPS);
  const opacity = interpolate(frame, [localStart, localStart + 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        right: 48,
        bottom: 112,
        zIndex: 60,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 940,
          borderRadius: 26,
          padding: "21px 30px 23px",
          background: "rgba(6,26,42,.90)",
          border: "2px solid rgba(248,184,49,.62)",
          boxShadow: "0 12px 28px rgba(0,0,0,.30)",
          color: C.white,
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: current.text.length > 86 ? 37 : 42,
          lineHeight: 1.28,
          textAlign: "center",
        }}
      >
        {current.text}
      </div>
    </div>
  );
}

function FullPageBroll() {
  const frame = useCurrentFrame();
  const start = 114;
  const end = 324;
  const opacity = rangeOpacity(frame, start, end);
  if (opacity <= 0) return null;

  const rise = interpolate(frame, [start, end], [20, -20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        zIndex: 20,
        opacity,
        background: `linear-gradient(155deg, ${C.night}, #0C3140)`,
        alignItems: "center",
        paddingTop: 150,
      }}
    >
      <div
        style={{
          color: C.white,
          fontFamily: "'Luckiest Guy', sans-serif",
          fontSize: 65,
          textAlign: "center",
          lineHeight: 1.05,
          marginBottom: 30,
        }}
      >
        UN VRAI LIVRET
        <br />
        <span style={{ color: C.gold }}>MISSION SOURATES</span>
      </div>
      <div
        style={{
          height: 1290,
          width: 910,
          borderRadius: 34,
          padding: 20,
          background: C.white,
          boxShadow: "0 28px 70px rgba(0,0,0,.38)",
          transform: `translateY(${rise}px) rotate(-1.2deg)`,
          overflow: "hidden",
        }}
      >
        <Img
          src={A.pageEarth}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </AbsoluteFill>
  );
}

function VariantsBroll() {
  const frame = useCurrentFrame();
  const start = 570;
  const end = 792;
  const opacity = rangeOpacity(frame, start, end);
  if (opacity <= 0) return null;

  const items = [
    { label: "A", src: A.headerA, color: C.gold },
    { label: "B", src: A.headerB, color: C.teal },
    { label: "C", src: A.headerC, color: C.orange },
  ];

  return (
    <AbsoluteFill
      style={{
        zIndex: 21,
        opacity,
        background: C.white,
        padding: "160px 48px 250px",
      }}
    >
      <div
        style={{
          fontFamily: "'Luckiest Guy', sans-serif",
          fontSize: 68,
          color: C.night,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        PLUSIEURS VERSIONS
      </div>
      <div
        style={{
          marginTop: 18,
          marginBottom: 54,
          color: C.teal,
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          fontSize: 32,
          textAlign: "center",
        }}
      >
        pour choisir ensemble
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {items.map((item, index) => {
          const itemOpacity = interpolate(
            frame,
            [start + index * 18, start + index * 18 + 12],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <div
              key={item.label}
              style={{
                position: "relative",
                padding: 16,
                borderRadius: 30,
                background: "white",
                border: `4px solid ${item.color}`,
                boxShadow: "0 14px 34px rgba(6,26,42,.15)",
                opacity: itemOpacity,
                overflow: "hidden",
              }}
            >
              <Img src={item.src} style={{ width: "100%", display: "block" }} />
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: 18,
                  width: 68,
                  height: 68,
                  borderRadius: 20,
                  background: item.color,
                  color: item.label === "A" ? C.night : C.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Luckiest Guy', sans-serif",
                  fontSize: 45,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function FatihaBroll() {
  const frame = useCurrentFrame();
  const start = 798;
  const end = 944;
  const opacity = rangeOpacity(frame, start, end);
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{
        zIndex: 22,
        opacity,
        background: `linear-gradient(160deg, ${C.night}, #0C3140)`,
        alignItems: "center",
        paddingTop: 150,
      }}
    >
      <div
        style={{
          padding: "12px 28px",
          borderRadius: 999,
          background: C.gold,
          color: C.night,
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 600,
          letterSpacing: 2,
          fontSize: 28,
        }}
      >
        PREMIER CHOIX
      </div>
      <div
        style={{
          marginTop: 28,
          color: C.white,
          fontFamily: "'Luckiest Guy', sans-serif",
          fontSize: 86,
        }}
      >
        AL-FATIHA
      </div>
      <div
        style={{
          marginTop: 35,
          width: 900,
          height: 1330,
          borderRadius: 34,
          background: "white",
          padding: 18,
          overflow: "hidden",
          boxShadow: "0 28px 70px rgba(0,0,0,.38)",
        }}
      >
        <Img
          src={A.pageStar}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </AbsoluteFill>
  );
}

function SingleChoiceBroll({
  start,
  end,
  letter,
  label,
  src,
  color,
  imageSize,
}: {
  start: number;
  end: number;
  letter: "A" | "B";
  label: string;
  src: string;
  color: string;
  imageSize: number;
}) {
  const frame = useCurrentFrame();
  const opacity = rangeOpacity(frame, start, end, 7);
  if (opacity <= 0) return null;

  const scale = interpolate(frame, [start, end], [0.96, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        zIndex: 24,
        opacity,
        background: `linear-gradient(155deg, ${C.night}, #0C3140)`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 920,
          height: 1270,
          borderRadius: 48,
          background: C.white,
          border: `6px solid ${color}`,
          boxShadow: "0 30px 80px rgba(0,0,0,.34)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            width: 104,
            height: 104,
            borderRadius: 32,
            background: color,
            color: letter === "A" ? C.night : C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: 66,
          }}
        >
          {letter}
        </div>
        <div
          style={{
            color: C.ink,
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: 74,
            marginBottom: 70,
          }}
        >
          {label}
        </div>
        <Img
          src={src}
          style={{
            width: imageSize,
            height: imageSize,
            objectFit: "contain",
            transform: `scale(${scale})`,
            filter: "drop-shadow(0 22px 22px rgba(6,26,42,.20))",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function PagesComparisonBroll() {
  const frame = useCurrentFrame();
  const start = 1170;
  const end = 1288;
  const opacity = rangeOpacity(frame, start, end, 7);
  if (opacity <= 0) return null;

  const pages = [
    { label: "A", src: A.pageStar, color: C.gold },
    { label: "B", src: A.pageEarth, color: C.teal },
  ];

  return (
    <AbsoluteFill
      style={{
        zIndex: 25,
        opacity,
        background: C.night,
        padding: "145px 42px 250px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontFamily: "'Luckiest Guy', sans-serif",
          fontSize: 66,
          color: C.white,
          marginBottom: 34,
        }}
      >
        DANS LA PAGE DU LIVRET
      </div>
      <div
        style={{
          display: "flex",
          gap: 24,
          justifyContent: "center",
          marginTop: 120,
        }}
      >
        {pages.map((page) => (
          <div
            key={page.label}
            style={{
              width: 480,
              height: 730,
              borderRadius: 30,
              padding: 12,
              background: "white",
              border: `5px solid ${page.color}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Img
              src={page.src}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                width: 72,
                height: 72,
                borderRadius: 22,
                background: page.color,
                color: page.label === "A" ? C.night : C.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Luckiest Guy', sans-serif",
                fontSize: 48,
              }}
            >
              {page.label}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function FinalVoteOverlay() {
  const frame = useCurrentFrame();
  const start = 1280;
  const end = 1476;
  const opacity = rangeOpacity(frame, start, end, 9);
  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 45,
        top: 135,
        left: 64,
        right: 64,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          padding: "18px 34px",
          borderRadius: 30,
          background: "rgba(6,26,42,.90)",
          border: `3px solid ${C.gold}`,
          color: C.white,
          fontFamily: "'Luckiest Guy', sans-serif",
          fontSize: 66,
          lineHeight: 1,
          boxShadow: "0 14px 32px rgba(0,0,0,.25)",
        }}
      >
        A OU B ?
      </div>
      <div
        style={{
          marginTop: 14,
          padding: "10px 22px",
          borderRadius: 999,
          background: C.gold,
          color: C.night,
          fontFamily: "'Poppins', sans-serif",
          fontSize: 26,
          fontWeight: 600,
        }}
      >
        DEMANDEZ À VOTRE ENFANT
      </div>
    </div>
  );
}

export const OpinionEpisode01Facecam = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <OffthreadVideo
      src={A.facecam}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      volume={1}
    />
    <BrandHeader />
    <FullPageBroll />
    <VariantsBroll />
    <FatihaBroll />
    <SingleChoiceBroll
      start={1038}
      end={1122}
      letter="A"
      label="L’ÉTOILE"
      src={A.star}
      color={C.gold}
      imageSize={650}
    />
    <SingleChoiceBroll
      start={1110}
      end={1194}
      letter="B"
      label="LA TERRE"
      src={A.earth}
      color={C.teal}
      imageSize={710}
    />
    <PagesComparisonBroll />
    <FinalVoteOverlay />
    <SubtitleLayer />
  </AbsoluteFill>
);

export const OPINION_EPISODE_01_FACECAM_FRAMES = Math.round(DURATION * FPS);
