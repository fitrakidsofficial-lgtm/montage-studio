import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const C = {
  night: "#061A2A",
  nightSoft: "#0B2638",
  gold: "#F8B831",
  teal: "#1D776A",
  orange: "#C6611D",
  white: "#F7FAF9",
  ink: "#102536",
};

const ASSET = {
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
  logo: staticFile("fitra-kids-logo.png"),
};

const fade = (frame: number, start: number, end: number, edge = 12) =>
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

function PopIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    fps,
    frame: frame - delay,
    config: { damping: 14, stiffness: 160, mass: 0.8 },
  });

  return (
    <div
      style={{
        opacity: interpolate(p, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(p, [0, 1], [36, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Header() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 54,
          display: "flex",
          alignItems: "center",
          gap: 14,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 42,
            height: 8,
            borderRadius: 999,
            background: C.gold,
          }}
        />
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 23,
            fontWeight: 600,
            letterSpacing: 3.2,
            color: C.gold,
          }}
        >
          MISSION SOURATES · VOTRE AVIS
        </div>
      </div>
      <Img
        src={ASSET.logo}
        style={{
          position: "absolute",
          top: 38,
          right: 50,
          width: 132,
          height: 52,
          objectFit: "contain",
          zIndex: 20,
        }}
      />
    </>
  );
}

function ChoiceCard({
  letter,
  label,
  src,
  delay,
  imageSize,
}: {
  letter: "A" | "B";
  label: string;
  src: string;
  delay: number;
  imageSize: number;
}) {
  return (
    <PopIn delay={delay}>
      <div
        style={{
          position: "relative",
          height: 500,
          margin: "0 58px",
          borderRadius: 42,
          background: C.white,
          border: `5px solid ${letter === "A" ? C.gold : C.teal}`,
          boxShadow: "0 18px 0 rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 26,
            top: 26,
            width: 86,
            height: 86,
            borderRadius: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: letter === "A" ? C.gold : C.teal,
            color: letter === "A" ? C.night : C.white,
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: 54,
            zIndex: 2,
          }}
        >
          {letter}
        </div>
        <div
          style={{
            position: "absolute",
            right: 32,
            top: 41,
            color: C.ink,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            letterSpacing: 2.5,
            fontSize: 28,
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
            marginTop: 32,
            filter: "drop-shadow(0 20px 18px rgba(6,26,42,.18))",
          }}
        />
      </div>
    </PopIn>
  );
}

function PageCrop({
  letter,
  src,
  delay,
  color,
}: {
  letter: "A" | "B";
  src: string;
  delay: number;
  color: string;
}) {
  return (
    <PopIn delay={delay}>
      <div
        style={{
          position: "relative",
          height: 400,
          margin: "0 50px",
          borderRadius: 34,
          overflow: "hidden",
          border: `5px solid ${color}`,
          background: "white",
          boxShadow: "0 18px 0 rgba(0,0,0,.15)",
        }}
      >
        <Img
          src={src}
          style={{
            position: "absolute",
            width: "100%",
            height: "auto",
            left: 0,
            top: -286,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 18,
            top: 18,
            width: 74,
            height: 74,
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: color,
            color: letter === "A" ? C.night : C.white,
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: 48,
            boxShadow: "0 8px 16px rgba(6,26,42,.22)",
          }}
        >
          {letter}
        </div>
      </div>
    </PopIn>
  );
}

export const OpinionEpisode01 = () => {
  const frame = useCurrentFrame();
  const hookOpacity = fade(frame, 0, 92, 14);
  const choicesOpacity = fade(frame, 78, 330, 16);
  const pagesOpacity = fade(frame, 312, 458, 15);
  const ctaOpacity = fade(frame, 440, 600, 16);

  const drift = Math.sin(frame / 18) * 8;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 18% 20%, ${C.nightSoft} 0%, ${C.night} 47%, #04131F 100%)`,
        overflow: "hidden",
        color: C.white,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          right: -260,
          top: 190,
          background: "rgba(29,119,106,.16)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          left: -220,
          bottom: 90,
          background: "rgba(248,184,49,.1)",
        }}
      />
      <Header />

      <AbsoluteFill style={{ opacity: hookOpacity }}>
        <PopIn delay={4} style={{ position: "absolute", top: 250, left: 54 }}>
          <div
            style={{
              display: "inline-flex",
              padding: "12px 24px",
              borderRadius: 999,
              background: C.gold,
              color: C.night,
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: 1.5,
            }}
          >
            LIVRET AL-FATIHA
          </div>
        </PopIn>
        <PopIn delay={10} style={{ position: "absolute", top: 355, left: 54 }}>
          <div
            style={{
              fontFamily: "'Luckiest Guy', sans-serif",
              fontSize: 112,
              lineHeight: 0.98,
              maxWidth: 900,
            }}
          >
            J’AI BESOIN
            <br />
            DE TON <span style={{ color: C.gold }}>AVIS</span>
          </div>
        </PopIn>
        <div
          style={{
            position: "absolute",
            top: 790 + drift,
            left: 92,
            transform: "rotate(-8deg)",
          }}
        >
          <Img src={ASSET.star} style={{ width: 390, height: 390, objectFit: "contain" }} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 1110 - drift,
            right: 55,
            transform: "rotate(6deg)",
          }}
        >
          <Img src={ASSET.earth} style={{ width: 470, height: 470, objectFit: "contain" }} />
        </div>
        <PopIn delay={20} style={{ position: "absolute", bottom: 145, left: 54, right: 54 }}>
          <div
            style={{
              fontSize: 35,
              lineHeight: 1.4,
              maxWidth: 820,
            }}
          >
            Quelle image explique le mieux
            <br />
            <strong style={{ color: C.gold }}>« Seigneur des mondes »</strong> aux enfants ?
          </div>
        </PopIn>
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: choicesOpacity, paddingTop: 145 }}>
        <div
          style={{
            textAlign: "center",
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: 60,
            lineHeight: 1.08,
            margin: "0 55px 28px",
          }}
        >
          TU PRÉFÈRES QUELLE IMAGE ?
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 29,
            color: "rgba(247,250,249,.72)",
            marginBottom: 30,
          }}
        >
          Pour le verset 2 de la sourate Al-Fatiha
        </div>
        <ChoiceCard letter="A" label="L’ÉTOILE" src={ASSET.star} delay={92} imageSize={350} />
        <div style={{ height: 30 }} />
        <ChoiceCard letter="B" label="LA TERRE" src={ASSET.earth} delay={116} imageSize={390} />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: pagesOpacity, paddingTop: 160 }}>
        <div
          style={{
            textAlign: "center",
            fontFamily: "'Luckiest Guy', sans-serif",
            fontSize: 60,
            lineHeight: 1.08,
            marginBottom: 16,
          }}
        >
          VOICI LE RENDU DANS LA PAGE
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 29,
            color: "rgba(247,250,249,.72)",
            marginBottom: 48,
          }}
        >
          Même mise en page, seule l’illustration change
        </div>
        <PageCrop letter="A" src={ASSET.pageStar} delay={325} color={C.gold} />
        <div style={{ height: 38 }} />
        <PageCrop letter="B" src={ASSET.pageEarth} delay={345} color={C.teal} />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          opacity: ctaOpacity,
          alignItems: "center",
          textAlign: "center",
          padding: "190px 54px 80px",
        }}
      >
        <PopIn delay={446}>
          <div
            style={{
              color: C.gold,
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: 3,
              marginBottom: 22,
            }}
          >
            À TOI DE CHOISIR
          </div>
          <div
            style={{
              fontFamily: "'Luckiest Guy', sans-serif",
              fontSize: 104,
              lineHeight: 1,
            }}
          >
            A OU B ?
          </div>
          <div style={{ fontSize: 36, marginTop: 24, lineHeight: 1.35 }}>
            Écris ton choix en commentaire
          </div>
        </PopIn>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 52,
            marginTop: 100,
          }}
        >
          {[
            { letter: "A", src: ASSET.star, color: C.gold, text: C.night },
            { letter: "B", src: ASSET.earth, color: C.teal, text: C.white },
          ].map((item, index) => (
            <PopIn delay={458 + index * 9} key={item.letter}>
              <div
                style={{
                  width: 410,
                  height: 500,
                  borderRadius: 42,
                  background: C.white,
                  border: `5px solid ${item.color}`,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 18px 0 rgba(0,0,0,.15)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 22,
                    left: 22,
                    width: 82,
                    height: 82,
                    borderRadius: 26,
                    background: item.color,
                    color: item.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Luckiest Guy', sans-serif",
                    fontSize: 54,
                  }}
                >
                  {item.letter}
                </div>
                <Img
                  src={item.src}
                  style={{
                    width: index === 0 ? 320 : 355,
                    height: index === 0 ? 320 : 355,
                    objectFit: "contain",
                    marginTop: 46,
                  }}
                />
              </div>
            </PopIn>
          ))}
        </div>

        <PopIn delay={490} style={{ position: "absolute", bottom: 94, left: 84, right: 84 }}>
          <div
            style={{
              borderRadius: 24,
              background: "rgba(29,119,106,.22)",
              border: "2px solid rgba(29,119,106,.65)",
              padding: "24px 34px",
              fontSize: 27,
              lineHeight: 1.4,
            }}
          >
            La version gagnante sera utilisée dans le livret
            <strong style={{ color: C.gold }}> Mission Sourates.</strong>
          </div>
        </PopIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const OPINION_EPISODE_01_FRAMES = 600;
