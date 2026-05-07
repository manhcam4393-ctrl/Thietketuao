import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Eraser, PenTool, Undo, MousePointer2, Check, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

interface InpaintMaskToolProps {
  imageUrl: string;
  onClose: () => void;
  onApply: (newImageUrl: string) => void;
}

export default function InpaintMaskTool({ imageUrl, onClose, onApply }: InpaintMaskToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [mode, setMode] = useState<'draw' | 'erase' | 'polygon'>('draw');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [polygonPoints, setPolygonPoints] = useState<{x: number, y: number}[]>([]);
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([imageData]);
    };
    img.src = currentImage;
  }, [currentImage]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, imageData]);
  };

  const undo = () => {
    if (mode === 'polygon' && polygonPoints.length > 0) {
      setPolygonPoints([]);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
      return;
    }

    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];
    
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (mode === 'polygon') {
      const newPoints = [...polygonPoints, { x, y }];
      setPolygonPoints(newPoints);
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      if (newPoints.length > 1) {
        const prev = newPoints[newPoints.length - 2];
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || mode === 'polygon') return;
    
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    
    if (mode === 'draw') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    }
    
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && mode !== 'polygon') {
      setIsDrawing(false);
      saveHistoryState();
    }
  };

  const completePolygon = () => {
    if (polygonPoints.length < 3) {
      setPolygonPoints([]);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const previousState = history[history.length - 1];
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
    }
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    ctx.closePath();
    ctx.fill();
    
    setPolygonPoints([]);
    saveHistoryState();
  };

  const getMaskBase64 = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return null;
    
    tCtx.fillStyle = 'black';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    const maskData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    if (!maskData) return null;
    
    const finalData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 0) {
        finalData.data[i] = 255;
        finalData.data[i + 1] = 255;
        finalData.data[i + 2] = 255;
        finalData.data[i + 3] = 255;
      }
    }
    
    tCtx.putImageData(finalData, 0, 0);
    return tempCanvas.toDataURL('image/png').split(',')[1];
  };

  const handleExecuteInpaint = async () => {
    if (!inpaintPrompt.trim()) return;
    setIsProcessing(true);
    
    try {
      const customApiKey = localStorage.getItem('geminiApiKey');
      const apiKey = customApiKey || process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('Thiếu API Key');
      }
      
      const genAI = new GoogleGenAI({ apiKey });
      
      const base64Data = currentImage.split(',')[1];
      const mimeType = currentImage.split(';')[0].split(':')[1];
      
      const maskBase64 = getMaskBase64();
      
      const parts: any[] = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        }
      ];

      if (maskBase64) {
        parts.push({
          inlineData: {
            data: maskBase64,
            mimeType: 'image/png',
          },
        });
        parts.push({
          text: `Inpaint/edit this image: ${inpaintPrompt}. The second image is a black and white mask indicating the area to modify (white area is the mask). Please focus on the requested changes in that specific area.`,
        });
      } else {
        parts.push({
          text: `Inpaint/edit this image: ${inpaintPrompt}.`,
        });
      }
      
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });
      
      let newImageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (newImageUrl) {
        setResultImage(newImageUrl);
      } else {
        alert('Không thể tạo ảnh mới. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Inpaint error:', error);
      alert('Có lỗi xảy ra khi xử lý ảnh. Vui lòng kiểm tra lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadMask = () => {
    const maskBase64 = getMaskBase64();
    if (!maskBase64) return;
    const link = document.createElement('a');
    link.download = 'inpaint-mask.png';
    link.href = `data:image/png;base64,${maskBase64}`;
    link.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-zinc-900/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-lg font-semibold text-white">Tạo Mask Sửa Lỗi (Inpaint)</h2>
        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex flex-col gap-6 p-6 border-r border-zinc-800 bg-zinc-900 overflow-y-auto">
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">Công cụ</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMode('draw')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${mode === 'draw' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                title="Tô vùng"
              >
                <PenTool size={20} />
                <span className="text-xs font-medium">Tô</span>
              </button>
              <button
                onClick={() => setMode('polygon')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${mode === 'polygon' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                title="Chọn vùng đa giác"
              >
                <MousePointer2 size={20} />
                <span className="text-xs font-medium">Vùng</span>
              </button>
              <button
                onClick={() => setMode('erase')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${mode === 'erase' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                title="Xóa"
              >
                <Eraser size={20} />
                <span className="text-xs font-medium">Xóa</span>
              </button>
            </div>
            {mode === 'polygon' && polygonPoints.length > 0 && (
              <button
                onClick={completePolygon}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 font-medium hover:bg-blue-500/30 transition-colors border border-blue-500/30"
              >
                <Check size={16} />
                Hoàn thành vùng chọn
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-zinc-300">Kích thước cọ</label>
              <span className="text-xs text-zinc-500">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
          
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <label className="text-sm font-medium text-zinc-300">Yêu cầu sửa lỗi (Prompt)</label>
            <textarea
              value={inpaintPrompt}
              onChange={(e) => setInpaintPrompt(e.target.value)}
              placeholder="VD: Thay thế bằng một chiếc ghế sofa màu xanh..."
              className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={handleExecuteInpaint}
              disabled={isProcessing || !inpaintPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isProcessing ? 'Đang xử lý...' : 'Thực hiện sửa lỗi'}
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <button
              onClick={undo}
              disabled={history.length <= 1 && polygonPoints.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Undo size={16} />
              Hoàn tác
            </button>
            
            <button
              onClick={downloadMask}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
            >
              <Download size={16} />
              Tải Mask (Trắng/Đen)
            </button>
          </div>
          
          <div className="mt-auto pt-6">
            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong>Hướng dẫn:</strong> Tô đỏ vào vùng bạn muốn AI vẽ lại (inpaint). Phần không tô sẽ được giữ nguyên. Tải mask về để sử dụng trong ControlNet Inpaint hoặc Photoshop.
            </p>
          </div>
        </div>
        
        <div className="flex-1 relative bg-zinc-950 overflow-hidden flex items-center justify-center p-8" ref={containerRef}>
          {resultImage ? (
            <div className="relative shadow-2xl flex flex-col items-center gap-4" style={{ maxHeight: '100%', maxWidth: '100%' }}>
              <img 
                src={resultImage} 
                alt="Result" 
                className="block max-w-full max-h-[calc(100vh-12rem)] object-contain"
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setResultImage(null)}
                  className="px-6 py-2.5 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => {
                    setCurrentImage(resultImage);
                    setResultImage(null);
                    setInpaintPrompt('');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                >
                  Chỉnh sửa tiếp
                </button>
                <button 
                  onClick={() => onApply(resultImage)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors flex items-center gap-2"
                >
                  <Check size={18} />
                  Áp dụng kết quả
                </button>
              </div>
            </div>
          ) : (
            <div className="relative shadow-2xl" style={{ maxHeight: '100%', maxWidth: '100%' }}>
              <img 
                src={currentImage} 
                alt="Base" 
                className="block max-w-full max-h-[calc(100vh-8rem)] object-contain pointer-events-none"
                style={{ display: 'block' }}
              />
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
