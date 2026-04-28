"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileUp,
  Settings2,
  Layers,
  
  Maximize2,
  Download,
  ChevronRight,
  
  Loader2,
  FileText,
  AlertCircle,
  X
} from "lucide-react";
import { PDFDocument, degrees, } from "pdf-lib";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentTenant } from "@/lib/tenant";
import { updateOrderProof } from "@/lib/supabase/actions";

const SHEET_SIZES = {
  "12x18": [1296, 864], // 12x18 inches in points
  "A3": [841.89, 1190.55],
  "A4": [595.28, 841.89],
  "Legal": [612, 1008],
  "Custom": [0, 0]
};

export default function PDFImposerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  // const [loading, setLoading] = useState(false);
  const [pdfjsLibState, setPdfjsLibState] = useState<unknown>(null);

  const [mode, setMode] = useState<"BOOKLET" | "NUP" | "BINDING">("BOOKLET");
  const [sheetSize, setSheetSize] = useState<string>("12x18");
  const [sheetOrientation, setSheetOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("LANDSCAPE");
  const [scaleToFit, setScaleToFit] = useState(true);
  const [spacing, setSpacing] = useState(5); // mm
  const [margins, setMargins] = useState(10); // mm
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [nupSelectedPage, setNupSelectedPage] = useState(0);
  const [customWidth, setCustomWidth] = useState(12); 
  const [customHeight, setCustomHeight] = useState(18);
  const [unit, setUnit] = useState<"MM" | "INCH">("INCH");
  const [nupLayout, setNupLayout] = useState<"2" | "4" | "6" | "8" | "9" | "12" | "16">("6");

  const [orderId, setOrderId] = useState<string | null>(null);
  const [isSavingProof, setIsSavingProof] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('fileUrl');
    const orderIdParam = urlParams.get('orderId');
    
    if (orderIdParam) setOrderId(orderIdParam);
    
    if (fileUrl) {
      // setLoading(true);
      fetch(fileUrl)
        .then(r => r.blob())
        .then(blob => {
          const f = new File([blob], 'imported.pdf', { type: 'application/pdf' });
          setFile(f);
        })
        .catch(e => {
          console.error("Failed to load file from URL", e);
          setError("Failed to load file from URL.");
        })
        .finally(() => { /* setLoading(false); */ });
    }
  }, []);


  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF.js UMD build via CDN to bypass bundling issues
  useEffect(() => {
    // Avoid injecting duplicate scripts on HMR re-renders
    if (document.getElementById("pdfjs-cdn")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = (window as any).pdfjsLib;
      if (existing) {
        existing.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfjsLibState(existing);
      }
      return;
    }

    const scriptTag = document.createElement("script");
    scriptTag.id = "pdfjs-cdn";
    scriptTag.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    scriptTag.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfjsLibState(lib);
      }
    };
    scriptTag.onerror = () => {
      setError("Failed to load PDF preview library. PDF generation still works.");
    };
    document.head.appendChild(scriptTag);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateThumbnails = async (file: File, lib: any) => {
    if (!lib || !file) return;
    try {
      console.log("Generating thumbnails with lib:", lib.version);
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = lib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const newThumbnails = [];
      
      for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
          await page.render({ 
            canvasContext: context, 
            viewport,
            canvas: canvas 
          }).promise;
          newThumbnails.push(canvas.toDataURL());
        }
      }
      setThumbnails(newThumbnails);
    } catch (err) {
      console.error("Thumbnail generation error:", err);
      setError("Could not generate page previews. The PDF may be encrypted or malformed. You can still generate the imposed output.");
    }
  };

  useEffect(() => {
    if (file && pdfjsLibState) {
      generateThumbnails(file, pdfjsLibState);
    }
  }, [file, pdfjsLibState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setThumbnails([]);
      setError(null);
    } else {
      setError("Please upload a valid PDF file.");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawCropMarks = (page: any, x: number, y: number, w: number, h: number) => {
    const len = 12; // length of mark
    const gap = 3;  // gap from corner
    const options = { thickness: 0.5, color: { type: 'RGB', red: 0, green: 0, blue: 0 } as unknown };
    
    // Top Left
    page.drawLine({ ...options, start: { x: x - gap, y: y + h }, end: { x: x - gap - len, y: y + h } });
    page.drawLine({ ...options, start: { x: x, y: y + h + gap }, end: { x: x, y: y + h + gap + len } });
    // Top Right
    page.drawLine({ ...options, start: { x: x + w + gap, y: y + h }, end: { x: x + w + gap + len, y: y + h } });
    page.drawLine({ ...options, start: { x: x + w, y: y + h + gap }, end: { x: x + w, y: y + h + gap + len } });
    // Bottom Left
    page.drawLine({ ...options, start: { x: x - gap, y: y }, end: { x: x - gap - len, y: y } });
    page.drawLine({ ...options, start: { x: x, y: y - gap }, end: { x: x, y: y - gap - len } });
    // Bottom Right
    page.drawLine({ ...options, start: { x: x + w + gap, y: y }, end: { x: x + w + gap + len, y: y } });
    page.drawLine({ ...options, start: { x: x + w, y: y - gap }, end: { x: x + w, y: y - gap - len } });
  };


  const handleSaveProof = async () => {
    if (!orderId || !file) return;
    setIsSavingProof(true);
    try {
      const blob = await processPDF(true);
      if (!blob) throw new Error("Failed to generate PDF");

      const supabase = createClient();
      const tenant = await getCurrentTenant(supabase);
      if (!tenant) throw new Error("Tenant not found");
      
      const fileExt = "pdf";
      const filePath = `${tenant.id}/proofs/${orderId}-${Date.now()}.${fileExt}`;
      
      const fileObj = new File([blob], `imposed_${file.name}`, { type: 'application/pdf' });
      
      const { error: uploadError } = await supabase.storage
        .from('printflow-files')
        .upload(filePath, fileObj);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('printflow-files')
        .getPublicUrl(filePath);
        
      await updateOrderProof(orderId, { proof_image_url: publicUrl, proof_status: 'PENDING_APPROVAL' });
      
      // Auto-set order status to READY or similar if needed, or just redirect
      router.push(`/dashboard/orders/${orderId}`);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to save proof");
      setIsSavingProof(false);
    }
  };

  const processPDF = async (returnBlob = false): Promise<Blob | void> => {
    if (!file) return;
    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const outDoc = await PDFDocument.create();
      
      let [sheetW, sheetH] = SHEET_SIZES[sheetSize as keyof typeof SHEET_SIZES] || [0, 0];
      
      if (sheetSize === "Custom") {
        const factor = unit === "MM" ? 2.83465 : 72;
        sheetW = customWidth * factor;
        sheetH = customHeight * factor;
      }

      if (sheetOrientation === "LANDSCAPE" && sheetW < sheetH) [sheetW, sheetH] = [sheetH, sheetW];
      if (sheetOrientation === "PORTRAIT" && sheetW > sheetH) [sheetW, sheetH] = [sheetH, sheetW];

      const spacingPts = unit === "MM" ? (spacing * 2.83465) : (spacing * 72); 
      const marginPts = unit === "MM" ? (margins * 2.83465) : (margins * 72);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const drawSlot = async (page: any, idx: number, x: number, y: number, sw: number, sh: number) => {
        if (idx >= srcDoc.getPageCount()) return;
        const srcPage = srcDoc.getPages()[idx];
        const embeddedPage = await outDoc.embedPage(srcPage);
        
        let finalW = sw;
        let finalH = sh;
        let finalX = x;
        let finalY = y;
        
        const { width: srcW, height: srcH } = srcPage.getSize();
        const isRotated = rotation % 180 !== 0;
        const effectiveSrcW = isRotated ? srcH : srcW;
        const effectiveSrcH = isRotated ? srcW : srcH;

        let visualW = effectiveSrcW;
        let visualH = effectiveSrcH;

        if (scaleToFit) {
          const ratio = Math.min(sw / effectiveSrcW, sh / effectiveSrcH);
          finalW = srcW * ratio;
          finalH = srcH * ratio;
          
          visualW = effectiveSrcW * ratio;
          visualH = effectiveSrcH * ratio;
          finalX = x + (sw - visualW) / 2;
          finalY = y + (sh - visualH) / 2;
        }

        // Adjust origin based on rotation because pdf-lib rotates around the bottom-left corner
        let drawX = finalX;
        let drawY = finalY;
        const normalizedRot = rotation % 360;
        
        // pdf-lib degrees(angle) rotates counter-clockwise.
        // We must translate the origin to keep the embedded page inside the [finalX, finalY, visualW, visualH] bounding box.
        if (normalizedRot === 90 || normalizedRot === -270) {
           drawX = finalX + visualW; // Shift right by the visual width
        } else if (normalizedRot === 180 || normalizedRot === -180) {
           drawX = finalX + visualW;
           drawY = finalY + visualH;
        } else if (normalizedRot === 270 || normalizedRot === -90) {
           drawY = finalY + visualH; // Shift up by the visual height
        }

        page.drawPage(embeddedPage, {
          x: drawX,
          y: drawY,
          width: finalW,
          height: finalH,
          rotate: degrees(rotation)
        });

        if (showCropMarks) drawCropMarks(page, finalX, finalY, visualW, visualH);
      };

      if (mode === "BOOKLET") {
        const pageCount = srcDoc.getPageCount();
        // Pad to nearest multiple of 4 for saddle-stitch
        const pagesNeeded = Math.ceil(pageCount / 4) * 4;

        // Build the saddle-stitch imposition order.
        // Each physical sheet has 2 sides (front/back), each side holds 2 pages.
        // For pagesNeeded = N:
        //   Sheet 1 front: [N, 1]   (right page = 1, left page = N)
        //   Sheet 1 back:  [2, N-1]
        //   Sheet 2 front: [N-2, 3]
        //   Sheet 2 back:  [4, N-3]  ... etc.
        // We produce one output page per physical side (2 pages per sheet side, side by side).

        const isLandscape = sheetOrientation === "LANDSCAPE";
        const bkW = isLandscape ? Math.max(sheetW, sheetH) : Math.min(sheetW, sheetH);
        const bkH = isLandscape ? Math.min(sheetW, sheetH) : Math.max(sheetW, sheetH);

        for (let sheet = 0; sheet < pagesNeeded / 2; sheet += 2) {
          // Front side of physical sheet
          const frontRight = sheet;           // page index (0-based) for right/bottom slot
          const frontLeft  = pagesNeeded - 1 - sheet; // page index for left/top slot

          // Back side of physical sheet
          const backLeft   = sheet + 1;
          const backRight  = pagesNeeded - 2 - sheet;

          const frontPage = outDoc.addPage([bkW, bkH]);
          const backPage = outDoc.addPage([bkW, bkH]);

          if (isLandscape) {
            const slotW = (bkW - marginPts * 2 - spacingPts) / 2;
            const slotH = bkH - marginPts * 2;
            await drawSlot(frontPage, frontLeft, marginPts, marginPts, slotW, slotH);
            await drawSlot(frontPage, frontRight, marginPts + slotW + spacingPts, marginPts, slotW, slotH);
            await drawSlot(backPage, backLeft, marginPts, marginPts, slotW, slotH);
            await drawSlot(backPage, backRight, marginPts + slotW + spacingPts, marginPts, slotW, slotH);
          } else {
            const slotW = bkW - marginPts * 2;
            const slotH = (bkH - marginPts * 2 - spacingPts) / 2;
            // PDF origin (0,0) is bottom-left.
            // Top slot = frontLeft / backLeft (higher Y)
            // Bottom slot = frontRight / backRight (lower Y)
            await drawSlot(frontPage, frontLeft, marginPts, marginPts + slotH + spacingPts, slotW, slotH);
            await drawSlot(frontPage, frontRight, marginPts, marginPts, slotW, slotH);
            await drawSlot(backPage, backLeft, marginPts, marginPts + slotH + spacingPts, slotW, slotH);
            await drawSlot(backPage, backRight, marginPts, marginPts, slotW, slotH);
          }
        }
      } else if (mode === "BINDING") {
        const pageCount = srcDoc.getPageCount();
        for (let i = 0; i < pageCount; i += 2) {
          const page = outDoc.addPage([sheetW, sheetH]);
          
          if (sheetOrientation === "LANDSCAPE") {
            const slotW = (sheetW - (marginPts * 2) - spacingPts) / 2;
            const slotH = sheetH - (marginPts * 2);
            await drawSlot(page, i, marginPts, marginPts, slotW, slotH);
            if (i + 1 < pageCount) await drawSlot(page, i + 1, marginPts + slotW + spacingPts, marginPts, slotW, slotH);
          } else {
            const slotW = sheetW - (marginPts * 2);
            const slotH = (sheetH - (marginPts * 2) - spacingPts) / 2;
            if (i + 1 < pageCount) await drawSlot(page, i + 1, marginPts, marginPts, slotW, slotH); // Bottom slot
            await drawSlot(page, i, marginPts, marginPts + slotH + spacingPts, slotW, slotH); // Top slot
          }
        }
      } else if (mode === "NUP") {
        const srcPage = srcDoc.getPages()[nupSelectedPage] || srcDoc.getPages()[0];
        const { width: srcW, height: srcH } = srcPage.getSize();
        
        const isRotated = rotation % 180 !== 0;
        const printableW = sheetW - (marginPts * 2);
        const printableH = sheetH - (marginPts * 2);

        // Use explicit layout from selector
        const layoutMap: Record<string, [number, number]> = {
          "2": [2, 1], "4": [2, 2], "6": [3, 2],
          "8": [4, 2], "9": [3, 3], "12": [4, 3], "16": [4, 4]
        };
        const [cols, rows] = layoutMap[nupLayout] || [3, 2];

        const slotW = (printableW - (cols - 1) * spacingPts) / cols;
        const slotH = (printableH - (rows - 1) * spacingPts) / rows;
        
        const page = outDoc.addPage([sheetW, sheetH]);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = marginPts + c * (slotW + spacingPts);
            const y = sheetH - marginPts - (r + 1) * slotH - r * spacingPts;
            await drawSlot(page, nupSelectedPage, x, y, slotW, slotH);
          }
        }
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });

      if (returnBlob) return blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `imposed_${file.name}`;
      link.click();
    } catch (err) {
      console.error(error);
      setError("Error processing PDF. Please try again.");
    } finally {
      setProcessing(false);
    }
  };


  // Dynamic margin/gap for preview rendering
  const [padY, padX, gapX, gapY, nupGapX, nupGapY] = (() => {
    let sw, sh;
    if (sheetSize === "Custom") {
      sw = unit === "MM" ? customWidth * 2.83465 : customWidth * 72;
      sh = unit === "MM" ? customHeight * 2.83465 : customHeight * 72;
    } else {
      const size = SHEET_SIZES[sheetSize as keyof typeof SHEET_SIZES] || [864, 612];
      sw = size[0]; sh = size[1];
    }
    const sW = sheetOrientation === "LANDSCAPE" ? Math.max(sw, sh) : Math.min(sw, sh);
    const sH = sheetOrientation === "LANDSCAPE" ? Math.min(sw, sh) : Math.max(sw, sh);
    const marginPts = unit === "MM" ? (margins * 2.83465) : (margins * 72);
    const spacingPts = unit === "MM" ? (spacing * 2.83465) : (spacing * 72);
    
    // Convert points to preview pixels (assuming preview is roughly 400px wide)
    const scale = 400 / Math.max(sW, sH);
    const pPad = Math.min(marginPts * scale, 30);
    const pGap = Math.min(spacingPts * scale, 20);
    
    return [
      pPad, // padY
      pPad, // padX
      sheetOrientation === "LANDSCAPE" ? pGap : 0, // gapX
      sheetOrientation === "PORTRAIT" ? pGap : 0, // gapY
      pGap, // nupGapX
      pGap  // nupGapY
    ];
  })();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Advanced PDF Imposer</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Smart Printing Tools</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setFile(null);
                setThumbnails([]);
                setError(null);
              }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Reset
            </button>
            {orderId ? (
              <button
                onClick={handleSaveProof}
                disabled={!file || processing || isSavingProof}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange text-white rounded-xl text-sm font-medium hover:bg-orange/90 transition-all shadow-lg shadow-orange/20 disabled:opacity-50 active:scale-95"
              >
                {(processing || isSavingProof) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                {(processing || isSavingProof) ? "Saving Proof..." : "Save Proof to Order"}
              </button>
            ) : (
              <button
                onClick={() => processPDF(false)}
                disabled={!file || processing}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 active:scale-95"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {processing ? "Generating..." : "Generate PDF"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Settings</h2>
              </div>
              
              <div className="p-4 space-y-6">
                <div className="flex justify-center p-1 bg-gray-50 rounded-lg border border-gray-100">
                  <button 
                    onClick={() => {
                      if (unit === "INCH") {
                        setCustomWidth(prev => Number((prev * 25.4).toFixed(1)));
                        setCustomHeight(prev => Number((prev * 25.4).toFixed(1)));
                        setSpacing(prev => Number((prev * 25.4).toFixed(1)));
                        setMargins(prev => Number((prev * 25.4).toFixed(1)));
                      }
                      setUnit("MM");
                    }} 
                    className={cn("flex-1 py-1 rounded text-[9px] font-bold transition-all", unit === "MM" ? "bg-white text-primary shadow-sm" : "text-gray-400")}
                  >
                    MILLIMETERS
                  </button>
                  <button 
                    onClick={() => {
                      if (unit === "MM") {
                        setCustomWidth(prev => Number((prev / 25.4).toFixed(2)));
                        setCustomHeight(prev => Number((prev / 25.4).toFixed(2)));
                        setSpacing(prev => Number((prev / 25.4).toFixed(2)));
                        setMargins(prev => Number((prev / 25.4).toFixed(2)));
                      }
                      setUnit("INCH");
                    }} 
                    className={cn("flex-1 py-1 rounded text-[9px] font-bold transition-all", unit === "INCH" ? "bg-white text-primary shadow-sm" : "text-gray-400")}
                  >
                    INCHES
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mode</label>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      { id: "BOOKLET", label: "Booklet", icon: Layers },
                      { id: "NUP", label: "N-Up", icon: Maximize2 },
                      { id: "BINDING", label: "Binding", icon: ChevronRight }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id as "BOOKLET" | "NUP" | "BINDING")}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border text-xs transition-all text-left",
                          mode === m.id ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        <m.icon className="w-3.5 h-3.5" />
                        <span className="font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {mode === "NUP" && (
                  <div className="space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                    {/* Layout picker */}
                    <div>
                      <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1.5">Pages Per Sheet</label>
                      <div className="grid grid-cols-7 gap-1">
                        {(["2","4","6","8","9","12","16"] as const).map(n => (
                          <button
                            key={n}
                            onClick={() => setNupLayout(n)}
                            className={cn(
                              "py-1 rounded text-[10px] font-black border transition-all",
                              nupLayout === n ? "bg-primary text-white border-primary" : "bg-white border-gray-100 text-gray-400 hover:border-primary/30"
                            )}
                          >{n}</button>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">
                        {({
                          "2":"2 columns × 1 row","4":"2×2","6":"3×2",
                          "8":"4×2","9":"3×3","12":"4×3","16":"4×4"
                        } as Record<string,string>)[nupLayout]}
                      </p>
                    </div>
                    {/* Page selector */}
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Repeat Page</label>
                      <span className="text-[10px] font-mono font-bold text-primary">P. {nupSelectedPage + 1}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {thumbnails.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setNupSelectedPage(i)}
                          className={cn(
                            "aspect-square rounded border text-[7px] font-bold transition-all",
                            nupSelectedPage === i ? "bg-primary text-white border-primary shadow-sm" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sheet Size</label>
                    <select 
                      value={sheetSize}
                      onChange={(e) => setSheetSize(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-xs outline-none focus:border-primary transition-all appearance-none"
                    >
                      {Object.keys(SHEET_SIZES).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {sheetSize === "Custom" && (
                    <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Width ({unit})</label>
                        <input 
                          type="number" 
                          value={customWidth} 
                          onChange={(e) => setCustomWidth(Number(e.target.value))}
                          step={unit === "INCH" ? "0.01" : "1"}
                          className="w-full bg-white border border-gray-100 px-2 py-1.5 rounded text-xs outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Height ({unit})</label>
                        <input 
                          type="number" 
                          value={customHeight} 
                          onChange={(e) => setCustomHeight(Number(e.target.value))}
                          step={unit === "INCH" ? "0.01" : "1"}
                          className="w-full bg-white border border-gray-100 px-2 py-1.5 rounded text-xs outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orientation</label>
                    <div className="flex gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
                      <button onClick={() => setSheetOrientation("PORTRAIT")} className={cn("flex-1 py-1.5 rounded-md text-[9px] font-bold transition-all", sheetOrientation === "PORTRAIT" ? "bg-white text-primary shadow-sm" : "text-gray-400")}>PORTRAIT</button>
                      <button onClick={() => setSheetOrientation("LANDSCAPE")} className={cn("flex-1 py-1.5 rounded-md text-[9px] font-bold transition-all", sheetOrientation === "LANDSCAPE" ? "bg-white text-primary shadow-sm" : "text-gray-400")}>LANDSCAPE</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">Fit to Sheet</span>
                  </div>
                  <button onClick={() => setScaleToFit(!scaleToFit)} className={cn("w-9 h-5 rounded-full transition-all relative border border-gray-200 shadow-inner", scaleToFit ? "bg-primary border-primary" : "bg-gray-200")}>
                    <div className={cn("absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-md", scaleToFit ? "left-[18px]" : "left-0.5")} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gutter</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={spacing} 
                        onChange={(e) => setSpacing(Number(e.target.value))}
                        step={unit === "INCH" ? "0.01" : "1"}
                        className="w-12 bg-white border border-gray-100 px-1 py-0.5 rounded text-[10px] font-mono font-bold text-primary text-center outline-none"
                      />
                      <span className="text-[10px] font-mono font-bold text-primary">{unit.toLowerCase()}</span>
                    </div>
                  </div>
                  <input type="range" min="0" max={unit === "MM" ? 50 : 2} step={unit === "MM" ? 1 : 0.05} value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Margins</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={margins} 
                        onChange={(e) => setMargins(Number(e.target.value))}
                        step={unit === "INCH" ? "0.01" : "1"}
                        className="w-12 bg-white border border-gray-100 px-1 py-0.5 rounded text-[10px] font-mono font-bold text-primary text-center outline-none"
                      />
                      <span className="text-[10px] font-mono font-bold text-primary">{unit.toLowerCase()}</span>
                    </div>
                  </div>
                  <input type="range" min="0" max={unit === "MM" ? 100 : 4} step={unit === "MM" ? 1 : 0.1} value={margins} onChange={(e) => setMargins(Number(e.target.value))} className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">Crop Marks</span>
                  </div>
                  <button onClick={() => setShowCropMarks(!showCropMarks)} className={cn("w-9 h-5 rounded-full transition-all relative border border-gray-200 shadow-inner", showCropMarks ? "bg-primary border-primary" : "bg-gray-200")}>
                    <div className={cn("absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-md", showCropMarks ? "left-[18px]" : "left-0.5")} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rotate</label>
                  <div className="flex gap-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button key={deg} onClick={() => setRotation(deg)} className={cn("flex-1 py-1.5 rounded-md border text-[9px] font-bold transition-all", rotation === deg ? "bg-gray-900 border-gray-900 text-white shadow-md" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200")}>{deg}°</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-4">
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/50", "bg-primary/5"); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary/50", "bg-primary/5"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary/50", "bg-primary/5");
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped && dropped.type === "application/pdf") {
                    setFile(dropped);
                    setThumbnails([]);
                    setError(null);
                  } else if (dropped) {
                    setError("Please drop a valid PDF file.");
                  }
                }}
                role="button"
                aria-label="Upload PDF file"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 flex flex-col items-center justify-center text-center group hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer min-h-[500px]"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                  <FileUp className="w-10 h-10 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Original PDF</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">Drag and drop your PDF here, or click to browse.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">{file.name}</h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{(file.size / (1024 * 1024)).toFixed(2)} MB • READY</p>
                    </div>
                  </div>
                  <button onClick={() => { setFile(null); setThumbnails([]); setError(null); }} aria-label="Remove file" className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all"><X className="w-5 h-5" /></button>
                </div>


                {/* Visual Preview Area */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visual Preview: {mode}</h3>
                  </div>
<div className="w-full bg-gray-50/20 p-4">
                     <div className={cn("flex gap-4 items-stretch w-full", mode === "NUP" ? "justify-center" : "flex-row")}>
                        {/* Front Sheet */}
                        <div className={cn("flex flex-col items-center gap-3", mode === "NUP" ? "w-full" : "flex-1")}>
                           <div 
                             className={cn(
                               "bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden transition-all duration-300",
                               mode === "NUP" ? "w-full max-w-xl" : "w-full"
                             )}
                             style={{ aspectRatio: sheetOrientation === "LANDSCAPE" ? "4/3" : "3/4" }}
                           >
                             <div className="h-8 flex justify-between items-center px-6 text-[10px] font-black tracking-[0.2em] text-gray-400 border-b border-gray-50 bg-gray-50/30">
                                <span>FRONT</span>
                             </div>
                              {mode === "NUP" && (() => {
                                const _lm: Record<string,[number,number]> = {"2":[2,1],"4":[2,2],"6":[3,2],"8":[4,2],"9":[3,3],"12":[4,3],"16":[4,4]};
                                const [_c,_r] = _lm[nupLayout]||[3,2];
                                return (
                                  <div className="flex-1 overflow-hidden" style={{display:"grid",gridTemplateColumns:`repeat(${_c},1fr)`,gridTemplateRows:`repeat(${_r},1fr)`,padding:`${padY}px ${padX}px`,gap:`${nupGapY}px ${nupGapX}px`}}>
                                    {Array.from({length:_c*_r}).map((_,i)=>(
                                      <div key={i} className="bg-gray-50 rounded overflow-hidden border border-gray-100 flex items-center justify-center min-h-0 min-w-0">
                                        {thumbnails[nupSelectedPage]?<img src={thumbnails[nupSelectedPage]} className="w-full h-full object-contain"/>:<span className="text-[7px] text-gray-400/50 font-bold">P.{nupSelectedPage+1}</span>}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                              {mode !== "NUP" && <div                                 className="flex-1 flex overflow-hidden" style={{ padding: `${padY}px ${padX}px` }}
                              >
                                <div className={cn(
                                  "flex-1 flex overflow-hidden",
                                  sheetOrientation === "PORTRAIT" ? "flex-col" : "flex-row"
                                )}
                                style={{ gap: `${sheetOrientation === "LANDSCAPE" ? gapX : gapY}px` }}
                                >
                                  {mode === "BOOKLET" && (() => {
                                    const total = Math.ceil((thumbnails.length || 8) / 4) * 4;
                                    // Sheet N front: left=total-1-(sheet*2), right=sheet*2
                                    // Sheet N back:  left=sheet*2+1,          right=total-2-(sheet*2)
                                    const isBack = currentSheet % 2 === 1;
                                    const physSheet = Math.floor(currentSheet / 2);
                                    const leftIdx  = isBack ? physSheet * 2 + 1          : total - 1 - physSheet * 2;
                                    const rightIdx = isBack ? total - 2 - physSheet * 2  : physSheet * 2;
                                    return (
                                      <>
                                        <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                          {thumbnails[leftIdx] ? <img src={thumbnails[leftIdx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>}
                                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                            P. {leftIdx + 1}
                                          </div>
                                        </div>
                                        <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                          {thumbnails[rightIdx] ? <img src={thumbnails[rightIdx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>}
                                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                            P. {rightIdx + 1}
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                  {mode === "BINDING" && (
                                    <>
                                      <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                         {(() => {
                                            const idx = currentSheet * 2;
                                           return thumbnails[idx] ? <img src={thumbnails[idx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>;
                                         })()}
                                         <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                             P. {currentSheet * 2 + 1}
                                         </div>
                                      </div>
                                      <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                         {(() => {
                                            const idx = currentSheet * 2 + 1;
                                           return thumbnails[idx] ? <img src={thumbnails[idx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>;
                                         })()}
                                         <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                             P. {currentSheet * 2 + 2}
                                         </div>
                                      </div>
                                    </>
                                  )}
                               </div>
                            </div>}
                         </div>
                      </div>

                        {/* Back Sheet */}
                        {mode !== "NUP" && (
                          <div className="flex-1 flex flex-col items-center gap-3">
                             <div
                               className={cn(
                                 "bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden transition-all duration-300 w-full"
                               )}
                               style={{ aspectRatio: sheetOrientation === "LANDSCAPE" ? "4/3" : "3/4" }}
                             >
                              <div className="h-8 flex justify-between items-center px-6 text-[10px] font-black tracking-[0.2em] text-gray-400 border-b border-gray-50 bg-gray-50/30">
                                 <span>BACK</span>
                              </div>
                              <div className="flex-1 flex overflow-hidden" style={{ padding: `${padY}px ${padX}px` }}>
                                 <div className={cn(
                                   "flex-1 flex",
                                   sheetOrientation === "PORTRAIT" ? "flex-col" : "flex-row"
                                 )}
                                 style={{ 
                                   gap: `${Math.min((spacing * (unit === "MM" ? 2.83465 : 72) / (sheetOrientation === "LANDSCAPE" ? Math.max(...((sheetSize === "Custom" ? [(unit === "MM" ? customWidth * 2.83465 : customWidth * 72), (unit === "MM" ? customHeight * 2.83465 : customHeight * 72)] : SHEET_SIZES[sheetSize as keyof typeof SHEET_SIZES] || [864,612]))) : Math.min(...((sheetSize === "Custom" ? [(unit === "MM" ? customWidth * 2.83465 : customWidth * 72), (unit === "MM" ? customHeight * 2.83465 : customHeight * 72)] : SHEET_SIZES[sheetSize as keyof typeof SHEET_SIZES] || [864,612]))))) * (sheetOrientation === "LANDSCAPE" ? 400 : 300), 8)}px` 
                                 }}
                                 >
                                   {mode === "BOOKLET" && (
                                     <>
                                       <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                          {(() => {
                                            const idx = (currentSheet * 2) + 1;
                                            return thumbnails[idx] ? <img src={thumbnails[idx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>;
                                          })()}
                                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                            P. {(currentSheet * 2) + 2}
                                          </div>
                                       </div>
                                       <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                          {(() => {
                                            const virtualTotal = Math.ceil((thumbnails.length || 8) / 4) * 4;
                                            const idx = (virtualTotal - 2) - (currentSheet * 2);
                                            return thumbnails[idx] ? <img src={thumbnails[idx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>;
                                          })()}
                                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                            P. {(Math.ceil((thumbnails.length || 8) / 4) * 4 - 1) - (currentSheet * 2)}
                                          </div>
                                       </div>
                                     </>
                                   )}
                                   {mode === "BINDING" && (
                                     <>
                                       <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                          {(() => {
                                            const idx = (currentSheet * 2) + 2;
                                            return thumbnails[idx] ? <img src={thumbnails[idx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>;
                                          })()}
                                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                            P. {(currentSheet * 2) + 3}
                                          </div>
                                       </div>
                                       <div className="flex-1 bg-white rounded flex items-center justify-center overflow-hidden relative border border-gray-100">
                                          {(() => {
                                            const idx = (currentSheet * 2) + 3;
                                            return thumbnails[idx] ? <img src={thumbnails[idx]} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-400/50 font-bold tracking-widest">BLANK</span>;
                                          })()}
                                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-gray-800/70 rounded text-[7px] font-bold text-white/90 z-10 leading-none">
                                            P. {(currentSheet * 2) + 4}
                                          </div>
                                       </div>
                                     </>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                        )}
                      </div>

                      {/* Sheet Navigation — hidden for N-Up (single sheet output) */}
                      {mode !== "NUP" && (() => {
                        const totalSheets = mode === "BINDING"
                          ? Math.ceil((thumbnails.length || 2) / 2)
                          : Math.ceil((thumbnails.length || 4) / 4);
                        return (
                          <div className="flex flex-col items-center gap-2 mt-4 pb-6 w-full">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-xl shadow-sm">
                              <button
                                onClick={() => setCurrentSheet(Math.max(0, currentSheet - 1))}
                                disabled={currentSheet === 0}
                                aria-label="Previous sheet"
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-20 transition-all active:scale-95"
                              >
                                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                              </button>
                              <div className="px-3 flex items-center gap-1 border-x border-gray-100">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sheet</span>
                                <span className="text-xs font-black text-gray-900">{currentSheet + 1}</span>
                                <span className="text-[9px] text-gray-300">/</span>
                                <span className="text-[9px] font-bold text-gray-400">{totalSheets}</span>
                              </div>
                              <button
                                onClick={() => setCurrentSheet(Math.min(totalSheets - 1, currentSheet + 1))}
                                disabled={currentSheet >= totalSheets - 1}
                                aria-label="Next sheet"
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-20 transition-all active:scale-95"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              {Array.from({ length: totalSheets }).map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setCurrentSheet(i)}
                                  className={cn(
                                    "h-1 rounded-full transition-all duration-300",
                                    currentSheet === i ? "bg-primary w-4" : "bg-gray-200 hover:bg-gray-300 w-1"
                                  )}
                                  aria-label={`Go to sheet ${i + 1}`}
                                  title={`Sheet ${i + 1}`}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                </div>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 }
