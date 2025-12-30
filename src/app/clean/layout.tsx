
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clean PDF | Remove Dark Spots & Backgrounds | Free Online Tool',
  description: 'Manually clean your PDF by removing dark spots, stains, or unwanted backgrounds. Use a simple slider to set the cleanup threshold and get a clean, white page. 100% private and secure.',
  alternates: {
    canonical: '/clean',
  },
  openGraph: {
    title: 'Clean PDF | Remove Dark Spots & Backgrounds | fenrirPDF',
    description: 'Manually clean your PDF by removing dark spots, stains, or unwanted backgrounds.',
    url: '/clean',
  },
  twitter: {
    title: 'Clean PDF | Remove Dark Spots & Backgrounds | fenrirPDF',
    description: 'Manually clean your PDF by removing dark spots, stains, or unwanted backgrounds.',
  }
};

export default function CleanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
