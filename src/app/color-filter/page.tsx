
"use client";

import React, { useState, useCallback, useMemo } from "react";
import { PDFDocument, rgb, degrees, BlendMode } from "pdf-lib";
import { saveAs } from "file-saver";
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from "pdfjs-dist";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Download,
  Loader2,
  X,
  FileText,
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const FILTERS = {
    none: { name: "None", color: rgb(0, 0, 0), blendMode: BlendMode.Normal, opacity: 0 },
    'scan': { name: "Scan / High Contrast", color: rgb(1, 1, 1), blendMode: BlendMode.Difference, opacity: 1 },
    blueprint: { name: "Blueprint", color: rgb(0.9, 0.4, 0.2), blendMode: BlendMode.Luminosity, opacity: 0.6 },
    sepia: { name: "Sepia", color: rgb(0.9, 0.6, 0.3), blendMode: BlendMode.Color, opacity: 0.5 },
    grayscale: { name: "Grayscale", color: rgb(0.5, 0.5, 0.5), blendMode: BlendMode.Luminosity, opacity: 1 },
};

type FilterType = keyof typeof FILTERS;


export default function ColorFilterPage() {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filter options
  const [filter, setFilter] = useState<FilterType>("none");
  const [textBrightness, setTextBrightness] = useState(0); // 0 to 1

  const { toast } = useToast();

  const handleFileChange = useCallback(async (uploadedFile: File | null) => {
    if (!uploadedFile) return;
    if (uploadedFile.type !== "application/pdf") {
      toast({ title: "Invalid file type", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setPdfFile(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 0.8 });
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
    try {
        const existingPdfBytes = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const selectedFilter = FILTERS[filter];

        for (const page of pages) {
            const { width, height } = page.getSize();
            
            // Apply main color filter
            if (filter !== 'none') {
                page.drawRectangle({
                    x: 0,
                    y: 0,
                    width,
                    height,
                    color: selectedFilter.color,
                    blendMode: selectedFilter.blendMode,
                    opacity: selectedFilter.opacity,
                });
            }

            // Apply text brightness adjustment
            if (textBrightness > 0) {
                 page.drawRectangle({
                    x: 0,
                    y: 0,
                    width,
                    height,
                    color: rgb(1, 1, 1), // white
                    blendMode: BlendMode.Lighten,
                    opacity: textBrightness,
                });
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const finalFilename = `${filter}-${pdfFile.file.name}`;
        saveAs(blob, finalFilename);

        toast({ title: "Success", description: `Your PDF has been processed.` });
    } catch (error) {
        console.error("Error applying color filter:", error);
        toast({ title: "Error", description: "Could not apply the color filter.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const clearAll = () => {
    setPdfFile(null);
    setIsProcessing(false);
    setIsLoading(false);
    toast({ title: "Cleared", description: "The file has been removed." });
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-primary">PDF Color Filter</h1>
            <p className="mt-4 text-lg text-foreground/80 max-w-3xl mx-auto">
              Apply stylish filters to your entire PDF document. Perfect for creating dark-mode versions, applying a sepia tone, or converting to grayscale.
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
            <Palette className="w-16 h-16 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">
              Drag & Drop or <button type="button" className="text-accent underline" onClick={open}>Click to Upload</button>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Upload a single PDF to apply color filters
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
                            <FileText className="w-8 h-8 text-primary"/>
                            <div>
                                <h2 className="font-semibold text-lg">{pdfFile.file.name}</h2>
                                <p className="text-sm text-muted-foreground">{pdfFile.pageCount} pages</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Filter</Label>
                            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                                <SelectTrigger><SelectValue placeholder="Select filter" /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(FILTERS).map(([key, {name}]) => (
                                    <SelectItem key={key} value={key}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Lighten Black Text ({Math.round(textBrightness * 100)}%)</Label>
                            <Slider value={[textBrightness]} onValueChange={([v]) => setTextBrightness(v)} min={0} max={0.8} step={0.05} />
                             <p className="text-xs text-muted-foreground">Makes black text lighter (gray). Useful on dark backgrounds.</p>
                        </div>

                        <div className="flex flex-col gap-4 pt-4">
                           <Button onClick={handleDownload} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                Process & Download
                            </Button>
                             <Button variant="outline" onClick={open}>
                                Upload Another
                            </Button>
                            <Button variant="ghost" onClick={clearAll}>Clear</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-2">
                <Card>
                  <CardContent className="p-2">
                      <div className="relative aspect-[3/4] w-full bg-muted rounded-md overflow-hidden border">
                          <img src={pdfFile.previewUrl} alt="PDF Preview" className="w-full h-full object-contain" />
                          <div 
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                  backgroundColor: `rgba(${FILTERS[filter].color.r * 255}, ${FILTERS[filter].color.g * 255}, ${FILTERS[filter].color.b * 255}, ${FILTERS[filter].opacity})`,
                                  mixBlendMode: FILTERS[filter].blendMode.toLowerCase() as any,
                              }}
                          />
                           <div 
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                  backgroundColor: `rgba(255, 255, 255, ${textBrightness})`,
                                  mixBlendMode: 'lighten',
                              }}
                          />
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

