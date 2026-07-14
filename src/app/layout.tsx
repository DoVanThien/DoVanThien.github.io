import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Do Van Thien's App Space - Premium Hub",
  description: "Không gian trải nghiệm các ứng dụng web độc bản cá nhân được tối ưu hóa UI/UX tích hợp AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <head>
        {/* FontAwesome CDN for AI English Mentor icons */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={`${outfit.variable} font-sans min-h-full flex flex-col antialiased`}>
        {children}
      </body>
    </html>
  );
}
