import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Convert PDF to Image Free | PDF to JPG, PDF to PNG Online',
  description: 'Easily convert each page of your PDF into a high-quality JPG or PNG image. Adjust quality and scale for perfect results. Fast, free, and 100% private.',
  alternates: {
    canonical: '/pdf-to-image',
  },
  openGraph: {
    title: 'Free PDF to Image Converter | PDF to JPG, PNG | fenrirPDF',
    description: 'Turn your PDF pages into individual images. Choose between JPG and PNG formats and download them in a ZIP file.',
    url: '/pdf-to-image',
  },
  twitter: {
    title: 'Free PDF to Image Converter | PDF to JPG, PNG | fenrirPDF',
    description: 'Turn your PDF pages into individual images. Choose between JPG and PNG formats and download them in a ZIP file.',
  }
};

export default function PdfToImageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
