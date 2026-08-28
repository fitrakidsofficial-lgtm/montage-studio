import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Video,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  spring,
  continueRender,
  delayRender,
} from "remotion";

// ── Constants ──
const BG = "#0B1526";
const CREAM = "#F5E6C8";
const GOLD = "#C9A84C";
const ORANGE = "#F97316";

const FPS = 30;
const FADE = 12; // 0.4s transition

// ── Slide definitions ──
interface SlideBase {
  type: string;
  duration: number; // seconds
  voiceover?: string; // path to voiceover file
}
interface TitleSlide extends SlideBase {
  type: "title";
}
interface ImageSlide extends SlideBase {
  type: "image";
  src: string;
  title: string;
  phoneFrame?: boolean;
}
interface VideoSlide extends SlideBase {
  type: "video";
  src: string;
  title: string;
}
interface RapidSlide extends SlideBase {
  type: "rapid";
  images: string[];
  title: string;
}
interface ClosingSlide extends SlideBase {
  type: "closing";
}

type Slide = TitleSlide | ImageSlide | VideoSlide | RapidSlide | ClosingSlide;

const SLIDES: Slide[] = [
  {
    type: "title",
    duration: 4.5,
    voiceover: "presentation/voiceover/vo-01-opening.m4a",
  },
  {
    type: "image",
    src: "presentation/00-choisir-son-compte.png",
    title: "CHOISIR SON COMPTE",
    duration: 5,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-02-opening.m4a",
  },
  {
    type: "image",
    src: "presentation/00-choisir-la-mission.png",
    title: "CHOISIR LA MISSION",
    duration: 4.5,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-03-opening.m4a",
  },
  {
    type: "image",
    src: "presentation/00-bureau-exploration.png",
    title: "LE BUREAU D'EXPLORATION",
    duration: 5.5,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-04-opening.m4a",
  },
  {
    type: "image",
    src: "presentation/01-ouvrir-le-livre.png",
    title: "OUVRIR LE LIVRE",
    duration: 7,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-05-opening.m4a",
  },
  {
    type: "image",
    src: "presentation/01-deux-facons-de-lire.png",
    title: "DEUX FACONS DE LIRE",
    duration: 5,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-06-opening.m4a",
  },
  {
    type: "video",
    src: "presentation/clip-02.mp4",
    title: "LIVRE INTERACTIF",
    duration: 12,
  },
  {
    type: "image",
    src: "presentation/02-decouvrir-les-versets.png",
    title: "DECOUVRIR LES VERSETS",
    duration: 5.5,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-08-opening.m4a",
  },
  {
    type: "video",
    src: "presentation/clip-03.mp4",
    title: "ECOUTE ET EXPLICATION",
    duration: 47,
  },
  {
    type: "image",
    src: "presentation/03-ecoute.png",
    title: "ECOUTER ATTENTIVEMENT",
    duration: 8.5,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-10-opening.m4a",
  },
  {
    type: "video",
    src: "presentation/clip-04.mp4",
    title: "AUDIO IMMERSIF",
    duration: 40,
  },
  {
    type: "image",
    src: "presentation/04-carte-mentale.png",
    title: "LA CARTE MENTALE",
    duration: 5.5,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-12-opening.m4a",
  },
  {
    type: "rapid",
    images: [
      "presentation/ms-epreuve-20.png",
      "presentation/ms-epreuve-21.png",
      "presentation/ms-epreuve-23.png",
      "presentation/ms-epreuve-24.png",
    ],
    title: "LES EPREUVES",
    duration: 5,
    voiceover: "presentation/voiceover/vo-13-opening.m4a",
  },
  {
    type: "image",
    src: "presentation/06-quiz-final.png",
    title: "LE QUIZ FINAL",
    duration: 4,
    phoneFrame: true,
    voiceover: "presentation/voiceover/vo-quiz-final.m4a",
  },
  {
    type: "rapid",
    images: [
      "presentation/07-boussole-navigation.png",
      "presentation/08-defis.png",
      "presentation/09-badges-et-etoiles.png",
      "presentation/10-trois-questions-surprises.png",
    ],
    title: "ET PLUS ENCORE",
    duration: 6,
  },
  {
    type: "closing",
    duration: 7,
    voiceover: "presentation/voiceover/vo-14-opening.m4a",
  },
];

// Compute total
const TOTAL_SECONDS = SLIDES.reduce((s, sl) => s + sl.duration, 0);
export const TOTAL_FRAMES = Math.round(TOTAL_SECONDS * FPS);

// ── Logo watermark (bottom-right) ──
function LogoWatermark({ opacity = 0.9 }: { opacity?: number }) {
  return (
    <Img
      src={staticFile("presentation/logo.png")}
      style={{
        position: "absolute",
        bottom: 80,
        right: 50,
        width: 140,
        height: "auto",
        opacity,
      }}
    />
  );
}

// ── Phone frame around screenshots ──
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: 620,
        height: 1100,
        borderRadius: 40,
        border: `4px solid ${GOLD}`,
        overflow: "hidden",
        boxShadow: `0 0 60px rgba(201,168,76,0.3), 0 20px 60px rgba(0,0,0,0.5)`,
      }}
    >
      {children}
    </div>
  );
}

// ── Slide title bar ──
function SlideTitle({ text, frame }: { text: string; frame: number }) {
  const y = interpolate(frame, [0, 15], [40, 0], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      <div
        style={{
          background: "rgba(11,21,38,0.85)",
          borderRadius: 16,
          padding: "14px 36px",
          border: `1.5px solid ${GOLD}40`,
        }}
      >
        <span
          style={{
            fontFamily: "Luckiest Guy, sans-serif",
            fontSize: 36,
            color: CREAM,
            letterSpacing: 2,
            textShadow: `0 2px 8px rgba(0,0,0,0.6)`,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

// ── Background (blurred, darkened screenshot) ──
function BlurredBg({ src }: { src: string }) {
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: "absolute",
        top: -40,
        left: -40,
        width: "calc(100% + 80px)",
        height: "calc(100% + 80px)",
        objectFit: "cover",
        filter: "blur(30px) brightness(0.3)",
      }}
    />
  );
}

// ── Fade wrapper ──
function FadeWrap({
  durationFrames,
  children,
}: {
  durationFrames: number;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, FADE], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationFrames - FADE, durationFrames],
    [1, 0],
    { extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

// ── Opening title card ──
function OpeningCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(frame, [15, 35], [60, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const titleOp = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [35, 55], [40, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subOp = interpolate(frame, [35, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #162040 0%, ${BG} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Decorative glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD}15 0%, transparent 70%)`,
        }}
      />

      <Img
        src={staticFile("presentation/logo.png")}
        style={{
          width: 200,
          height: "auto",
          transform: `scale(${logoScale})`,
          marginBottom: 50,
        }}
      />

      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "Luckiest Guy, sans-serif",
            fontSize: 72,
            color: CREAM,
            letterSpacing: 4,
            textShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 40px ${GOLD}30`,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          MISSION
          <br />
          SOURATES
        </h1>
      </div>

      <div
        style={{
          transform: `translateY(${subY}px)`,
          opacity: subOp,
          marginTop: 30,
        }}
      >
        <p
          style={{
            fontFamily: "Luckiest Guy, sans-serif",
            fontSize: 32,
            color: GOLD,
            letterSpacing: 2,
            textShadow: `0 2px 10px rgba(0,0,0,0.4)`,
            margin: 0,
            textAlign: "center",
          }}
        >
          APPRENDRE DEVIENT
          <br />
          UNE AVENTURE
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ── Image slide — full-screen screenshot ──
function ImageSlideView({
  src,
}: {
  src: string;
  title: string;
  phoneFrame?: boolean;
}) {
  const frame = useCurrentFrame();

  // Gentle Ken Burns zoom
  const scale = interpolate(frame, [0, 90], [1, 1.04], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
      <LogoWatermark />
    </AbsoluteFill>
  );
}

// ── Video slide — full screen ──
function VideoSlideView({ src, title }: { src: string; title: string }) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Video
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        volume={1}
        playbackRate={1}
      />
      <SlideTitle text={title} frame={frame} />
      <LogoWatermark />
    </AbsoluteFill>
  );
}

// ── Rapid showcase (4 images cycling) ──
function RapidSlideView({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { durationInFrames } = useVideoConfig();
  const perImage = Math.floor(durationInFrames / images.length);

  const activeIdx = Math.min(Math.floor(frame / perImage), images.length - 1);

  return (
    <AbsoluteFill style={{ background: BG }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 100,
        }}
      >
        {images.map((img, i) => {
          const imgStart = i * perImage;
          const localFrame = frame - imgStart;
          const fadeIn = interpolate(localFrame, [0, 8], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
          });
          const scl = interpolate(localFrame, [0, perImage], [1, 1.04], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
          });

          return (
            <div
              key={img}
              style={{
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: i === activeIdx ? fadeIn : i < activeIdx ? 0 : 0,
                transform: `scale(${i === activeIdx ? scl : 1})`,
              }}
            >
              <Img
                src={staticFile(img)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          );
        })}
      </div>

      <SlideTitle text={title} frame={frame} />

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: 240,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {images.map((_, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: i === activeIdx ? GOLD : `${CREAM}40`,
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      <LogoWatermark />
    </AbsoluteFill>
  );
}

// ── Closing card ──
function ClosingCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Op = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line2Op = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line3Op = interpolate(frame, [40, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoScale = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 15 },
  });

  const lines = ["UNE SOURATE", "UNE MISSION", "UNE AVENTURE"];
  const ops = [line1Op, line2Op, line3Op];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #162040 0%, ${BG} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD}10 0%, transparent 70%)`,
        }}
      />

      {lines.map((text, i) => (
        <h2
          key={text}
          style={{
            fontFamily: "Luckiest Guy, sans-serif",
            fontSize: 56,
            color: i === 2 ? GOLD : CREAM,
            letterSpacing: 3,
            textShadow: `0 4px 20px rgba(0,0,0,0.5)`,
            margin: 0,
            opacity: ops[i],
            transform: `translateY(${interpolate(ops[i], [0, 1], [30, 0])}px)`,
          }}
        >
          {text}
        </h2>
      ))}

      <div style={{ marginTop: 40, transform: `scale(${logoScale})` }}>
        <Img
          src={staticFile("presentation/logo.png")}
          style={{ width: 160, height: "auto" }}
        />
      </div>

      <p
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "sans-serif",
          fontSize: 22,
          color: `${CREAM}90`,
          letterSpacing: 1,
          opacity: line3Op,
        }}
      >
        Recitation : Ibrahim Bentahar
      </p>
    </AbsoluteFill>
  );
}

// ── Main composition ──
// Font loader — blocks render until font is ready
function FontLoader({ children }: { children: React.ReactNode }) {
  const [handle] = useState(() => delayRender("Loading LuckiestGuy font"));

  useEffect(() => {
    const font = new FontFace(
      "Luckiest Guy",
      `url(${staticFile("presentation/LuckiestGuy.ttf")})`,
    );
    font
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("Font load failed:", err);
        continueRender(handle);
      });
  }, [handle]);

  return <>{children}</>;
}

// Pre-compute video clip frame ranges for music ducking
const VIDEO_RANGES: Array<[number, number]> = (() => {
  const ranges: Array<[number, number]> = [];
  let off = 0;
  for (const slide of SLIDES) {
    const dur = Math.round(slide.duration * FPS);
    if (slide.type === "video") {
      ranges.push([off, off + dur]);
    }
    off += dur;
  }
  return ranges;
})();

export const PresentationMS: React.FC = () => {
  let offset = 0;
  const sequences: React.ReactNode[] = [];

  for (let i = 0; i < SLIDES.length; i++) {
    const slide = SLIDES[i];
    const durationFrames = Math.round(slide.duration * FPS);
    const from = offset;

    // Overlap slides by FADE frames for crossfade
    const overlapStart = i > 0 ? FADE : 0;

    sequences.push(
      <Sequence
        key={i}
        from={from - overlapStart}
        durationInFrames={durationFrames + overlapStart}
      >
        <FadeWrap durationFrames={durationFrames + overlapStart}>
          {slide.type === "title" && <OpeningCard />}
          {slide.type === "image" && (
            <ImageSlideView
              src={slide.src}
              title={slide.title}
              phoneFrame={slide.phoneFrame}
            />
          )}
          {slide.type === "video" && (
            <VideoSlideView src={slide.src} title={slide.title} />
          )}
          {slide.type === "rapid" && (
            <RapidSlideView images={slide.images} title={slide.title} />
          )}
          {slide.type === "closing" && <ClosingCard />}
        </FadeWrap>
      </Sequence>,
    );

    // Voiceover audio for this slide
    if (slide.voiceover) {
      sequences.push(
        <Sequence key={`vo-${i}`} from={from} durationInFrames={durationFrames}>
          <Audio src={staticFile(slide.voiceover)} volume={1} />
        </Sequence>,
      );
    }

    // Fond sonore only on non-video slides, with fade in/out
    if (slide.type !== "video") {
      const fadeDur = 20; // ~0.7s fade
      const dur = durationFrames;
      sequences.push(
        <Sequence key={`bg-${i}`} from={from} durationInFrames={dur}>
          <Audio
            src={staticFile("presentation/voiceover/fond-sonore.mp3")}
            volume={(f: number) => {
              const fadeIn = interpolate(f, [0, fadeDur], [0, 0.3], {
                extrapolateRight: "clamp",
              });
              const fadeOut = interpolate(f, [dur - fadeDur, dur], [0.3, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return Math.min(fadeIn, fadeOut);
            }}
          />
        </Sequence>,
      );
    }

    offset += durationFrames;
  }

  return (
    <FontLoader>
      <AbsoluteFill style={{ background: BG }}>{sequences}</AbsoluteFill>
    </FontLoader>
  );
};
