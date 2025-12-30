
"use client";

import React, { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { saveAs } from "file-saver";
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from "pdfjs-dist";
import JSZip from 'jszip';

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Download,
  Loader2,
  X,
  FileText,
  FileImage
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
}

interface PdfFile {
  id: string;
  file: File;
  previewUrl: string;
  pageCount: number;
}

export default function PdfToImagePage() {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Conversion options
  const [imageFormat, setImageFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);


  const { toast } = useToast();

  const handleFileChange = useCallback(async (uploadedFile: File | null) => {
    if (!uploadedFile) return;
    if (uploadedFile.type !== "application/pdf") {
      toast({ title: "Invalid file type", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setPdfFile(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 0.3 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      if (context) {
        await firstPage.render({ canvasContext: context, viewport }).promise;
      }
      
      setPdfFile({
        id: `${uploadedFile.name}-${uploadedFile.lastModified}`,
        file: uploadedFile,
        previewUrl: canvas.toDataURL(),
        pageCount: pdf.numPages,
      });

    } catch (error) {
      console.error("Error processing file preview:", error);
      toast({ title: "Preview Error", description: `Could not create a preview for the PDF.`, variant: "destructive" });
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

  const handleDownload = async () => {
    if (!pdfFile) {
        toast({ title: "No file to process", description: "Please upload a PDF.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    try {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const zip = new JSZip();

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;

                const blob: Blob | null = await new Promise(resolve => 
                    canvas.toBlob(resolve, `image/${imageFormat}`, imageFormat === 'jpeg' ? quality : undefined)
                );

                if (blob) {
                    const pageNum = i.toString().padStart(3, '0');
                    zip.file(`page_${pageNum}.${imageFormat === 'jpeg' ? 'jpg' : 'png'}`, blob);
                }
            }
            setProgress(Math.round((i / numPages) * 100));
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const finalFilename = `${pdfFile.file.name.replace('.pdf', '')}.zip`;
        saveAs(zipBlob, finalFilename);

        toast({ title: "Success", description: `All pages have been converted and zipped.` });
    } catch (error) {
        console.error("Error converting PDF to images:", error);
        toast({ title: "Error", description: "Could not convert the PDF.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const clearAll = () => {
    setPdfFile(null);
    setIsProcessing(false);
    setIsLoading(false);
    setProgress(0);
    toast({ title: "Cleared", description: "The file has been removed." });
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-primary">PDF to Image Converter</h1>
            <p className="mt-4 text-lg text-foreground/80 max-w-3xl mx-auto">
              Convert each page of your PDF into a high-quality JPG or PNG image. Your images will be bundled into a single ZIP file for download.
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
            <FileImage className="w-16 h-16 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">
              Drag & Drop or <button type="button" className="text-accent underline" onClick={open}>Click to Upload</button>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Upload a single PDF to convert its pages to images
            </p>
          </div>
        ) : isLoading ? (
             <div className="flex flex-col items-center justify-center h-[50vh]">
                <div className="w-full max-w-md space-y-4">
                    <p className="text-lg text-center text-muted-foreground">
                    Analyzing your PDF...
                    </p>
                </div>
            </div>
        ) : pdfFile ? (
          <div className="flex flex-col items-center gap-8">
            <div className="w-full max-w-4xl">
              <Card>
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-full md:w-1/3">
                         <div className="aspect-[3/4] w-full bg-muted rounded-lg overflow-hidden border">
                            <img src={pdfFile.previewUrl} alt="PDF Preview" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary"/>
                            <div>
                                <h2 className="font-semibold text-lg">{pdfFile.file.name}</h2>
                                <p className="text-sm text-muted-foreground">{pdfFile.pageCount} pages</p>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label>Image Format</Label>
                                <RadioGroup value={imageFormat} onValueChange={(v) => setImageFormat(v as any)} className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="jpeg" id="jpeg" />
                                        <Label htmlFor="jpeg">JPG</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="png" id="png" />
                                        <Label htmlFor="png">PNG</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="scale">Resolution Scale ({scale}x)</Label>
                                <Slider id="scale" value={[scale]} onValueChange={([v]) => setScale(v)} min={0.5} max={5} step={0.5} />
                                <p className="text-xs text-muted-foreground">Higher scale means better quality and larger file size.</p>
                            </div>
                        </div>
                         {imageFormat === 'jpeg' && (
                            <div className="space-y-3 pt-2">
                                <Label htmlFor="quality">JPG Quality ({Math.round(quality * 100)}%)</Label>
                                <Slider id="quality" value={[quality]} onValueChange={([v]) => setQuality(v)} min={0.1} max={1} step={0.01} />
                            </div>
                         )}

                        <div className="flex flex-wrap items-center gap-4 pt-4">
                           <Button onClick={handleDownload} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                Convert & Download
                            </Button>
                             <Button variant="outline" onClick={open}>
                                Upload Another
                            </Button>
                            <Button variant="ghost" size="icon" onClick={clearAll}><X className="h-4 w-4"/></Button>
                        </div>
                         {isProcessing && (
                             <div className="w-full space-y-2">
                                <p className="text-sm text-muted-foreground">Processing page {Math.ceil(progress / 100 * pdfFile.pageCount)} of {pdfFile.pageCount}...</p>
                                <Progress value={progress} className="w-full" />
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
