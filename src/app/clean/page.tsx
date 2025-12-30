
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  Download,
  Loader2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
}

interface PdfFile {
  id: string;
  file: File;
  previewUrl: string;
  pageCount: number;
}

export default function CleanPdfPage() {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [threshold, setThreshold] = useState(128); // 0-255
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const { toast } = useToast();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileChange = useCallback(async (uploadedFile: File | null) => {
    if (!uploadedFile) return;
    if (uploadedFile.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setPdfFile(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 0.8 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      if (context) {
        await firstPage.render({ canvasContext: context, viewport }).promise;
      }

      const initialPreview = canvas.toDataURL();
      setPdfFile({
        id: `${uploadedFile.name}-${uploadedFile.lastModified}`,
        file: uploadedFile,
        previewUrl: initialPreview,
        pageCount: pdf.numPages,
      });
      setPreviewUrl(initialPreview);
    } catch (error) {
      console.error('Error processing file preview:', error);
      toast({
        title: 'Preview Error',
        description: `Could not create a preview for the PDF.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileChange(acceptedFiles[0]);
    }
  }, [handleFileChange]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    accept: { 'application/pdf': ['.pdf'] },
  });

  const updatePreview = useCallback(() => {
    if (!pdfFile || !previewCanvasRef.current) return;
    setIsRendering(true);

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < threshold) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setIsRendering(false);
    };
    img.src = pdfFile.previewUrl;
  }, [pdfFile, threshold]);

  useEffect(() => {
    if (pdfFile) {
        if(renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = setTimeout(() => {
            updatePreview();
        }, 100); // Debounce
    }
  }, [threshold, pdfFile, updatePreview]);

  const handleDownload = async () => {
    if (!pdfFile) {
      toast({ title: 'No file to process', description: 'Please upload a PDF.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      const existingPdfBytes = await pdfFile.file.arrayBuffer();
      const pdfjsDoc = await pdfjsLib.getDocument({ data: existingPdfBytes }).promise;
      const newPdfDoc = await PDFDocument.create();
      
      for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        const page = await pdfjsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2 }); // High-res for processing
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let j = 0; j < data.length; j += 4) {
            const brightness = (data[j] + data[j + 1] + data[j + 2]) / 3;
            if (brightness < threshold) {
              data[j] = 255;
              data[j + 1] = 255;
              data[j + 2] = 255;
            }
          }
          context.putImageData(imageData, 0, 0);

          const imageBytes = await new Promise<string>((resolve) => {
             resolve(canvas.toDataURL('image/png'));
          });
          
          const pngImage = await newPdfDoc.embedPng(imageBytes);
          const newPage = newPdfDoc.addPage([page.view[2], page.view[3]]);
          newPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: newPage.getWidth(),
            height: newPage.getHeight(),
          });
        }
        setProgress(Math.round(i / pdfjsDoc.numPages * 100));
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const finalFilename = `cleaned-${pdfFile.file.name}`;
      saveAs(blob, finalFilename);

      toast({ title: 'Success', description: 'Your PDF has been cleaned.' });
    } catch (error) {
      console.error('Error cleaning PDF:', error);
      toast({ title: 'Error', description: 'Could not clean the PDF.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setPdfFile(null);
    setIsProcessing(false);
    setIsLoading(false);
    toast({ title: 'Cleared', description: 'The file has been removed.' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary">Clean PDF</h1>
          <p className="mt-4 text-lg text-foreground/80 max-w-3xl mx-auto">
            Remove dark spots, stains, or unwanted backgrounds from your pages. Adjust the threshold to control the cleanup intensity.
          </p>
        </div>
        {!pdfFile && !isLoading ? (
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center h-[50vh] transition-colors ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <Sparkles className="w-16 h-16 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">
              Drag & Drop or{' '}
              <button type="button" className="text-accent underline" onClick={open}>
                Click to Upload
              </button>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Upload a single PDF to clean its pages
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <p className="text-lg text-center text-muted-foreground">
              Analyzing your PDF...
            </p>
          </div>
        ) : pdfFile ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <h2 className="font-semibold text-lg">{pdfFile.file.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {pdfFile.pageCount} pages
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="threshold">Cleanup Threshold ({threshold})</Label>
                    <Slider
                      id="threshold"
                      value={[threshold]}
                      onValueChange={([v]) => setThreshold(v)}
                      min={0}
                      max={255}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values will remove more dark areas.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 pt-4">
                    <Button onClick={handleDownload} disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Process & Download
                    </Button>
                    {isProcessing && (
                         <div className="w-full space-y-2">
                            <p className="text-sm text-muted-foreground">Processing page {Math.ceil(progress / 100 * pdfFile.pageCount)} of {pdfFile.pageCount}...</p>
                            <Progress value={progress} className="w-full" />
                        </div>
                    )}
                    <Button variant="outline" onClick={open}>
                      Upload Another
                    </Button>
                    <Button variant="ghost" onClick={clearAll}>
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-2">
                  <div className="relative aspect-[3/4] w-full bg-muted rounded-md overflow-hidden border">
                    <canvas
                      ref={previewCanvasRef}
                      className="w-full h-full object-contain"
                    />
                    {isRendering && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
