import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  throw new Error(
    "Playwright est introuvable. Installez-le dans l’environnement avant de relancer `node scripts/generate-calligraphies.mjs`.",
    { cause: error },
  );
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const EPISODES_PATH = path.join(
  ROOT_DIR,
  "src/lib/mission-sourates-episodes.ts",
);
const FONT_PATH = path.join(ROOT_DIR, "public/fonts/noto-arabic.woff2");
const OUTPUT_DIR = path.join(ROOT_DIR, "public/sourates");

const WIDTH = 2160;
const HEIGHT = 1080;
const NIGHT = "#123C43";
const CREAM = "#FAF4E8";
const TEAL = "#2E7D6C";
const ORANGE = "#F28A4B";

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

function property(object, name) {
  return object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      propertyName(candidate.name) === name,
  );
}

function stringValue(node, context) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  throw new Error(`${context} doit être une chaîne littérale.`);
}

async function readEpisodes() {
  const sourceText = await readFile(EPISODES_PATH, "utf8");
  const source = ts.createSourceFile(
    EPISODES_PATH,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  let episodesArray;
  source.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "MISSION_SOURATES_EPISODES" &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        episodesArray = declaration.initializer;
      }
    }
  });

  if (!episodesArray) {
    throw new Error(
      `MISSION_SOURATES_EPISODES est introuvable dans ${EPISODES_PATH}.`,
    );
  }

  const episodes = episodesArray.elements.map((element, index) => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error(`L’épisode ${index + 1} n’est pas un objet littéral.`);
    }
    const idProperty = property(element, "id");
    const revealProperty = property(element, "reveal");
    if (!idProperty || !revealProperty) {
      throw new Error(`L’épisode ${index + 1} n’a pas d’id ou de reveal.`);
    }
    if (!ts.isObjectLiteralExpression(revealProperty.initializer)) {
      throw new Error(`Le reveal de l’épisode ${index + 1} est invalide.`);
    }
    const arabicProperty = property(revealProperty.initializer, "arabic");
    if (!arabicProperty) {
      throw new Error(`Le reveal de l’épisode ${index + 1} n’a pas d’arabic.`);
    }

    return {
      id: stringValue(idProperty.initializer, `id de l’épisode ${index + 1}`),
      arabic: stringValue(
        arabicProperty.initializer,
        `reveal.arabic de l’épisode ${index + 1}`,
      ),
    };
  });

  if (episodes.length !== 32) {
    throw new Error(
      `32 épisodes étaient attendus, mais ${episodes.length} ont été lus.`,
    );
  }
  if (new Set(episodes.map(({ id }) => id)).size !== episodes.length) {
    throw new Error("Les ids d’épisode doivent être uniques.");
  }
  for (const { id, arabic } of episodes) {
    if (!id || !arabic || /[\uFFFD□?]/u.test(arabic)) {
      throw new Error(`Texte arabe invalide pour ${id || "un épisode sans id"}.`);
    }
  }

  return episodes;
}

async function installArabicFont(page, fontBase64) {
  await page.setContent(`<!doctype html>
    <html><head><meta charset="utf-8"></head>
    <body><div id="stage"><div id="word" dir="rtl"></div></div></body></html>`);

  const loaded = await page.evaluate(async (encodedFont) => {
    const font = new FontFace(
      "MissionNotoArabic",
      `url(data:font/woff2;base64,${encodedFont}) format("woff2")`,
      { style: "normal", weight: "400" },
    );
    const face = await font.load();
    document.fonts.add(face);
    await document.fonts.ready;
    return (
      face.status === "loaded" &&
      document.fonts.check('400 100px "MissionNotoArabic"')
    );
  }, fontBase64);

  if (!loaded) {
    throw new Error(
      "La police public/fonts/noto-arabic.woff2 n’a pas pu être chargée.",
    );
  }

  await page.addStyleTag({
    content: `
      html, body {
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }
      #stage {
        position: relative;
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        background: transparent;
      }
      #word {
        position: absolute;
        left: 50%;
        top: 50%;
        display: inline-block;
        direction: rtl;
        unicode-bidi: isolate;
        white-space: nowrap;
        transform: translate(-50%, -50%);
        font-family: "MissionNotoArabic";
        font-weight: 400;
        font-style: normal;
        font-variant-ligatures: normal;
        font-feature-settings: "liga" 1, "rlig" 1, "calt" 1;
        line-height: 1.22;
        text-rendering: optimizeLegibility;
      }
    `,
  });
}

async function setFittedWord(page, arabic, color) {
  const metrics = await page.evaluate(
    ({ text, fill, maxWidth, maxHeight }) => {
      const word = document.querySelector("#word");
      if (!(word instanceof HTMLElement)) throw new Error("#word introuvable");
      word.textContent = text;
      word.style.color = fill;

      let low = 40;
      let high = 900;
      for (let iteration = 0; iteration < 18; iteration += 1) {
        const size = (low + high) / 2;
        word.style.fontSize = `${size}px`;
        const bounds = word.getBoundingClientRect();
        if (bounds.width <= maxWidth && bounds.height <= maxHeight) low = size;
        else high = size;
      }
      word.style.fontSize = `${Math.floor(low)}px`;
      const bounds = word.getBoundingClientRect();
      return {
        fontSize: Math.floor(low),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        fontReady: document.fonts.check(
          `${Math.floor(low)}px "MissionNotoArabic"`,
          text,
        ),
      };
    },
    {
      text: arabic,
      fill: color,
      maxWidth: WIDTH * 0.8,
      maxHeight: HEIGHT * 0.76,
    },
  );

  if (!metrics.fontReady) {
    throw new Error(`La police Noto Sans Arabic n’est pas prête pour « ${arabic} ».`);
  }
  if (metrics.width > WIDTH * 0.8 + 1 || metrics.height > HEIGHT * 0.76 + 1) {
    throw new Error(`Le rendu déborde pour « ${arabic} » (${metrics.width}×${metrics.height}).`);
  }

  return metrics;
}

async function renderCalligraphies(page, episodes) {
  const rendered = [];
  for (const [index, episode] of episodes.entries()) {
    const variants = [
      { suffix: "night", color: NIGHT },
      { suffix: "cream", color: CREAM },
    ];
    let metrics;
    for (const variant of variants) {
      metrics = await setFittedWord(page, episode.arabic, variant.color);
      const outputPath = path.join(
        OUTPUT_DIR,
        `${episode.id}-${variant.suffix}.png`,
      );
      await page.screenshot({
        path: outputPath,
        type: "png",
        omitBackground: true,
      });
    }
    rendered.push({ ...episode, nightFile: `${episode.id}-night.png` });
    process.stdout.write(
      `[${String(index + 1).padStart(2, "0")}/32] ${episode.id} — ${metrics.width}×${metrics.height}px @ ${metrics.fontSize}px\n`,
    );
  }
  return rendered;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function renderContactSheet(page, episodes) {
  const imageData = await Promise.all(
    episodes.map(async (episode) => ({
      ...episode,
      image: `data:image/png;base64,${(
        await readFile(path.join(OUTPUT_DIR, episode.nightFile))
      ).toString("base64")}`,
    })),
  );

  await page.setViewportSize({ width: 2160, height: 3840 });
  await page.setContent(`<!doctype html>
    <html lang="fr">
      <head><meta charset="utf-8"><style>
        * { box-sizing: border-box; }
        html, body { width: 2160px; height: 3840px; margin: 0; overflow: hidden; }
        body {
          position: relative;
          padding: 90px 82px 80px;
          background: ${CREAM};
          color: ${NIGHT};
          font-family: "Arial Rounded MT Bold", Arial, sans-serif;
        }
        h1 {
          margin: 0 0 58px;
          color: ${ORANGE};
          font-size: 82px;
          line-height: 1;
          letter-spacing: 4px;
          text-align: center;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 34px;
        }
        .card {
          position: relative;
          height: 412px;
          overflow: hidden;
          border: 8px solid ${TEAL};
          border-radius: 48px;
          background: ${CREAM};
          box-shadow: 0 14px 0 rgba(46,125,108,.22);
        }
        .card:nth-child(odd) { transform: rotate(-.45deg); }
        .card:nth-child(even) { transform: rotate(.45deg); }
        .star {
          position: absolute;
          left: 20px;
          top: 14px;
          color: ${ORANGE};
          font-size: 38px;
          line-height: 1;
        }
        .dots {
          position: absolute;
          right: 22px;
          top: 24px;
          color: ${TEAL};
          font-size: 26px;
          letter-spacing: 4px;
          opacity: .42;
        }
        .arc {
          position: absolute;
          left: 22px;
          bottom: 20px;
          width: 36px;
          height: 22px;
          border: 5px solid ${TEAL};
          border-bottom: 0;
          border-radius: 36px 36px 0 0;
          opacity: .42;
        }
        .word {
          position: absolute;
          inset: 52px 25px 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .word img { display: block; width: 100%; height: 100%; object-fit: contain; }
        .id {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 22px;
          overflow: hidden;
          color: ${NIGHT};
          font-size: 26px;
          font-weight: 700;
          line-height: 1;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style></head>
      <body>
        <h1>LES 32 MOTS · MISSION SOURATES</h1>
        <main class="grid">
          ${imageData
            .map(
              ({ id, arabic, image }) => `<article class="card">
                <span class="star">✦</span><span class="dots">•••</span><span class="arc"></span>
                <div class="word"><img src="${image}" alt="${escapeHtml(arabic)}"></div>
                <div class="id">${escapeHtml(id)}</div>
              </article>`,
            )
            .join("")}
        </main>
      </body>
    </html>`,
  );
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "_planche.png"),
    type: "png",
  });
}

async function main() {
  const episodes = await readEpisodes();
  const fontBase64 = (await readFile(FONT_PATH)).toString("base64");
  if (!fontBase64) throw new Error(`Police vide : ${FONT_PATH}`);
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    await installArabicFont(page, fontBase64);
    const rendered = await renderCalligraphies(page, episodes);
    await renderContactSheet(page, rendered);
  } finally {
    await browser.close();
  }

  process.stdout.write(`Planche générée : ${path.join(OUTPUT_DIR, "_planche.png")}\n`);
}

await main();
