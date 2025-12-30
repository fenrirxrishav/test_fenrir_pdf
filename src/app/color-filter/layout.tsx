
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PDF Color Filter | Sepia, Grayscale, Dark Mode | Free Online Tool',
  description: 'Apply professional color filters to your entire PDF. Choose from presets like Sepia, Grayscale, Blueprint, or create a dark mode version. Free, private, and instant.',
  alternates: {
    canonical: '/color-filter',
  },
  openGraph: {
    title: 'PDF Color Filter | Sepia, Grayscale, Dark Mode | fenrirPDF',
    description: 'Instantly apply color filters like Sepia, Grayscale, or dark mode to your PDF documents.',
    url: '/color-filter',
  },
  twitter: {
    title: 'PDF Color Filter | Sepia, Grayscale, Dark Mode | fenrirPDF',
    description: 'Instantly apply color filters like Sepia, Grayscale, or dark mode to your PDF documents.',
  }
};

export default function ColorFilterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
