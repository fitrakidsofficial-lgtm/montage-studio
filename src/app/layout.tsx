import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Montage Studio",
  description: "Cree tes montages video a partir de tes templates Remotion",
};

const FONT_LOAD_SCRIPT = `
(function(){
  var fonts = [
    ['Itim', '/fonts/itim-latin.woff2'],
    ['Luckiest Guy', '/fonts/luckiest-guy-latin.woff2'],
    ['Noto Sans Arabic', '/fonts/noto-arabic.woff2']
  ];
  fonts.forEach(function(f){
    var face = new FontFace(f[0], 'url(' + f[1] + ')');
    face.load().then(function(loaded){
      document.fonts.add(loaded);
    }).catch(function(e){ console.warn('Font load failed:', f[0], e); });
  });
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: FONT_LOAD_SCRIPT }} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Itim&family=Luckiest+Guy&family=Noto+Sans+Arabic:wght@400;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
