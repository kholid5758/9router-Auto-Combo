import { Inter } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Auto Combo 9R - Super Combo Manager",
  description: "Standalone Auto-Free, Super-Combos, and Model Routing Engine for 9Router",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var t=s?(JSON.parse(s).state||{}).theme:'dark';t=t||'dark';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&m)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `var d=document,r=d.documentElement,f=function(){r.classList.add('fonts-loaded')};if(d.fonts&&d.fonts.load){d.fonts.load('24px "Material Symbols Outlined"').then(f).catch(f);setTimeout(f,3000)}else{f()}`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-bg text-text-main min-h-screen p-4 sm:p-6 lg:p-8`}>
        <RuntimeI18nProvider>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </RuntimeI18nProvider>
      </body>
    </html>
  );
}
