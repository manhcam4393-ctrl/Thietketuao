import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Sparkles, SlidersHorizontal, Image as ImageIcon, FileText, Upload, X, Play, Download, Save, Trash2, MessageCircle, ClipboardPaste, Sun, Palette, FolderOpen, ChevronDown, ChevronUp, Wand2, Maximize2, Minimize2, LayoutDashboard, Ruler, ArrowRight, ArrowLeft, Key, Layout, Armchair, Code, Plus, Minus, RotateCcw, Code2, Search, Camera, User, Phone, MapPin } from 'lucide-react';
import { AppState, Preset, FurnitureAnalysisData, CabinetBlock } from './types';
import { OPTIONS, PRESETS, DEFAULT_STATE, DEFAULT_LOGO, AN_CUONG_COLORS } from './constants';
import { GoogleGenAI } from '@google/genai';
import { ImageSettings, defaultImageSettings, applyFilters } from './imageProcessor';
import { motion, AnimatePresence } from 'motion/react';
import InpaintMaskTool from './components/InpaintMaskTool';
import Markdown from 'react-markdown';

const Accordion = ({ title, children, defaultOpen = false, isOpen: controlledIsOpen, onToggle, icon: Icon, extra }: { title: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean, isOpen?: boolean, onToggle?: (open: boolean) => void, icon?: React.ElementType, extra?: React.ReactNode }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const handleToggle = () => {
    if (onToggle) onToggle(!isOpen);
    else setInternalIsOpen(!isOpen);
  };

  return (
    <div className={`py-4 border-b border-zinc-100 last:border-0 ${isOpen ? 'relative' : ''}`}>
      <div className="flex items-center justify-between group">
        <button 
          className="flex-1 flex items-center justify-between text-left focus:outline-none py-1" 
          onClick={handleToggle}
        >
          <div className="flex items-center gap-3">
            {Icon && <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-zinc-100 text-zinc-400 group-hover:text-blue-500 group-hover:bg-blue-50'}`}>
              <Icon size={16} />
            </div>}
            {typeof title === 'string' ? (
              <h3 className={`text-[13px] font-black uppercase tracking-wider transition-colors ${isOpen ? 'text-blue-700' : 'text-zinc-500 group-hover:text-zinc-900'}`}>{title}</h3>
            ) : (
              title
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <ChevronDown size={18} className={`transition-colors ${isOpen ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
          </motion.div>
        </button>
        {extra && <div className="ml-2">{extra}</div>}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="pt-6 pb-2 space-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WARDROBE_FUNCTIONS = {
  hanging: { label: 'Khoang Treo đồ', t1: 'TREO', t2: 'ĐỒ', layers: 'Suốt treo áo' },
  folded: { label: 'Khoang đồ xếp', t1: 'ĐỒ', t2: 'XẾP', layers: 'Đợt gỗ chia ngăn' },
  drawer: { label: 'Hộc kéo', t1: 'HỘC', t2: 'KÉO', layers: 'Ngăn kéo' },
  single_door: { label: 'Khoang 1 cánh (Khoang Đơn)', t1: 'KHOANG', t2: 'ĐƠN', layers: '1 cánh mở' },
  double_door: { label: 'Khoang 2 cánh (Khoang đôi)', t1: 'KHOANG', t2: 'ĐÔI', layers: '2 cánh mở' },
  // Side Shelf Types
  shelves: { label: 'Kệ đợt ngang', t1: 'ĐỢT', t2: 'NGANG', layers: 'Các đợt gỗ ngang' },
  hanging_shelf: { label: 'Kệ treo & đợt', t1: 'TREO', t2: 'KỆ', layers: 'Suốt treo & đợt' },
  zigzag: { label: 'Kệ ô so le', t1: 'Ô SO', t2: 'LE', layers: 'Các ô so le trang trí' },
  drawers_shelf: { label: 'Kệ & hộc kéo', t1: 'KỆ', t2: 'HỘC', layers: 'Đợt & 2 ngăn kéo' },
  wine: { label: 'Kệ ô rượu', t1: 'TRANG', t2: 'TRÍ', layers: 'Ô rượu kim cương' },
  rounded: { label: 'Kệ bo góc', t1: 'BO', t2: 'CÔNG', layers: 'Đợt gỗ bo tròn' },
  glass_display: { label: 'Kệ tủ kính', t1: 'TỦ', t2: 'KÍNH', layers: 'Cánh kính trang trí' },
  bag_display: { label: 'Kệ túi xách', t1: 'TÚI', t2: 'XÁCH', layers: 'Ngăn trưng bày túi' },
  vanity: { label: 'Kệ bàn phấn', t1: 'BÀN', t2: 'PHẤN', layers: 'Bàn phấn tích hợp' },
  mirror: { label: 'Kệ trang gương', t1: 'GƯƠNG', t2: 'SOI', layers: 'Kệ phối gương soi' },
  left: { label: 'Model ngoài bên trái', t1: 'MOD', t2: 'L', layers: 'Nhập từ file Sketchup (.skp)' },
  right: { label: 'Model ngoài bên phải', t1: 'MOD', t2: 'R', layers: 'Nhập từ file Sketchup (.skp)' },
};

const generateWardrobeDiagram = (data: FurnitureAnalysisData, hasTopBlock: boolean, isCeilingHeight: boolean, height: number) => {
    const charPer100mm = 3; // 3 horizontal chars = 100mm
    const prefixLength = 2;
    const padPrefix = (text: string) => text.padEnd(prefixLength, ' ');
    
    const centerText = (text: string, width: number) => {
        if (text.length >= width) return text.substring(0, width);
        const leftPad = Math.floor((width - text.length) / 2);
        const rightPad = width - text.length - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    };

    const createRow = (prefix: string, rowBlocks: any[], rowType: 'top' | 'middle1' | 'middle2' | 'bottom' | 'empty' | 'shelf') => {
        let row = padPrefix(prefix);
        // Use a Set to only draw unique columns in horizontal lines
        const uniqueBlocks: any[] = [];
        const seenStarts = new Set();
        rowBlocks.forEach(b => {
            if (!seenStarts.has(b.start)) {
                uniqueBlocks.push(b);
                seenStarts.add(b.start);
            }
        });
        // Sort low to high for standard diagram (Left to Right)
        uniqueBlocks.sort((a, b) => a.start - b.start);

        uniqueBlocks.forEach((block, index) => {
            const w = (block.widthMm / 100) * charPer100mm;
            if (w <= 0) return;
            
            if (index === 0) row += '|';
            
            if (rowType === 'top' || rowType === 'bottom') {
                row += '-'.repeat(w - 1) + (index === uniqueBlocks.length - 1 ? '|' : '-');
            } else if (rowType === 'shelf') {
                row += '-'.repeat(w - 1) + (index === uniqueBlocks.length - 1 ? '|' : '-');
            } else if (rowType === 'empty') {
                row += ' '.repeat(w - 1) + '|';
            } else {
                const id = block.label?.split(' ')[0] || '';
                const text = rowType === 'middle1' ? id : (block.text1 + ' ' + block.text2);
                row += centerText(text, w - 1) + '|';
            }
        });
        return row;
    };

    let visualDiagram = "```text\n";
    
    // Ruler Horizontal - Standard (Left to Right)
    let ruler1 = padPrefix('');
    let ruler2 = padPrefix('');
    const totalW = data.totalChars * 100;
    for (let i = 0; i <= totalW; i += 500) {
        ruler1 += i.toString().padEnd(15, ' ');
        ruler2 += '|'.padEnd(15, ' ');
    }
    visualDiagram += `${ruler1}\n${ruler2}\n\n`;

    let lastLineDrawn = false;

    if (isCeilingHeight) {
        const ceilingBlocks = data.upperBlocks.filter(b => b.label?.split(' ')[0].endsWith('00'));
        if (ceilingBlocks.length > 0) {
            visualDiagram += `${createRow(``, ceilingBlocks, 'top')}\n`;
            visualDiagram += `${createRow('', ceilingBlocks, 'middle1')}\n`;
            visualDiagram += `${createRow('', ceilingBlocks, 'middle2')}\n`;
            visualDiagram += `${createRow('', ceilingBlocks, 'bottom')}\n`;
            lastLineDrawn = true;
        }
    }

    if (hasTopBlock) {
        const topBlocks = data.upperBlocks.filter(b => {
            const id = b.label?.split(' ')[0] || '';
            return id.endsWith('0') && !id.endsWith('00');
        });
        if (topBlocks.length > 0) {
            if (!lastLineDrawn) {
                visualDiagram += `${createRow(``, topBlocks, 'top')}\n`;
            }
            visualDiagram += `${createRow('', topBlocks, 'middle1')}\n`;
            visualDiagram += `${createRow('', topBlocks, 'middle2')}\n`;
            visualDiagram += `${createRow('', topBlocks, 'bottom')}\n`;
            lastLineDrawn = true;
        }
    }

    if (!lastLineDrawn) {
        visualDiagram += `${createRow(``, data.lowerBlocks, 'top')}\n`;
    }
    
    // Find max height to determine rows
    const maxMainHeight = Math.max(...data.lowerBlocks.map(b => (b.yOffsetMm || 0) + (b.heightMm || 0)), 1900);
    const mainHeightChars = Math.floor(maxMainHeight / 100);
    
    // Get unique columns by start position - Left to Right
    const startPositions = Array.from(new Set(data.lowerBlocks.map(b => b.start))).sort((a, b) => a - b);

    // Iterate from top to bottom
    for (let h = mainHeightChars - 1; h >= 0; h--) {
        let row = padPrefix('');
        
        startPositions.forEach((start, colIdx) => {
            const blockAtH = data.lowerBlocks.find(b => 
                b.start === start && 
                h >= Math.floor((b.yOffsetMm || 0) / 100) && 
                h < Math.floor(((b.yOffsetMm || 0) + (b.heightMm || 0)) / 100)
            );
            
            // Get width from any block in this column
            const firstBlockInCol = data.lowerBlocks.find(b => b.start === start);
            const w = Math.max(1, Math.round((firstBlockInCol?.widthMm || 0) / 100 * charPer100mm));
            
            if (colIdx === 0) row += '|';
            
            if (blockAtH) {
                const bHeightChars = Math.floor((blockAtH.heightMm || 0) / 100);
                const relativeH = h - Math.floor((blockAtH.yOffsetMm || 0) / 100);
                
                // Draw horizontal line at the boundary between blocks
                const isBlockBottomRow = h === Math.floor((blockAtH.yOffsetMm || 0) / 100) && (blockAtH.yOffsetMm || 0) > 0;

                if (isBlockBottomRow) {
                    const isLastCol = colIdx === startPositions.length - 1;
                    let separator = '|';
                    if (!isLastCol) {
                        const nextStart = startPositions[colIdx + 1];
                        const nextBlockAtH = data.lowerBlocks.find(b => 
                            b.start === nextStart && 
                            h === Math.floor((b.yOffsetMm || 0) / 100) && (b.yOffsetMm || 0) > 0
                        );
                        if (nextBlockAtH) separator = '-';
                    }
                    row += '-'.repeat(w - 1) + separator;
                } else if (relativeH === Math.floor(bHeightChars / 2)) {
                    const id = blockAtH.label?.split(' ')[0] || '';
                    row += centerText(id, w - 1) + '|';
                } else if (relativeH === Math.floor(bHeightChars / 2) - 1) {
                    const content = blockAtH.text1 + ' ' + blockAtH.text2;
                    row += centerText(content, w - 1) + '|';
                } else {
                    row += ' '.repeat(w - 1) + '|';
                }
            } else {
                row += ' '.repeat(w - 1) + '|';
            }
        });
        visualDiagram += `${row}\n`;
    }
    visualDiagram += `${createRow('', data.lowerBlocks, 'bottom')}\n`;
    
    visualDiagram += "```\n";
    return visualDiagram;
};


const ColorPicker = ({ onSelect, searchTerm, setSearchTerm, colors, label = "mã màu" }: { onSelect: (color: string) => void, searchTerm: string, setSearchTerm: (val: string) => void, colors: string[], label?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filteredColors = colors.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
  
  return (
    <div className="space-y-2 mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-100"
      >
        <Palette size={12} />
        {isOpen ? `Đóng bảng chọn ${label}` : `Chọn từ danh sách ${label}`}
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div className="p-3 bg-white rounded-2xl border border-zinc-200 shadow-xl animate-in fade-in zoom-in-95 duration-200 z-10 relative">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Tìm ${label}...`}
              className="w-full pl-9 pr-3 py-1.5 text-[10px] rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredColors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onSelect(color);
                  setIsOpen(false);
                }}
                className="text-left px-2 py-1.5 text-[9px] font-medium bg-zinc-50 border border-zinc-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg transition-all truncate"
                title={color}
              >
                {color}
              </button>
            ))}
            {filteredColors.length === 0 && (
              <div className="col-span-2 py-4 text-center text-[10px] text-zinc-400 italic">
                Không tìm thấy {label}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [apiMode, setApiMode] = useState<'free' | 'paid' | null>(null);
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [boxColorSearch, setBoxColorSearch] = useState('');
  const [doorColorSearch, setDoorColorSearch] = useState('');
  const [shelfColorSearch, setShelfColorSearch] = useState('');

  const getWardrobeImagePrompt = () => {
    if (!state.wardrobeAnalysisData) return "";
    const data = state.wardrobeAnalysisData;
    const width = state.wardrobeLength;
    const height = state.wardrobeHeight;
    const depth = state.wardrobeDepth;
    
    let prompt = `Highly precise 2D black and white technical CAD drawing (front elevation view) of a wardrobe interior. `;
    prompt += `Overall Dimensions: Width ${width}mm, Height ${height}mm, Depth ${depth}mm. `;
    prompt += `TECHNICAL SPECIFICATION: Every compartment and vertical/horizontal divider MUST be drawn with a distinct thickness of 17mm (representing the wood panel thickness). `;
    prompt += `The drawing must be strictly to scale based on the following compartment layout: `;
    
    const descriptions: string[] = [];
    
    // Include upper blocks (ceiling cabinets) if they exist
    if (data.upperBlocks.length > 0) {
      data.upperBlocks.forEach(b => {
        descriptions.push(`Compartment ${b.label} (Width: ${b.widthMm}mm, Height: ${b.heightMm}mm) - Function: ${WARDROBE_FUNCTIONS[b.functionType as keyof typeof WARDROBE_FUNCTIONS]?.label || b.functionType}`);
      });
    }
    
    // Include lower blocks (main body)
    data.lowerBlocks.forEach(b => {
      descriptions.push(`Compartment ${b.label} (Width: ${b.widthMm}mm, Height: ${b.heightMm}mm) - Function: ${WARDROBE_FUNCTIONS[b.functionType as keyof typeof WARDROBE_FUNCTIONS]?.label || b.functionType}`);
    });
    
    prompt += descriptions.join(", ") + ". ";
    
    prompt += `\n\nDRAWING RULES:
1. Front elevation view ONLY. No perspective, no 3D, no shading, no textures.
2. Use clean, monochromatic black lines on a white background.
3. Every single compartment MUST be drawn with a double-line border representing a 17mm thickness for all vertical and horizontal panels.
4. Draw horizontal and vertical dimension lines and write the EXACT width and height numbers for EVERY compartment.
5. For compartments with "HỘC THOẠI" (drawers), draw the horizontal lines separating the drawer faces with 17mm thickness between them.
6. For compartments with "SUỐT TREO" (hanging rods), draw a simple horizontal line representing the rod.
7. No text labels inside the compartments, only dimension numbers outside or near the lines.
8. Professional architectural blueprint style, high contrast, minimalist.

CRITICAL NEGATIVE PROMPT (ABSOLUTELY DO NOT DRAW THESE):
- ABSOLUTELY NO HANDLES, KNOBS, OR PULLS.
- NO CLOTHES, NO HANGERS, NO SHOES, NO ACCESSORIES.
- NO 3D DEPTH OR PERSPECTIVE.
- NO SHADING OR GRADIENTS.`;
    
    return prompt;
  };

  const copyImagePrompt = () => {
    const prompt = getWardrobeImagePrompt();
    navigator.clipboard.writeText(prompt);
    alert("Đã sao chép Prompt tạo hình ảnh vào bộ nhớ tạm!");
  };
  const [copiedMain, setCopiedMain] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [designImage, setDesignImage] = useState<string | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageSettings>(defaultImageSettings);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const originalImageDataRef = useRef<{ data: ImageData, width: number, height: number } | null>(null);
  const lastRenderedImageRef = useRef<string | null>(null);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [showDimensionsOnImage, setShowDimensionsOnImage] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showInpaintTool, setShowInpaintTool] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copiedSketchUp, setCopiedSketchUp] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [isSketchUpBuilt, setIsSketchUpBuilt] = useState(false);

  const handleCopySketchUpCode = (isExport: boolean = false) => {
    if (isExport && !isSketchUpBuilt) {
      alert("Vui lòng kích hoạt 'DỰNG HÌNH SKETCHUP' trước khi thực hiện Xuất hình!");
      return;
    }

    let code = '';
    if (state.wardrobeAnalysisResult && state.wardrobeAnalysisData) {
      const depth = parseInt(state.wardrobeDepth) || 600;
      code = generateSketchupRubyScript(state.wardrobeAnalysisData, depth, depth, state, isExport);
    }

    if (code) {
      // Copy to clipboard
      navigator.clipboard.writeText(code);
      
      // Download as ve_tu.rb
      const filename = 've_tu.rb';
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (isExport) {
        setCopiedExport(true);
        setTimeout(() => setCopiedExport(false), 2000);
      } else {
        setCopiedSketchUp(true);
        setIsSketchUpBuilt(true);
        setTimeout(() => setCopiedSketchUp(false), 2000);
      }
    } else {
      alert("Vui lòng thực hiện 'Phân tích công năng' trước khi thực hiện thao tác này.");
    }
  };
  const [customPresets, setCustomPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('customPresets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeAddMenu, setActiveAddMenu] = useState<{side: string, type: string, id: string} | null>(null);

  useEffect(() => {
    // We removed the automatic check to ensure the selection screen appears on every startup
    // as requested by the user.
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeAddMenu) setActiveAddMenu(null);
    };
    if (activeAddMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeAddMenu]);

  const handleSelectApiKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio?.openSelectKey();
      setApiMode('paid');
    } catch (e) {
      console.error("Failed to open select key dialog", e);
    }
  };

  const handleSelectFreeApi = () => {
    setApiMode('free');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLInputElement>(null);
  const companyLogoRef = useRef<HTMLInputElement>(null);
  const externalImageRef = useRef<HTMLInputElement>(null);
  const renderIdRef = useRef<number | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              // If the paste modal is open, paste to renderedImage
              if (document.getElementById('paste-modal')) {
                setRenderedImage(reader.result as string);
                setShowPasteModal(false);
              } else {
                handleChange('originalImage', reader.result as string);
              }
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleChange = <K extends keyof AppState>(field: K, value: AppState[K]) => {
    setState(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'wardrobeHeight') {
        const h = parseInt(value as string) || 0;
        if (h >= 2100) {
          newState.wardrobeIsCeilingHeight = true;
        } else {
          newState.wardrobeIsCeilingHeight = false;
        }
        // Update model base dir based on height
        if (h > 0) {
          const presets = ['2000', '2200', '2400'];
          const isPreset = presets.includes(String(value));
          const folderName = isPreset ? `H${h}` : 'Tuychon';
          const newBaseDir = `D:\\AI APP SKETCHUP\\DC KỆ TỦ ÁO\\${folderName}`;
          newState.wardrobeModelBaseDir = newBaseDir;

          // Also update existing external paths if they exist
          if (newState.wardrobeSideShelfExternalPaths) {
            const updatedPaths = { ...newState.wardrobeSideShelfExternalPaths };
            let changed = false;
            Object.keys(updatedPaths).forEach(key => {
              const currentPath = updatedPaths[key];
              if (currentPath && currentPath.includes('.skp')) {
                const parts = currentPath.split(/[/\\]/);
                const fileName = parts[parts.length - 1];
                const normalizedBase = newBaseDir.replace(/\\/g, '/');
                updatedPaths[key] = (normalizedBase.endsWith('/') ? normalizedBase : normalizedBase + '/') + fileName;
                changed = true;
              }
            });
            if (changed) newState.wardrobeSideShelfExternalPaths = updatedPaths;
          }
        }
      }
      if (field === 'wardrobeIsCeilingHeight') {
        const h = parseInt(state.wardrobeHeight) || 0;
        if (h >= 2100 && value === false) {
          newState.wardrobeIsCeilingHeight = true;
        }
        if (newState.wardrobeIsCeilingHeight === false) {
          newState.wardrobeCeilingAdjustment = 0;
        }
      }
      
      // Automatic width jump for side shelf types
      if (field === 'wardrobeSideShelfLeftType' || field === 'wardrobeSideShelfRightType') {
        const defaultWidths: Record<string, string> = {
          shelves: '400',
          hanging: '400',
          zigzag: '350',
          drawers: '450',
          wine: '400',
          rounded: '300',
          glass_display: '400',
          bag_display: '350',
          vanity: '1000',
          mirror: '400'
        };
        const type = value as string;
        if (defaultWidths[type]) {
          if (field === 'wardrobeSideShelfLeftType') (newState as any).wardrobeSideShelfLeftWidth = defaultWidths[type];
          else if (field === 'wardrobeSideShelfRightType') (newState as any).wardrobeSideShelfRightWidth = defaultWidths[type];
        }
      }
      
      return newState;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('referenceImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!renderedImage) {
      setProcessedImage(null);
      originalImageDataRef.current = null;
      lastRenderedImageRef.current = null;
      return;
    }

    const process = async () => {
      try {
        setIsProcessingImage(true);
        
        if (lastRenderedImageRef.current !== renderedImage || !originalImageDataRef.current) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = renderedImage;
          });

          const canvas = document.createElement('canvas');
          
          // Scale down for preview to make sliders fast
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            setIsProcessingImage(false);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          originalImageDataRef.current = {
            data: ctx.getImageData(0, 0, width, height),
            width,
            height
          };
          lastRenderedImageRef.current = renderedImage;
        }

        const { data: origData, width, height } = originalImageDataRef.current!;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessingImage(false);
          return;
        }

        const imageData = new ImageData(new Uint8ClampedArray(origData.data), width, height);
        applyFilters(imageData, imageSettings);
        
        ctx.putImageData(imageData, 0, 0);
        setProcessedImage(canvas.toDataURL('image/jpeg', 0.9));
        setIsProcessingImage(false);
      } catch (error) {
        console.error("Image processing error:", error);
        setIsProcessingImage(false);
        // Fallback to original image if processing fails
        if (renderedImage) setProcessedImage(renderedImage);
      }
    };

    const timeoutId = setTimeout(process, 50);
    return () => clearTimeout(timeoutId);
  }, [renderedImage, imageSettings]);

  if (apiMode === null) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-blue-500/5 border border-zinc-200 max-w-lg w-full text-center space-y-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 rotate-3">
            <Key size={36} className="-rotate-3" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Chào mừng bạn!</h2>
            <p className="text-zinc-500 text-base leading-relaxed">
              Vui lòng chọn phiên bản bạn muốn sử dụng để bắt đầu thiết kế không gian mơ ước của mình.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={handleSelectFreeApi}
              className="group relative overflow-hidden bg-white hover:bg-zinc-50 border-2 border-zinc-100 hover:border-zinc-200 p-6 rounded-3xl transition-all duration-300 text-left flex items-center gap-5 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600 group-hover:bg-white transition-colors">
                <Sun size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-zinc-900 text-lg">Bản Eco VS1</h3>
                <p className="text-sm text-zinc-500">Sử dụng mô hình Gemini 2.5 Flash</p>
              </div>
              <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
            </button>

            <button
              onClick={handleSelectApiKey}
              className="group relative overflow-hidden bg-white hover:bg-blue-50 border-2 border-blue-100 hover:border-blue-200 p-6 rounded-3xl transition-all duration-300 text-left flex items-center gap-5 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Sparkles size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-zinc-900 text-lg">Bản Pro API</h3>
                <p className="text-sm text-zinc-500">Sử dụng mô hình Gemini 3.1 Pro (Mạnh nhất)</p>
              </div>
              <ArrowRight size={20} className="text-blue-300 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-blue-600 transition-colors text-xs font-medium"
            >
              Tìm hiểu thêm về Gemini API
              <ArrowRight size={12} />
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleOriginalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('originalImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExternalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRenderedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteExternalImage = () => {
    setShowPasteModal(true);
  };

  const removeImage = () => {
    handleChange('referenceImage', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeOriginalImage = () => {
    handleChange('originalImage', null);
    if (originalImageRef.current) {
      originalImageRef.current.value = '';
    }
  };

  const applyPreset = (presetState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...presetState }));
  };


const generateSketchupRubyScript = (data: FurnitureAnalysisData, lowerDepth: number, upperDepth: number, state: AppState, isExport: boolean = false) => {
  let ruby = `# SketchUp Ruby Script - Generated by Cabinet AI\n`;
  ruby += `# Type: WARDROBE\n`;
  ruby += `# Mode: ${isExport ? 'EXPORT ONLY' : 'BUILD + EXPORT'}\n`;
  ruby += `# Dimensions: Lower Depth ${lowerDepth}mm, Upper Depth ${upperDepth}mm\n\n`;
  ruby += `mod = Sketchup.active_model\n`;
  ruby += `ent = mod.active_entities\n`;
  ruby += `mats = mod.materials\n\n`;
  
  if (!isExport) {
    ruby += `# Clear existing entities to avoid duplication\n`;
    ruby += `ent.grep(Sketchup::Group).each { |g| g.erase! if g.name =~ /^Tu_Ao_/ }\n\n`;
  }

  const boxMap = state.wardrobeBoxColorMapPath || state.wardrobeColorMapPath;
  const doorMap = state.wardrobeDoorColorMapPath || ((state.wardrobeSameColor || state.wardrobeAllSameColor) ? boxMap : '');
  const shelfMap = state.wardrobeShelfColorMapPath || ((state.wardrobeAllSameColor) ? boxMap : (state.wardrobeBoxColorMapPath || state.wardrobeColorMapPath));

  if (!isExport && state.wardrobeApplyMaterials) {
    if (boxMap) {
      const materialName = "Wardrobe_Box_Material";
      ruby += `\n# Setup Box Material\n`;
      ruby += `mat = mats["${materialName}"]\n`;
      ruby += `mat = mats.add("${materialName}") if !mat\n`;
      ruby += `begin\n`;
      ruby += `  mat.texture = "${boxMap.replace(/\\/g, '/')}"\n`;
      ruby += `  mat.texture.size = [1200.mm, 2400.mm]\n`;
      ruby += `rescue => e\n`;
      ruby += `  puts "Không thể tải map màu thùng: #{e.message}"\n`;
      ruby += `end\n\n`;
    }

    if (doorMap && doorMap !== boxMap) {
      const materialName = "Wardrobe_Door_Material";
      ruby += `\n# Setup Door Material\n`;
      ruby += `mat = mats["${materialName}"]\n`;
      ruby += `mat = mats.add("${materialName}") if !mat\n`;
      ruby += `begin\n`;
      ruby += `  mat.texture = "${doorMap.replace(/\\/g, '/')}"\n`;
      ruby += `  mat.texture.size = [1200.mm, 2400.mm]\n`;
      ruby += `rescue => e\n`;
      ruby += `  puts "Không thể tải map màu cánh: #{e.message}"\n`;
      ruby += `end\n\n`;
    }

    if (shelfMap && shelfMap !== boxMap) {
      const materialName = "Wardrobe_Shelf_Material";
      ruby += `\n# Setup Decorative Shelf Material\n`;
      ruby += `mat = mats["${materialName}"]\n`;
      ruby += `mat = mats.add("${materialName}") if !mat\n`;
      ruby += `begin\n`;
      ruby += `  mat.texture = "${shelfMap.replace(/\\/g, '/')}"\n`;
      ruby += `  mat.texture.size = [1200.mm, 2400.mm]\n`;
      ruby += `rescue => e\n`;
      ruby += `  puts "Không thể tải map màu kệ trang trí: #{e.message}"\n`;
      ruby += `end\n\n`;
    }
  }

  ruby += `main_group = ent.add_group\n`;
  ruby += `main_group.name = "WARDROBE_${Date.now()}"\n`;
  ruby += `entities = main_group.entities\n\n`;
  
  ruby += `def create_box(entities, x, y, z, w, d, h, name, mat_name = nil)\n`;
  ruby += `  return if h <= 0 || w <= 0 || d <= 0\n`;
  ruby += `  group = entities.add_group\n`;
  ruby += `  group.name = name\n`;
  ruby += `  pts = []\n`;
  ruby += `  pts << [x.mm, y.mm, z.mm]\n`;
  ruby += `  pts << [(x+w).mm, y.mm, z.mm]\n`;
  ruby += `  pts << [(x+w).mm, (y+d).mm, z.mm]\n`;
  ruby += `  pts << [x.mm, (y+d).mm, z.mm]\n`;
  ruby += `  face = group.entities.add_face(pts)\n`;
  ruby += `  face.reverse! if face.normal.z < 0\n`;
  ruby += `  face.pushpull(h.mm)\n`;
  ruby += `  \n`;
  ruby += `  if mat_name\n`;
  ruby += `    mat = Sketchup.active_model.materials[mat_name]\n`;
  ruby += `    group.entities.each { |e| e.material = mat if e.is_a?(Sketchup::Face) }\n`;
  ruby += `  end\n`;
  ruby += `  \n`;
  ruby += `  return group\n`;
  ruby += `end\n\n`;

  const boxMatParam = (state.wardrobeApplyMaterials && boxMap) ? ', "Wardrobe_Box_Material"' : '';
  const doorMatParam = (state.wardrobeApplyMaterials && doorMap) ? (doorMap === boxMap ? ', "Wardrobe_Box_Material"' : ', "Wardrobe_Door_Material"') : '';
  const shelfMatParam = (state.wardrobeApplyMaterials && shelfMap) ? (shelfMap === boxMap ? ', "Wardrobe_Box_Material"' : ', "Wardrobe_Shelf_Material"') : '';

  ruby += `def add_cabinet_panels(entities, x, y, z, w, d, h, t, kick_h, top_fascia_h, prefix, mat_name = nil)\n`;
  ruby += `  return if h <= 0 || w <= 0 || d <= 0\n`;
  ruby += `  back_t = 9\n`;
  ruby += `  # Back panel (Hau)\n`;
  ruby += `  create_box(entities, x, y, z, w, back_t, h, "#{prefix} Hau", mat_name)\n`;
  ruby += `  # Left side\n`;
  ruby += `  create_box(entities, x, y + back_t, z, t, d - back_t, h, "#{prefix} Hong trai", mat_name)\n`;
  ruby += `  # Right side\n`;
  ruby += `  create_box(entities, x + w - t, y + back_t, z, t, d - back_t, h, "#{prefix} Hong phai", mat_name)\n`;
  ruby += `  # Bottom (Raised by kick_h)\n`;
  ruby += `  create_box(entities, x + t, y + back_t, z + kick_h, w - 2*t, d - back_t, t, "#{prefix} Day", mat_name)\n`;
  ruby += `  # Top\n`;
  ruby += `  top_d = d - back_t\n`;
  ruby += `  if top_fascia_h > 0\n`;
  ruby += `    top_d -= t\n`;
  ruby += `  end\n`;
  ruby += `  create_box(entities, x + t, y + back_t, z + h - t, w - 2*t, top_d, t, "#{prefix} Dinh", mat_name)\n`;
  ruby += `  # Kickplate (Len chan) - only if kick_h > 0\n`;
  ruby += `  if kick_h > 0\n`;
  ruby += `    create_box(entities, x + t, y + d - t, z, w - 2*t, t, kick_h, "#{prefix} Len chan", mat_name)\n`;
  ruby += `  end\n`;
  ruby += `  # Top Fascia (Len dinh) - only if top_fascia_h > 0\n`;
  ruby += `  if top_fascia_h > 0\n`;
  ruby += `    create_box(entities, x + t, y + d - t, z + h - top_fascia_h, w - 2*t, t, top_fascia_h, "#{prefix} Len dinh", mat_name)\n`;
  ruby += `  end\n`;
  ruby += `end\n\n`;

  ruby += `def create_wardrobe_doors(entities, x, y, z, w, h, wing_count, name, mat_name = nil)\n`;
  ruby += `  return if h <= 0 || w <= 0 || wing_count <= 0\n`;
  ruby += `  door_t = 17\n`;
  ruby += `  gap = 0\n`;
  ruby += `  door_w = w / wing_count\n`;
  ruby += `  (0...wing_count).each do |i|\n`;
  ruby += `    dx = x + i * (door_w + gap)\n`;
  ruby += `    create_box(entities, dx, y, z, door_w, door_t, h, "#{name} - Canh #{i+1}", mat_name)\n`;
  ruby += `  end\n`;
  ruby += `end\n\n`;

  // Start wrapping in a draw_wardrobe function to potentially call it twice
  ruby += `def draw_wardrobe(parent_entities, offset_x, is_colored, lower_depth, upper_depth, wardrobe_length, wardrobe_height, wardrobe_box_depth, wardrobe_upper_box_depth, show_internal, hide_doors, shift_doors, is_ceiling_height, total_chars, ceiling_adjustment, group_name)\n`;
  ruby += `  group = parent_entities.add_group\n`;
  ruby += `  group.name = group_name\n`;
  ruby += `  group.transformation = Geom::Transformation.translation([offset_x.mm, 0, 0])\n`;
  ruby += `  entities = group.entities\n`;
  ruby += `  mats = Sketchup.active_model.materials\n`;
  ruby += `  box_mat = is_colored ? "Wardrobe_Box_Material" : nil\n`;
  ruby += `  door_mat = is_colored ? "Wardrobe_Door_Material" : nil\n`;
  ruby += `  shelf_mat = is_colored ? "Wardrobe_Shelf_Material" : nil\n`;
  ruby += `  # If SameColor, overwrite door/shelf mat\n`;
  if (state.wardrobeSameColor || state.wardrobeAllSameColor) {
    ruby += `  door_mat = box_mat\n`;
  }
  if (state.wardrobeAllSameColor) {
    ruby += `  shelf_mat = box_mat\n`;
  }
  ruby += `\n`;

  // Process blocks
  const wardrobeBoxDepth = lowerDepth - 17;
  const wardrobeUpperBoxDepth = upperDepth - 17;

  // Group blocks by their group prefix (A, B, C...)
  const aggregatedGroups: { [key: string]: { start: number, widthMm: number, x: number, totalHeight: number, blockCount: number, numWings: number, isSideShelf: boolean } } = {};
  
  const getBlockGroupKey = (label: string, id: string) => {
    if (!label) return 'Unknown';
    if (label.startsWith('K_T')) return 'K_T';
    if (label.startsWith('K_P')) return 'K_P';
    return label.charAt(0);
  };

  // Collect from lower blocks
  data.lowerBlocks.forEach(b => {
    const groupKey = getBlockGroupKey(b.label || '', b.id);
    
    if (!aggregatedGroups[groupKey]) {
      aggregatedGroups[groupKey] = {
        start: b.start,
        widthMm: b.widthMm,
        x: b.start * 100,
        totalHeight: 0,
        blockCount: 0,
        numWings: b.numWings || 1,
        isSideShelf: b.id.includes('sideshelf')
      };
    }
    const topPos = (b.yOffsetMm || 0) + b.heightMm;
    if (topPos > aggregatedGroups[groupKey].totalHeight) {
      aggregatedGroups[groupKey].totalHeight = topPos;
    }
    aggregatedGroups[groupKey].blockCount++;
  });

  // Also collect from upper blocks to ensure keys exist and map to correct groups
  data.upperBlocks.forEach(b => {
    const groupKey = getBlockGroupKey(b.label || '', b.id);
    if (!aggregatedGroups[groupKey]) {
      aggregatedGroups[groupKey] = {
        start: b.start,
        widthMm: b.widthMm,
        x: b.start * 100,
        totalHeight: 0,
        blockCount: 0,
        numWings: b.numWings || 1,
        isSideShelf: b.id.includes('sideshelf')
      };
    }
  });

  Object.entries(aggregatedGroups).forEach(([key, g]) => {
    const rubyVar = `group_${key.replace('_', '')}_ents`;
    let groupDisplayName = `Khối ${key}`;
    if (key === 'K_T') groupDisplayName = "Kệ Trang Trí Trái";
    if (key === 'K_P') groupDisplayName = "Kệ Trang Trí Phải";

    ruby += `  group_${key.replace('_', '')} = entities.add_group\n`;
    ruby += `  group_${key.replace('_', '')}.name = "${groupDisplayName}"\n`;
    ruby += `  ${rubyVar} = group_${key.replace('_', '')}.entities\n\n`;

    const isSideShelf = g.isSideShelf;
    let isExternalSideShelf = false;
    if (isSideShelf) {
      const b = data.lowerBlocks.find(blk => blk.label?.startsWith(key) && blk.id.includes('sideshelf'));
      if (b && (b.functionType || '').split('_')[2] === 'external') {
        isExternalSideShelf = true;
      }
    }

    const cabinetBoxHeight = g.totalHeight + 17;
    const topFasciaH = (!isSideShelf && state.wardrobeIsCeilingHeight) ? 50 : 0;
    const kickH = 50;
    const prefix = `Khối ${key}`;

    if (isSideShelf) {
      const b = data.lowerBlocks.find(blk => blk.label?.startsWith(key) && blk.id.includes('sideshelf'));
      if (!b) return;

      const parts = (b.functionType || '').split('_');
      const side = parts[1] as 'left' | 'right';
      const category = parts[2] as 'internal' | 'external';
      const shelfType = parts[3];
      const extType = parts[4];
      const spacing = parseInt(parts[5]) || 400;

      const sW = g.widthMm;
      const sX = Number(state.wardrobeLength) - g.x - sW;
      let sH = cabinetBoxHeight;
      if (category === 'external') {
        sH = parseInt(state.wardrobeHeight) || 0;
      }
      const sD = lowerDepth;
      const sT = 17;
      
      if (category === 'external') {
        const extCode = state.wardrobeSideShelfExternalCodes?.[extType] || '';
        ruby += `  # External Side Shelf Model Code (${extType}) - ${side.toUpperCase()}\n`;
        ruby += `  x = ${sX}; y = 0; z = 0; w = ${sW}; h = ${sH}; d = ${sD}; t = ${sT}; entities = ${rubyVar};\n`;
        ruby += `  ${extCode.replace(/\n/g, '\n  ')}\n`;
        ruby += `  if defined?(instance) && instance && shelf_mat\n`;
        ruby += `    instance.material = mats[shelf_mat]\n`;
        ruby += `  end\n`;
      } else {
        ruby += `  # Open Decorative Shelf (${shelfType}) - ${side.toUpperCase()}\n`;
        ruby += `  create_box(${rubyVar}, ${sX}, 0, 0, ${sW}, 9, ${sH}, "${prefix} hau", shelf_mat)\n`;
        ruby += `  create_box(${rubyVar}, ${sX}, 9, 0, ${sT}, ${sD-9}, ${sH}, "${prefix} hong trai", shelf_mat)\n`;
        ruby += `  create_box(${rubyVar}, ${sX + sW - sT}, 9, 0, ${sT}, ${sD-9}, ${sH}, "${prefix} hong phai", shelf_mat)\n`;
        ruby += `  create_box(${rubyVar}, ${sX + sT}, ${sD - 17}, 0, ${sW - 2*sT}, 17, ${kickH}, "${prefix} len chan", shelf_mat)\n`;
        ruby += `  create_box(${rubyVar}, ${sX + sT}, 9, ${sH - sT}, ${sW - 2*sT}, ${sD-9}, ${sT}, "${prefix} noi", shelf_mat)\n`;
        ruby += `  create_box(${rubyVar}, ${sX + sT}, 9, ${kickH}, ${sW - 2*sT}, ${sD-9}, ${sT}, "${prefix} day", shelf_mat)\n`;

        const startZ = kickH + sT;
        const shelfSpacing = spacing;
        
        if (shelfType === 'hanging') {
          const topShelfZ = sH - sT - shelfSpacing;
          ruby += `  create_box(${rubyVar}, ${sX + sT}, 9, ${topShelfZ}, ${sW - 2*sT}, ${sD-9}, ${sT}, "${prefix} dot ngang tren", shelf_mat)\n`;
          ruby += `  create_box(${rubyVar}, ${sX+sT + (sW-2*sT)/2 - 15}, ${sD/2 - 15}, ${topShelfZ - 40}, 30, 30, 30, "${prefix} suot treo", shelf_mat)\n`;
        } else if (shelfType === 'drawers') {
          const drH = 300;
          for (let di = 0; di < 2; di++) {
             const drZ = startZ + di * drH;
             ruby += `  create_box(${rubyVar}, ${sX + sT + 2}, ${sD - 17}, ${drZ + 2}, ${sW - 2*sT - 4}, 17, ${drH - 4}, "${prefix} mat hoc ke ${di}", shelf_mat)\n`;
             ruby += `  create_box(${rubyVar}, ${sX + sT + 10}, 10, ${drZ + 10}, ${sW - 2*sT - 20}, ${sD - 40}, ${drH - 30}, "${prefix} thung hoc ke ${di}", shelf_mat)\n`;
          }
          const remainingStart = startZ + 2 * drH;
          const numShelves = Math.floor((sH - sT - remainingStart) / shelfSpacing);
          for (let i = 1; i <= numShelves; i++) {
            const sZ = remainingStart + i * shelfSpacing;
            if (sZ < sH - 100)
              ruby += `  create_box(${rubyVar}, ${sX + sT}, 9, ${sZ}, ${sW - 2*sT}, ${sD-9}, ${sT}, "${prefix} dot ngang ${i}", shelf_mat)\n`;
          }
        } else {
          const availableH = sH - sT - kickH - sT;
          const numShelves = Math.floor(availableH / shelfSpacing);
          for (let i = 1; i <= numShelves; i++) {
              const sZ = startZ + i * shelfSpacing;
              if (sZ < sH - 100)
                ruby += `  create_box(${rubyVar}, ${sX + sT}, 9, ${sZ}, ${sW - 2*sT}, ${sD-9}, ${sT}, "${prefix} dot ngang ${i}", shelf_mat)\n`;
          }
        }
      }
    } else {
      const mirroredX = Number(state.wardrobeLength) - g.x - g.widthMm;
      ruby += `  add_cabinet_panels(${rubyVar}, ${mirroredX}, 0, 0, ${g.widthMm}, wardrobe_box_depth, ${cabinetBoxHeight}, 17, ${kickH}, ${topFasciaH}, "${prefix}", box_mat)\n`;
    }

    // Individual chunks (shelves, drawers) within the same group entity
    data.lowerBlocks.filter(b => {
      const bKey = getBlockGroupKey(b.label || '', b.id);
      return bKey === key && !b.id.includes('sideshelf');
    }).forEach(b => {
      const rawX = b.start * 100 + 17;
      const w = b.widthMm - 34;
      const x = Number(state.wardrobeLength) - rawX - w;
      const y = 9;
      const z = b.yOffsetMm || 0;
      const d = wardrobeBoxDepth - 9;
      const h = b.heightMm;
      const name = b.label || 'Block';
      const funcType = b.functionType;

      if (funcType && (funcType === 'left' || funcType === 'right' || funcType.startsWith('external_'))) {
        const mKey = (funcType === 'left' || funcType === 'right') ? funcType : `model_${funcType.split('_')[1]}`;
        const extCode = state.wardrobeSideShelfExternalCodes?.[mKey] || '';
        ruby += `  # External Model ${mKey} for Block ${name}\n`;
        ruby += `  x = ${x}; y = ${y}; z = ${z}; w = ${w}; h = ${h}; d = ${d}; t = 17; entities = ${rubyVar};\n`;
        ruby += `  ${extCode.replace(/\n/g, '\n  ')}\n`;
      } else {
        if (z > 67) {
          ruby += `  create_box(${rubyVar}, ${x}, ${y}, ${z}, ${w}, ${d}, 17, "${prefix} dot ngang ${name}", box_mat)\n`;
        }

        const lowerName = name.toLowerCase();
        const isDrawer = lowerName.includes('hộc kéo') || lowerName.includes('học kéo') || lowerName.includes('ngăn kéo') || lowerName.includes('hộc thoại') || lowerName.includes('học thoại') || lowerName.includes('drawer');
        
        if (isDrawer) {
          const railH = 50;
          const railT = 17;
          const railZ = z + h - railH;
          const railY = wardrobeBoxDepth - railT;
          ruby += `  create_box(${rubyVar}, ${x}, ${railY}, ${railZ}, ${w}, ${railT}, ${railH}, "${prefix} len vat ${name}", box_mat)\n`;

          const innerD = 450;
          const innerW = w - 28;
          const innerX = x + 14; 
          const innerZ = z + 25;
          const innerH = h - 125;
          const innerY = wardrobeBoxDepth - innerD;
          
          ruby += `  create_box(${rubyVar}, ${innerX}, ${innerY}, ${innerZ}, ${innerW}, ${innerD}, 9, "${prefix} day hoc keo ${name}", box_mat)\n`;
          const vertZ = innerZ + 9;
          const vertH = innerH - 9;
          ruby += `  create_box(${rubyVar}, ${innerX}, ${innerY}, ${vertZ}, 17, ${innerD}, ${vertH}, "${prefix} hong trai hoc keo ${name}", box_mat)\n`;
          ruby += `  create_box(${rubyVar}, ${innerX + innerW - 17}, ${innerY}, ${vertZ}, 17, ${innerD}, ${vertH}, "${prefix} hong phai hoc keo ${name}", box_mat)\n`;
          ruby += `  create_box(${rubyVar}, ${innerX + 17}, ${innerY}, ${vertZ}, ${innerW - 34}, 17, ${vertH}, "${prefix} hau hoc keo ${name}", box_mat)\n`;
          ruby += `  create_box(${rubyVar}, ${innerX + 17}, wardrobe_box_depth - 17, ${vertZ}, ${innerW - 34}, 17, ${vertH}, "${prefix} mat truoc hoc keo ${name}", box_mat)\n`;
        } else if (state.wardrobeShowInternalBlocks) {
          ruby += `  create_box(${rubyVar}, ${x}, ${y}, ${z}, ${w}, ${d}, ${h}, "${prefix} khoi phu ${name}", box_mat)\n`;
        }
      }
    });

    // Top/Ceiling blocks for this specific group
    if (!isExternalSideShelf) {
      data.upperBlocks.filter(b => getBlockGroupKey(b.label || '', b.id) === key).forEach(b => {
        const rawX = b.start * 100;
        const w = b.widthMm;
        const x = Number(state.wardrobeLength) - rawX - w;
        const z = b.yOffsetMm || 0;
        const d = wardrobeUpperBoxDepth;
        const h = b.heightMm;
        const bPrefix = `Khối ${b.label || 'Upper'}`;
        const funcType = b.functionType;
        
        if (funcType && (funcType === 'left' || funcType === 'right' || funcType.startsWith('external_'))) {
          const mKey = (funcType === 'left' || funcType === 'right') ? funcType : `model_${funcType.split('_')[1]}`;
          const extCode = state.wardrobeSideShelfExternalCodes?.[mKey] || '';
          ruby += `  # External Model ${mKey} for Block ${b.label}\n`;
          ruby += `  x = ${x}; y = 0; z = ${z}; w = ${w}; h = ${h}; d = ${d}; t = 17; entities = ${rubyVar};\n`;
          ruby += `  ${extCode.replace(/\n/g, '\n  ')}\n`;
        } else {
          ruby += `  add_cabinet_panels(${rubyVar}, ${x}, 0, ${z}, ${w}, ${d}, ${h}, 17, 0, 0, "${bPrefix}", box_mat)\n`;
          if (state.wardrobeShowInternalBlocks) ruby += `  create_box(${rubyVar}, ${x+17}, 9, ${z+17}, ${w-34}, ${d-9}, ${h-34}, "${bPrefix} noi dung", box_mat)\n`;
        }

        if (!state.wardrobeHideDoors) {
          ruby += `  if !hide_doors\n`;
          ruby += `    door_y = shift_doors ? -1000 : wardrobe_upper_box_depth\n`;
          ruby += `    dx = (wardrobe_length - ${rawX} - ${w}).to_f\n`;
          ruby += `    create_wardrobe_doors(${rubyVar}, dx, door_y, ${z}, ${w}, ${h}, ${b.numWings || 1}, "${bPrefix} canh tu", door_mat)\n`;
          ruby += `  end\n`;
        }
      });
    }

    // Doors for this group (main body)
    if (!state.wardrobeHideDoors && !isSideShelf) {
      const blocksInGroup = data.lowerBlocks.filter(b => {
        const bKey = getBlockGroupKey(b.label || '', b.id);
        return bKey === key;
      }).sort((a,b)=>(a.yOffsetMm||0)-(b.yOffsetMm||0));
      
      ruby += `  doorY = shift_doors ? -1000 : wardrobe_box_depth\n`;
      ruby += `  doorX = (wardrobe_length - ${g.x} - ${g.widthMm}).to_f\n`;
      let currentSegment: { z: number, top: number, wings: number } | null = null;
      blocksInGroup.forEach((b, idx) => {
        const lowerName = (b.label||'').toLowerCase();
        const isDrawer = lowerName.includes('hộc kéo')||lowerName.includes('học kéo')||lowerName.includes('ngăn kéo')||lowerName.includes('hộc thoại')||lowerName.includes('học thoại')||lowerName.includes('drawer');
        const bZ = b.yOffsetMm || 0;
        const bTop = bZ + b.heightMm;
        if (isDrawer) {
          if (currentSegment) {
            let sZ = currentSegment.z; let sH = currentSegment.top - sZ;
            if (sZ === 67) { sZ = 50; sH += 17; }
            if (sH > 0) ruby += `  create_wardrobe_doors(${rubyVar}, doorX, doorY, ${sZ}, ${g.widthMm}, ${sH}, ${currentSegment.wings}, "Canh tu ${key}", door_mat)\n`;
            currentSegment = null;
          }
          let wingCount = b.numWings || 1; if (wingCount === 2) wingCount = 1;
          let dZ = bZ; let dH = b.heightMm - 25;
          if (dZ === 67) { dZ = 50; dH += 17; }
          ruby += `  create_wardrobe_doors(${rubyVar}, doorX, doorY, ${dZ}, ${g.widthMm}, ${dH}, ${wingCount}, "${prefix} canh hoc keo ${b.label}", door_mat)\n`;
        } else {
          if (!currentSegment) { currentSegment = { z: bZ, top: bTop, wings: g.numWings }; } else { currentSegment.top = Math.max(currentSegment.top, bTop); currentSegment.z = Math.min(currentSegment.z, bZ); }
        }
        if (idx === blocksInGroup.length-1 && currentSegment) {
          let sZ = currentSegment.z; let sH = currentSegment.top - sZ;
          if (sZ === 67) { sZ = 50; sH += 17; }
          if (sH > 0) ruby += `  create_wardrobe_doors(${rubyVar}, doorX, doorY, ${sZ}, ${g.widthMm}, ${sH}, ${currentSegment.wings}, "Canh tu ${key}", door_mat)\n`;
        }
      });
    }
  });
  ruby += `end\n\n`;

  // Actually call the generation
  const lowerBoxDepth = lowerDepth - 17;
  const upperBoxDepth = upperDepth - 17;
  
  if (!isExport) {
    // Standard generation at 0 (with colors)
    ruby += `draw_wardrobe(ent, 0, ${state.wardrobeApplyMaterials}, ${lowerDepth}, ${upperDepth}, ${state.wardrobeLength}, ${state.wardrobeHeight}, ${lowerBoxDepth}, ${upperBoxDepth}, ${state.wardrobeShowInternalBlocks}, ${state.wardrobeHideDoors}, ${state.wardrobeShiftDoors}, ${state.wardrobeIsCeilingHeight}, ${data.totalChars}, ${state.wardrobeCeilingAdjustment}, "Tu_Ao_01")\n`;

    // Add full doors duplicate if selected (at 3000mm)
    if (state.wardrobeFullDoors) {
      ruby += `draw_wardrobe(ent, ${Number(state.wardrobeLength) + 3000}, ${state.wardrobeApplyMaterials}, ${lowerDepth}, ${upperDepth}, ${state.wardrobeLength}, ${state.wardrobeHeight}, ${lowerBoxDepth}, ${upperBoxDepth}, ${state.wardrobeShowInternalBlocks}, false, false, ${state.wardrobeIsCeilingHeight}, ${data.totalChars}, ${state.wardrobeCeilingAdjustment}, "Tu_Ao_02")\n`;
    }
  }

  // ENHANCED EXPORT LOGIC
  if (isExport) {
    const viewsToExport = [];
    if (state.wardrobeExportView3DLeft) viewsToExport.push('"3D_Left"');
    if (state.wardrobeExportView3DRight) viewsToExport.push('"3D_Right"');
    if (state.wardrobeExportViewFront) viewsToExport.push('"Front"');
    if (state.wardrobeExportViewSideLeft) viewsToExport.push('"Side_Left"');
    if (state.wardrobeExportViewSideRight) viewsToExport.push('"Side_Right"');
    if (state.wardrobeExportViewTop) viewsToExport.push('"Top"');

    if (viewsToExport.length > 0) {
      ruby += `\n# --- AUTOMATIC SEQUENTIAL EXPORT ---\n`;
      ruby += `def export_all_wardrobes(entities, requested_views)\n`;
      ruby += `  model = Sketchup.active_model\n`;
      ruby += `  view = model.active_view\n`;
      ruby += `  export_dir = File.join(Dir.home, "Desktop", "Wardrobe_Exports")\n`;
      ruby += `  Dir.mkdir(export_dir) unless Dir.exist?(export_dir)\n\n`;
      
      ruby += `  # Auto-discover all wardrobes starting with 'Tu_Ao_'\n`;
      ruby += `  wardrobes = entities.grep(Sketchup::Group).select { |g| g.name =~ /^Tu_Ao_/ }\n`;
      ruby += `  return puts "No wardrobes found to export!" if wardrobes.empty?\n\n`;
      
      ruby += `  wardrobes.each_with_index do |target, idx|\n`;
      ruby += `    puts "Exporting Wardrobe: #{target.name} (#{idx+1}/#{wardrobes.size})"\n`;
      ruby += `    cnt = target.bounds.center\n`;
      ruby += `    sz = [target.bounds.width, target.bounds.height, target.bounds.depth].max * 1.5\n\n`;
      
      ruby += `    requested_views.each do |v_type|\n`;
      ruby += `      case v_type\n`;
      ruby += `      when "3D_Left"\n`;
      ruby += `        view.camera.set([cnt.x - sz, cnt.y + sz, cnt.z + sz * 0.2], cnt, [0, 0, 1])\n`;
      ruby += `      when "3D_Right"\n`;
      ruby += `        view.camera.set([cnt.x + sz, cnt.y + sz, cnt.z + sz * 0.2], cnt, [0, 0, 1])\n`;
      ruby += `      when "Front"\n`;
      ruby += `        view.camera.set([cnt.x, cnt.y + sz, cnt.z], cnt, [0, 0, 1])\n`;
      ruby += `      when "Side_Left"\n`;
      ruby += `        view.camera.set([cnt.x - sz, cnt.y, cnt.z], cnt, [0, 0, 1])\n`;
      ruby += `      when "Side_Right"\n`;
      ruby += `        view.camera.set([cnt.x + sz, cnt.y, cnt.z], cnt, [0, 0, 1])\n`;
      ruby += `      when "Top"\n`;
      ruby += `        view.camera.set([cnt.x, cnt.y, cnt.z + sz], cnt, [0, 1, 0])\n`;
      ruby += `      end\n`;
      ruby += `      view.zoom(target)\n`;
      ruby += `      view.refresh\n`;
      ruby += `      fname = File.join(export_dir, "#{target.name}_View_#{v_type}_#{Time.now.to_i}.jpg")\n`;
      ruby += `      view.write_image(fname, 2000, 1500, true, 100)\n`;
      ruby += `      puts "  -> Saved: #{fname}"\n`;
      ruby += `    end\n`;
      ruby += `  end\n`;
      ruby += `  puts "Finished exporting #{wardrobes.size} wardrobes."\n`;
      ruby += `end\n\n`;
      
      ruby += `export_all_wardrobes(ent, [${viewsToExport.join(', ')}])\n`;
    } else {
      ruby += `puts "No views selected for export!"\n`;
    }
  }

  ruby += `\nputs "WARDROBE generated successfully!"\n`;
  return ruby;
};

const generateWardrobeAnalysisText = (
  data: FurnitureAnalysisData, 
  length: number, 
  height: number, 
  depth: number, 
  numWings: number, 
  hasTopBlock: boolean, 
  isCeilingHeight: boolean, 
  ceilingAdjustment: number,
  leftEnabled: boolean,
  leftWidth: number,
  leftCategory: string,
  leftType: string,
  leftExtType: string,
  rightEnabled: boolean,
  rightWidth: number,
  rightCategory: string,
  rightType: string,
  rightExtType: string
) => {
    const sWidthLeft = leftEnabled ? leftWidth : 0;
    const sWidthRight = rightEnabled ? rightWidth : 0;
    const mainLength = length - sWidthLeft - sWidthRight;
    const wingWidth = numWings > 0 ? Math.floor(mainLength / numWings) : 0;
    
    let mainCabinetHeight = height;
    let topCabinetHeight = 0;
    let ceilingCabinetHeight = 0;

    if (hasTopBlock) {
      if (isCeilingHeight) {
        mainCabinetHeight = 1900 - ceilingAdjustment;
        topCabinetHeight = 400;
        ceilingCabinetHeight = height - mainCabinetHeight - topCabinetHeight;
      } else {
        mainCabinetHeight = 1900;
        topCabinetHeight = height - mainCabinetHeight;
      }
    } else if (isCeilingHeight) {
      mainCabinetHeight = 1900 - ceilingAdjustment;
      ceilingCabinetHeight = height - mainCabinetHeight;
    }

    let analysis = `### 📋 PHÂN TÍCH CÔNG NĂNG TỦ ÁO QUẦN\n\n`;
    analysis += `**Thông số tổng quát:**\n`;
    analysis += `- Kích thước: **${length} x ${height} x ${depth} mm**\n`;
    
    if (leftEnabled) {
      const typeDesc = leftCategory === 'external' ? `Model ngoài (${leftExtType?.replace('model_', 'Số ')})` : 'Tự tạo sẵn';
      analysis += `- Kệ trang trí TRÁI: **${leftWidth}mm** (Loại: **${typeDesc}**)\n`;
    }
    if (rightEnabled) {
      const typeDesc = rightCategory === 'external' ? `Model ngoài (${rightExtType?.replace('model_', 'Số ')})` : 'Tự tạo sẵn';
      analysis += `- Kệ trang trí PHẢI: **${rightWidth}mm** (Loại: **${typeDesc}**)\n`;
    }

    analysis += `- Phần tủ áo chính: **${mainLength}mm** (Tổng ${length} - Kệ Trái ${sWidthLeft} - Kệ Phải ${sWidthRight})\n`;
    analysis += `- Số lượng cánh: **${numWings} cánh** (Trung bình **${wingWidth}mm/cánh**)\n`;
    
    if (isCeilingHeight && ceilingCabinetHeight > 0) {
      analysis += `- **Khối chạm trần (Cao ${ceilingCabinetHeight}mm):** Tận dụng không gian sát trần để lưu trữ đồ rất ít dùng.\n`;
    }
    if (hasTopBlock && topCabinetHeight > 0) {
      analysis += `- **Khối trên (Cao ${topCabinetHeight}mm):** Lưu trữ đồ ít dùng như vali, chăn màn, quần áo trái mùa.\n`;
    }
    analysis += `- **Thân tủ chính (Cao ${mainCabinetHeight}mm):** Không gian lưu trữ quần áo hàng ngày.\n\n`;

    analysis += `**Bố trí công năng chi tiết từng khoang:**\n`;
    let lastStart = -1;
    data.lowerBlocks.forEach((b, idx) => {
      if (lastStart !== -1 && b.start !== lastStart) {
          analysis += `\n`; // Add extra space between columns
      }
      lastStart = b.start;

      const func = WARDROBE_FUNCTIONS[b.functionType as keyof typeof WARDROBE_FUNCTIONS];
      const wingCount = Math.round(b.widthMm / (wingWidth || 1));
      
      let heightDesc = `Cao ${b.heightMm}mm`;
      if (b.functionType === 'small_drawer') {
          // Find the block below it in the same column
          const colBlocks = data.lowerBlocks
              .filter(item => item.start === b.start && item.end === b.end)
              .sort((a, b) => (a.yOffsetMm || 0) - (b.yOffsetMm || 0));
              
              const bIdxInCol = colBlocks.findIndex(item => item.id === b.id);
              if (bIdxInCol > 0) {
                  const blockBelow = colBlocks[bIdxInCol - 1];
                  heightDesc = `Cao ${b.heightMm}mm (Tính từ đỉnh khối ${blockBelow.label} lên)`;
              } else {
                  heightDesc = `Cao ${b.heightMm}mm (Tính từ sàn lên)`;
              }
      }

      analysis += `- **Khoang ${b.label} (Rộng ${b.widthMm}mm, ${heightDesc}):**\n`;
      const isSideShelf = b.id.includes('sideshelf');
      if (!isSideShelf) {
        analysis += `   - Loại: **${wingCount} cánh mở**\n`;
      }
      const funcLabel = func ? func.label : b.functionType;
      analysis += `   - Chức năng: **${funcLabel}**\n`;
      
      let details = func?.layers || "Thiết kế mở hoặc theo model SketchUp";
      if (b.functionType === 'drawers_hang') {
        details = `Suốt treo áo, các ngăn kéo phía dưới để đồ lót, phụ kiện`;
      }
      analysis += `   - Chi tiết: ${details}\n`;
    });
    analysis += `\n`;

    analysis += `**💡 Ghi chú kỹ thuật:**\n`;
    analysis += `1. Chiều sâu **${depth}mm** là tiêu chuẩn để treo quần áo không bị kẹt cánh.\n`;
    analysis += `2. Các khoang treo nên có chiều cao thông thủy tối thiểu 900mm cho áo và 1400mm cho váy dài.\n`;
    analysis += `3. Ngăn kéo nên sử dụng ray giảm chấn để vận hành êm ái.\n\n`;

    analysis += `**SƠ ĐỒ THIẾT KẾ CHI TIẾT**\n\n`;
    analysis += generateWardrobeDiagram(data, hasTopBlock, isCeilingHeight, height);

    return analysis;
};

  const analyzeWardrobe = (
    length: number, 
    height: number, 
    depth: number, 
    numWings: number, 
    hasTopBlock: boolean, 
    isCeilingHeight: boolean,
    leftEnabled: boolean,
    leftWidth: number,
    leftCategory: 'internal' | 'external',
    leftType: string,
    leftExternalType: string,
    leftSpacing: string,
    rightEnabled: boolean,
    rightWidth: number,
    rightCategory: 'internal' | 'external',
    rightType: string,
    rightExternalType: string,
    rightSpacing: string
  ) => {
    const sWidthLeft = leftEnabled ? leftWidth : 0;
    const sWidthRight = rightEnabled ? rightWidth : 0;
    const mainLength = length - sWidthLeft - sWidthRight;
    const wingWidth = numWings > 0 ? Math.floor(mainLength / numWings) : 0;
    const wardrobeXOffset = sWidthLeft;

    const lowerBlocks: CabinetBlock[] = [];
    const upperBlocks: CabinetBlock[] = [];
    
    const effectiveHasTopBlock = hasTopBlock;
    
    let mainCabinetHeight = 1900;
    let topCabinetHeight = 0;
    let ceilingCabinetHeight = 0;

    if (hasTopBlock) {
      if (isCeilingHeight) {
        // When adjusting ceiling height, subtract the adjustment from main body
        // so that total height (main + top + ceiling) = height
        mainCabinetHeight = 1900 - state.wardrobeCeilingAdjustment;
        topCabinetHeight = 400;
        ceilingCabinetHeight = height - mainCabinetHeight - topCabinetHeight;
      } else {
        mainCabinetHeight = 1900;
        topCabinetHeight = height - mainCabinetHeight;
      }
    } else if (isCeilingHeight) {
      mainCabinetHeight = 1900 - state.wardrobeCeilingAdjustment;
      ceilingCabinetHeight = height - mainCabinetHeight;
    } else {
      mainCabinetHeight = height;
    }

    const typeLabels: Record<string, string> = {
      shelves: 'Kệ 1 (Ngăn chia đều)',
      hanging: 'Kệ trang trí 2',
      zigzag: 'Kệ trang trí 3',
      drawers: 'Kệ trang trí 4',
      wine: 'Kệ trang trí 5',
      rounded: 'Kệ trang trí 6',
      glass_display: 'Kệ trang trí 7',
      bag_display: 'Kệ trang trí 8',
      vanity: 'Kệ trang trí 9',
      mirror: 'Kệ trang trí 10'
    };

    const addSideShelf = (side: 'left' | 'right', width: number, category: string, type: string, extType: string, spacing: string) => {
      const sStart = side === 'left' ? 0 : length - width;
      const typeLabel = typeLabels[type] || 'Trang trí';
      const sideKey = side === 'left' ? 'K_T' : 'K_P';
      
      // Body of Side Shelf
      lowerBlocks.push({
        id: `wardrobe-sideshelf-${side}-body`,
        type: 'wardrobe_wing',
        start: sStart / 100,
        end: (sStart + width) / 100,
        widthChar: width / 100,
        widthMm: width,
        heightMm: mainCabinetHeight - 84,
        yOffsetMm: 67,
        label: `${sideKey}1 (${typeLabel})`,
        text1: side === 'left' ? 'KỆ TRÁI' : 'KỆ PHẢI',
        text2: category === 'external' ? 'MODEL' : 'CHÍNH',
        functionType: `sideshelf_${side}_${category}_${type}_${extType}_${spacing}`,
        numWings: 0
      });

      // Top Block of Side Shelf (Row 0)
      if (topCabinetHeight > 0) {
        upperBlocks.push({
          id: `wardrobe-sideshelf-${side}-top`,
          type: 'wardrobe_top',
          start: sStart / 100,
          end: (sStart + width) / 100,
          widthChar: width / 100,
          widthMm: width,
          heightMm: topCabinetHeight,
          yOffsetMm: mainCabinetHeight,
          label: `${sideKey}0 (TÂM)`,
          text1: side === 'left' ? 'KỆ TRÁI' : 'KỆ PHẢI',
          text2: 'TÂM',
          functionType: width > 600 ? 'double_door' : 'single_door',
          numWings: width > 600 ? 2 : 1
        });
      }

      // Ceiling Block of Side Shelf (Row -1)
      if (ceilingCabinetHeight > 0) {
        upperBlocks.push({
          id: `wardrobe-sideshelf-${side}-ceiling`,
          type: 'wardrobe_top',
          start: sStart / 100,
          end: (sStart + width) / 100,
          widthChar: width / 100,
          widthMm: width,
          heightMm: ceilingCabinetHeight,
          yOffsetMm: mainCabinetHeight + topCabinetHeight,
          label: `${sideKey}00 (TRẦN)`,
          text1: side === 'left' ? 'KỆ TRÁI' : 'KỆ PHẢI',
          text2: 'TRẦN',
          functionType: width > 600 ? 'double_door' : 'single_door',
          numWings: width > 600 ? 2 : 1
        });
      }
    };

    if (leftEnabled) addSideShelf('left', leftWidth, leftCategory, leftType, leftExternalType, leftSpacing);
    if (rightEnabled) addSideShelf('right', rightWidth, rightCategory, rightType, rightExternalType, rightSpacing);

    // Process Ceiling Cabinets (Row -1)
    if (isCeilingHeight && ceilingCabinetHeight > 0) {
      let currentWing = 0;
      let compartmentIdx = 0;
      while (currentWing < numWings) {
        const colLabel = String.fromCharCode(65 + compartmentIdx);
        let compWings = 1;
        if (currentWing + 1 < numWings && wingWidth < 600) {
          compWings = 2;
        }
        if (compWings === 2 && 2 * wingWidth > 1500) {
          compWings = 1;
        }
        
        let compWidth = compWings * wingWidth;
        // Adjust the last compartment to ensure total width matches length exactly
        if (currentWing + compWings >= numWings) {
            compWidth = mainLength - (currentWing * wingWidth);
        }
        
        const start = (wardrobeXOffset + currentWing * wingWidth) / 100;
        const end = (wardrobeXOffset + (currentWing * wingWidth + compWidth)) / 100;
        const widthChar = compWidth / 100;
        const topFunc = compWings === 1 ? 'single_door' : 'double_door';

        const topFuncInfo = WARDROBE_FUNCTIONS[topFunc as keyof typeof WARDROBE_FUNCTIONS];
        upperBlocks.push({
          id: `wardrobe-ceiling-${compartmentIdx}`,
          type: 'wardrobe_top',
          start, end, widthChar, widthMm: compWidth, heightMm: ceilingCabinetHeight, 
          yOffsetMm: mainCabinetHeight + topCabinetHeight,
          label: `${colLabel}00 ${topFuncInfo.label.split(' (')[0]}`,
          text1: topFuncInfo.t1,
          text2: topFuncInfo.t2,
          functionType: topFunc,
          numWings: compWings
        });
        currentWing += compWings;
        compartmentIdx++;
      }
    }

    // 2. Process Top Cabinets (Row 0)
    if (effectiveHasTopBlock && topCabinetHeight > 0) {
      let currentWing = 0;
      let compartmentIdx = 0;
      while (currentWing < numWings) {
        const colLabel = String.fromCharCode(65 + compartmentIdx);
        let compWings = 1;
        if (currentWing + 1 < numWings && wingWidth < 600) {
          compWings = 2;
        }
        if (compWings === 2 && 2 * wingWidth > 1500) {
          compWings = 1;
        }
        
        let compWidth = compWings * wingWidth;
        // Adjust the last compartment to ensure total width matches length exactly
        if (currentWing + compWings >= numWings) {
            compWidth = mainLength - (currentWing * wingWidth);
        }
        
        const start = (wardrobeXOffset + currentWing * wingWidth) / 100;
        const end = (wardrobeXOffset + (currentWing * wingWidth + compWidth)) / 100;
        const widthChar = compWidth / 100;
        const topFunc = compWings === 1 ? 'single_door' : 'double_door';

        const topFuncInfo = WARDROBE_FUNCTIONS[topFunc as keyof typeof WARDROBE_FUNCTIONS];
        upperBlocks.push({
          id: `wardrobe-top-${compartmentIdx}`,
          type: 'wardrobe_top',
          start, end, widthChar, widthMm: compWidth, heightMm: topCabinetHeight, 
          yOffsetMm: mainCabinetHeight,
          label: `${colLabel}0 ${topFuncInfo.label.split(' (')[0]}`,
          text1: topFuncInfo.t1,
          text2: topFuncInfo.t2,
          functionType: topFunc,
          numWings: compWings
        });
        currentWing += compWings;
        compartmentIdx++;
      }
    }

    // 3. Process Body (Row 1) - Now "Suốt" (Full-height)
    let currentWing = 0;
    let compartmentIdx = 0;
    while (currentWing < numWings) {
      const colLabel = String.fromCharCode(65 + compartmentIdx);
      let compWings = 1;
      
      // Enforce 600-1500mm range for hanging compartments (mother blocks)
      if (currentWing + 1 < numWings && wingWidth < 600) {
        compWings = 2;
      }
      if (compWings === 2 && 2 * wingWidth > 1500) {
        compWings = 1;
      }

      let compWidth = compWings * wingWidth;
      // Adjust the last compartment to ensure total width matches length exactly
      if (currentWing + compWings >= numWings) {
          compWidth = mainLength - (currentWing * wingWidth);
      }
      
      const start = (wardrobeXOffset + currentWing * wingWidth) / 100;
      const end = (wardrobeXOffset + (currentWing * wingWidth + compWidth)) / 100;
      const widthChar = compWidth / 100;

      // Pre-split into blocks: Top shelf space, Main, Drawers (if any), Bottom shelf space
      const isColumnA = compartmentIdx === 0;
      
      // Internal budget for functional blocks: Total - 84mm (17 top + 17 bottom + 50 kick)
      const internalBudget = mainCabinetHeight - 84;
      
      const topH = isColumnA ? 0 : 500;
      const drawerH = 300;
      const bottomH = isColumnA ? 0 : 300;
      
      // For the first compartment (A), we add a drawer by default
      const hasDrawer = compartmentIdx === 0;
      
      const midH = Math.max(0, internalBudget - topH - bottomH - (hasDrawer ? drawerH : 0));

      const mainFunc = 'hanging';
      const mainFuncInfo = WARDROBE_FUNCTIONS[mainFunc as keyof typeof WARDROBE_FUNCTIONS];
      const foldedInfo = WARDROBE_FUNCTIONS.folded;
      const drawerInfo = WARDROBE_FUNCTIONS.drawer;

      // Block 1: Top (A11) - Skip for Column A
      if (!isColumnA) {
        lowerBlocks.push({
          id: `wardrobe-main-${compartmentIdx}-1`,
          type: 'wardrobe_wing',
          start, end, widthChar, widthMm: compWidth, heightMm: topH, yOffsetMm: mainCabinetHeight - 17 - topH,
          label: `${colLabel}11 ${foldedInfo.label.split(' (')[0]}`,
          text1: foldedInfo.t1,
          text2: foldedInfo.t2,
          functionType: 'folded',
          numWings: compWings
        });
      }

      // Block 2: Middle (A1) - Mother Block
      lowerBlocks.push({
        id: `wardrobe-main-${compartmentIdx}-2`,
        type: 'wardrobe_wing',
        start, end, widthChar, widthMm: compWidth, heightMm: midH, yOffsetMm: 67 + (isColumnA ? 0 : bottomH) + (hasDrawer ? drawerH : 0),
        label: `${colLabel}1 ${mainFuncInfo.label.split(' (')[0]}`,
        text1: mainFuncInfo.t1,
        text2: mainFuncInfo.t2,
        functionType: mainFunc,
        numWings: compWings
      });

      // Block 3: Drawer (A12) - Only for first compartment
      if (hasDrawer) {
        lowerBlocks.push({
          id: `wardrobe-main-${compartmentIdx}-drawer`,
          type: 'wardrobe_wing',
          start, end, widthChar, widthMm: compWidth, heightMm: drawerH, yOffsetMm: 67 + (isColumnA ? 0 : bottomH),
          label: `${colLabel}12 ${drawerInfo.label.split(' (')[0]}`,
          text1: drawerInfo.t1,
          text2: drawerInfo.t2,
          functionType: 'drawer',
          numWings: compWings
        });
      }

      // Block 4: Bottom (A13 or A12) - Skip for Column A
      if (!isColumnA) {
        const bottomLabel = hasDrawer ? `${colLabel}13` : `${colLabel}12`;
        lowerBlocks.push({
          id: `wardrobe-main-${compartmentIdx}-3`,
          type: 'wardrobe_wing',
          start, end, widthChar, widthMm: compWidth, heightMm: bottomH, yOffsetMm: 67,
          label: `${bottomLabel} ${foldedInfo.label.split(' (')[0]}`,
          text1: foldedInfo.t1,
          text2: foldedInfo.t2,
          functionType: 'folded',
          numWings: compWings
        });
      }

      currentWing += compWings;
      compartmentIdx++;
    }

    const analysisData: FurnitureAnalysisData = {
      totalChars: length / 100,
      upperBlocks,
      lowerBlocks,
    };

    const analysis = generateWardrobeAnalysisText(
      analysisData, 
      length, 
      height, 
      depth, 
      numWings, 
      effectiveHasTopBlock, 
      state.wardrobeIsCeilingHeight, 
      state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled,
      parseInt(state.wardrobeSideShelfLeftWidth) || 0,
      state.wardrobeSideShelfLeftCategory,
      state.wardrobeSideShelfLeftType,
      state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled,
      parseInt(state.wardrobeSideShelfRightWidth) || 0,
      state.wardrobeSideShelfRightCategory,
      state.wardrobeSideShelfRightType,
      state.wardrobeSideShelfRightExternalType
    );

    return { analysis, analysisData };
  };

  const handleAnalyzeWardrobe = () => {
    try {
      const length = parseInt(state.wardrobeLength) || 0;
      const height = parseInt(state.wardrobeHeight) || 2400;
      const depth = parseInt(state.wardrobeDepth) || 600;
      
      let numWings = parseInt(state.wardrobeNumWings);
      if (isNaN(numWings) || numWings <= 0) {
        // Auto calculate: standard wing is ~500mm
        numWings = Math.max(2, Math.round(length / 500));
        // If it's an odd number > 2, maybe make it even for double doors? 
        // Actually, let's just use the rounded value.
        handleChange('wardrobeNumWings', numWings.toString());
      }

      if (length <= 0) {
        alert('Vui lòng nhập chiều dài tủ áo hợp lệ');
        return;
      }

      console.log('Analyzing wardrobe:', { length, height, depth, numWings });
      
    const { analysis, analysisData } = analyzeWardrobe(
      length, 
      height, 
      depth, 
      numWings, 
      state.wardrobeHasTopBlock, 
      state.wardrobeIsCeilingHeight,
      state.wardrobeSideShelfLeftEnabled,
      parseInt(state.wardrobeSideShelfLeftWidth) || 0,
      state.wardrobeSideShelfLeftCategory,
      state.wardrobeSideShelfLeftType,
      state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfLeftSpacing,
      state.wardrobeSideShelfRightEnabled,
      parseInt(state.wardrobeSideShelfRightWidth) || 0,
      state.wardrobeSideShelfRightCategory,
      state.wardrobeSideShelfRightType,
      state.wardrobeSideShelfRightExternalType,
      state.wardrobeSideShelfRightSpacing
    );
      
      console.log('Analysis result:', { analysis: analysis.substring(0, 100) + '...' });

      setState(prev => ({
        ...prev,
        wardrobeAnalysisResult: analysis,
        wardrobeAnalysisData: analysisData,
        wardrobeAccordionOpen: false,
        kitchenAnalysisResult: null,
        kitchenAnalysisData: null,
        kitchenAnalysisDataLeft: null,
        kitchenAnalysisDataRight: null
      }));
    } catch (error) {
      console.error('Error analyzing wardrobe:', error);
      alert('Có lỗi xảy ra khi phân tích tủ áo. Vui lòng kiểm tra lại kích thước.');
    }
  };


  const generateMainPrompt = () => {
    const getVal = (val: string) => {
      if (val.trim() === '') return '[Not specified]';
      if (val.startsWith('Màu Cơ Bản - ')) return val.replace('Màu Cơ Bản - ', '');
      return val;
    };

    let parts: string[] = [];

    if (state.renderMode === 'wardrobe') {
      parts = [
        `A photorealistic interior rendering of a wardrobe (closet), transforming a SketchUp model into a high-end real-life photograph.`,
        `STRICTLY MAINTAIN the original layout, dimensions, proportions, geometry, and positions of all main elements from the SketchUp design. DO NOT redesign or alter the spatial arrangement.`,
        `CRITICAL PROPORTION RULE: Ensure the visual aspect ratio of the wardrobe compartments matches these dimensions.`,
        ``,
        `Materials and Finishes:`,
        `- Wardrobe doors: ${getVal(state.cabinetDoor)}.`,
        `- Wardrobe color: ${state.furnitureColor}.`,
        `- Handles/Hardware: ${getVal(state.handles)}.`,
        `- Floor: ${getVal(state.floor)}.`,
        `- Walls: ${getVal(state.wall)}.`,
        `- Ceiling lights: ${getVal(state.ceilingLight)}.`,
        `- Decor items: ${getVal(state.decor)}.`,
        ``,
        `Style and Atmosphere:`,
        `- Style: ${getVal(state.style)}.`,
        `- Lighting: ${getVal(state.lighting)}.`,
        `- Exposure/Brightness: ${getVal(state.exposure)}.`,
        `- Camera angle: ${getVal(state.cameraAngle)}.`,
      ].filter(Boolean);
    } else {
      parts = [
        `A photorealistic interior rendering of a ${getVal(state.roomType)}, transforming a SketchUp model into a high-end real-life photograph.`,
        `STRICTLY MAINTAIN the original layout, dimensions, proportions, geometry, and positions of all main elements from the SketchUp design. DO NOT redesign or alter the spatial arrangement.`,
        ``,
        `Materials and Finishes:`,
        `- Main furniture material: ${getVal(state.mainFurnitureMaterial)}.`,
        `- Furniture color tone: ${getVal(state.furnitureColor)}.`,
        `- Sofa/Bed material: ${getVal(state.sofaOrBedMaterial)}.`,
        `- Floor: ${getVal(state.floor)}.`,
        `- Walls: ${getVal(state.wall)}.`,
        `- Ceiling lights: ${getVal(state.ceilingLight)}.`,
        `- Decor items: ${getVal(state.decor)}.`,
        ``,
        `Style and Atmosphere:`,
        `- Style: ${getVal(state.style)}.`,
        `- Lighting: ${getVal(state.lighting)}.`,
        `- Exposure/Brightness: ${getVal(state.exposure)}.`,
        `- Camera angle: ${getVal(state.cameraAngle)}.`,
      ];
    }

    if (state.renderQuality === 'V-Ray render') {
      const lightingTextVRay = `Ánh sáng chủ động tán đều và chiếu chính diện vào không gian nội thất để làm nổi bật vật liệu và màu sắc. Tránh tuyệt đối hiện tượng ngược sáng (backlighting) làm tối không gian.`;

      parts.push(
        `- Render quality: Render lại từ ảnh/model SketchUp cơ bản thành hình ảnh nội thất thực tế, photorealistic, giữ nguyên 100% bố cục kiến trúc, tỷ lệ, kết cấu tường, trần, sàn, cửa, tủ và vị trí vật thể chính; không tự ý thay đổi thiết kế.`,
        `Kỹ thuật phân bổ ánh sáng chuyên nghiệp: KHÔNG sử dụng ánh sáng chính từ cửa sổ. Nếu có cửa sổ, hãy thêm rèm mỏng giảm sáng (sheer curtains/blinds). ${lightingTextVRay} Ánh sáng phải dịu, không gắt, không cháy sáng, tạo cảm giác không gian trong trẻo, dễ chịu và sạch sẽ. Nếu sử dụng các màu tối, hãy chủ động kéo sáng màu đó lên để tổng thể ảnh luôn trong trẻo và rõ nét.`,
        `Tông màu tổng thể nhẹ nhàng, tươi tắn, thanh lịch, ưu tiên cảm giác ấm sáng vừa phải, trắng kem, be sáng, gỗ sáng màu, màu sơn hài hòa để làm nổi bật sản phẩm chính nhưng vẫn tự nhiên như ảnh chụp thực tế. Color grading sáng trong, sạch, cao cấp, không quá tương phản, không ám vàng nặng, không ám xám lạnh.`,
        `Tập trung mô phỏng chất lượng render theo logic V-Ray: vật liệu PBR chân thực, ánh sáng toàn cục GI tự nhiên, phản xạ và khúc xạ chính xác, contact shadow rõ, chiều sâu không gian tốt, độ chi tiết bề mặt cao.`,
        `Nâng cấp vật liệu thực tế cho toàn cảnh: sàn gỗ hoặc gạch có vân thật, tường sơn mịn lì nhẹ, kính có phản xạ tinh tế, đá bếp hoặc mặt bàn có độ bóng hợp lý, kim loại inox/aluminum có roughness chuẩn, gỗ tủ có vân và độ nhám tự nhiên, không bóng giả, không nhựa giả.`,
        `Camera vật lý kiểu architectural photography, góc nhìn rộng vừa phải, phối cảnh cân đối, chiều sâu rõ ràng, white balance tự nhiên, hậu kỳ nhẹ, giữ cảm giác chân thật như ảnh chụp chuyên nghiệp.`,
        `Bổ sung chi tiết trang trí nhỏ vừa đủ để tăng tính sống động và chân thực như lọ hoa, ly tách, rèm mỏng đón nắng, cây xanh nhỏ hoặc vật dụng sinh hoạt phù hợp, nhưng phải tiết chế, sang trọng, gọn gàng, không làm rối bố cục.`,
        `Kết quả cuối cùng phải giống ảnh chụp thật bằng máy ảnh chuyên nghiệp, ultra realistic, high detail, realistic material response, professional lighting distribution, no backlighting, fresh bright color palette, global illumination, soft shadow, subtle reflection, ambient occlusion, clean render, denoised, premium interior visualization.`
      );
    } else if (state.renderQuality === 'Corona render') {
      const materialsText = `Vật liệu chân thực: sơn tường mịn, sàn ${getVal(state.floor)}, nội thất chính ${getVal(state.mainFurnitureMaterial)}, sofa/giường ${getVal(state.sofaOrBedMaterial)}, kính sạch có phản xạ nhẹ, kim loại satin hoặc brushed metal, vải và gỗ có roughness tinh tế.`;
      
      const lightingText = `Ánh sáng chủ động tán đều và chiếu chính vào nội thất, tuyệt đối tránh hiện tượng ngược sáng.`;

      parts.push(
        `- Render quality: Giữ nguyên ảnh SketchUp gốc, chỉ nâng cấp thành ảnh render nội thất thực tế theo phong cách Corona. Preserve exact architecture and camera angle. Kỹ thuật phân bổ ánh sáng chuyên nghiệp: KHÔNG sử dụng ánh sáng chính từ cửa sổ, nếu có cửa sổ hãy thêm rèm giảm sáng. ${lightingText} Nếu sử dụng màu tối, phải kéo sáng màu đó lên để ảnh luôn trong trẻo. Global illumination tự nhiên, nhiều lớp bounce light mềm trên tường và trần, shadow mềm nhưng có độ sâu, các góc tiếp xúc vật thể rõ. ${materialsText} Camera nội thất chuyên nghiệp, khung hình cân đối, vertical lines straight, exposure trung tính, tương phản nhẹ, ACES tone mapping, highlight compression nhẹ, bloom/glare rất nhẹ ở vùng sáng, ảnh sạch nhiễu, render photorealistic cao cấp, đúng chất Corona archviz.`
      );
    } else {
      parts.push(`- Render quality: ${getVal(state.renderQuality)}, interior photography quality, soft shadows, realistic materials, highly detailed.`);
    }

    if (state.notes.trim()) {
      parts.push(``, `Additional details: ${state.notes.trim()}`);
    }

    if (state.originalImage) {
      parts.push(``, `[NOTE: The attached base image is the original SketchUp model. Use it as the structural foundation (ControlNet/Image-to-Image) and apply the specified materials.]`);
    }

    if (state.referenceImage) {
      parts.push(``, `[NOTE: A reference image for materials and colors is provided. Please closely match the colors, textures, and mood shown in the reference image.]`);
    }

    if (state.realisticMaterials) {
      parts.push(
        ``,
        `REALISTIC MATERIALS INSTRUCTIONS:`,
        `Render interior materials realistically with accurate surface behavior and scale. Focus on wall, floor, tile, and carpet materials with clear distinction in texture, reflectivity, joints, and light response.`,
        `Materials:`,
        `- Wall: smooth matte painted wall or subtle microcement wall, clean surface, soft diffuse reflection, seamless or lightly cloudy mineral texture, no plastic shine`,
        `- Floor tile: large-format porcelain or ceramic tiles, matte or satin finish, thin grout lines, correct tile scale, subtle surface variation, realistic joints`,
        `- Wood floor if present: natural oak or walnut plank flooring, matte coating, subtle wood grain, soft low-sheen reflection, realistic plank seams`,
        `- Stone floor or wall if present: honed marble, travertine, or limestone, natural veining, large slab appearance, premium refined surface, no obvious texture repetition`,
        `- Carpet: low-pile or loop-pile carpet, soft light absorption, textile texture, minimal reflection, realistic edge softness, commercial or residential feel depending on space`,
        `Surface behavior:`,
        `- Matte surfaces should diffuse light softly`,
        `- Satin surfaces should have gentle highlights`,
        `- Glossy tiles or polished stone should reflect light clearly but not look wet`,
        `- Carpet should absorb light and appear slightly soft, never shiny like plastic or velvet unless specified`,
        `- Concrete or microcement should be seamless, slightly cloudy, mineral-like, with subtle tonal variation`,
        `Material separation:`,
        `- Clearly define grout lines for tiles`,
        `- Clearly define plank seams for wood flooring`,
        `- Keep painted walls mostly seamless`,
        `- Keep carpet without tile grout unless carpet tiles are specified`,
        `- Show realistic transitions between materials at edges and corners`,
        `Lighting:`,
        `- realistic natural daylight or soft interior lighting`,
        `- correct shadow falloff`,
        `- highlights must match each material type`,
        `- avoid overexposed reflections`,
        `- balanced contrast, realistic ambient bounce light`,
        `Visual quality:`,
        `- photorealistic`,
        `- physically plausible materials`,
        `- accurate scale`,
        `- subtle imperfections`,
        `- premium architectural visualization`,
        `- clean but believable finish`,
        `- no exaggerated texture repetition`,
        `- no fake glossy plastic look`,
        `Negative prompt:`,
        `- no wet floor effect`,
        `- no mirror-like reflection on matte surfaces`,
        `- no oversized grout lines`,
        `- no warped tile geometry`,
        `- no repeated copy-paste textures`,
        `- no excessive dirt or cracks unless requested`,
        `- no overly dramatic roughness`,
        `- no cartoon style`,
        `- no low-detail surfaces`
      );
    }

    const lightingDistributionText = `- LIGHTING DISTRIBUTION TECHNIQUE: DO NOT use the main light source from the window. If there are windows in the image, add sheer curtains or light-filtering blinds (rèm giảm sáng) to soften the incoming light. Use active, evenly diffused lighting that shines directly onto the main furniture to highlight their details. Strictly avoid any backlighting phenomenon that would make the space look dark.`;

    parts.push(
      ``, 
      `CRITICAL QUALITY INSTRUCTIONS FOR CLIENT PRESENTATION:`,
      `- DIMENSIONAL ACCURACY IS THE TOP PRIORITY: You must strictly adhere to the provided dimensions (e.g., sink width, cabinet sizes). The rendered image must accurately reflect these exact measurements.`,
      `- Enhance glossiness and reflections on hard surfaces (especially floor tiles, countertops, and glass) to make the image look highly polished, premium, and glossy.`,
      lightingDistributionText,
      `- COLOR & BRIGHTNESS CORRECTION: If the specified materials or colors are dark, actively brighten their appearance and enhance the overall lighting to ensure the final image remains crisp, clear, and vibrant (trong trẻo). Ensure perfectly balanced lighting with harmonious colors. Strictly avoid extreme contrast between light and dark areas (no blown-out highlights or crushed black shadows). The image must look inviting, well-lit, and optimized for social media (Facebook) and client review.`,
      ``,
      `Focus on upgrading materials, colors, lighting, mood, and realism to the highest degree while keeping the exact original structure and dimensions.`
    );

    return parts.join('\n');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMain(true);
    setTimeout(() => setCopiedMain(false), 2000);
  };

  const mainPrompt = generateMainPrompt();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleChange('companyLogo', event.target?.result as string);
        handleChange('logoType', 'custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    handleChange('companyLogo', null);
    handleChange('logoType', 'none');
    if (companyLogoRef.current) companyLogoRef.current.value = '';
  };

  const getAsciiDiagram = () => {
    if (state.wardrobeAnalysisData) {
      return generateWardrobeDiagram(
        state.wardrobeAnalysisData,
        state.wardrobeHasTopBlock,
        state.wardrobeIsCeilingHeight,
        state.wardrobeHeight ? parseInt(state.wardrobeHeight) : 0
      );
    }
    return null;
  };

  const createFinalCanvas = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const targetImage = state.activeTab === 'design' ? designImage : renderedImage;
      if (!targetImage) return reject("No image");
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("No context");

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const filterCanvas = document.createElement('canvas');
        filterCanvas.width = img.width;
        filterCanvas.height = img.height;
        const filterCtx = filterCanvas.getContext('2d');
        if (!filterCtx) return reject("No context");
        filterCtx.drawImage(img, 0, 0);
        
        if (state.activeTab === 'render') {
          const imageData = filterCtx.getImageData(0, 0, filterCanvas.width, filterCanvas.height);
          applyFilters(imageData, imageSettings);
          filterCtx.putImageData(imageData, 0, 0);
        }

        const isWhite = state.frameStyle === 'Viền trắng tối giản (Minimalist White)';
        const isBlack = state.frameStyle === 'Viền đen sang trọng (Luxury Black)';
        const hasFrame = isWhite || isBlack;
        
        const asciiDiagram = showDimensionsOnImage ? getAsciiDiagram() : null;
        const asciiLines = asciiDiagram ? asciiDiagram.split('\n') : [];
        const fontSize = Math.max(14, Math.floor(img.width / 90));
        const lineHeight = Math.floor(fontSize * 1.4);
        const asciiHeight = asciiLines.length * lineHeight;
        
        const padding = hasFrame ? 50 : 0;
        const baseBottomPadding = hasFrame ? 140 : (asciiDiagram ? 40 : 0);
        const bottomPadding = baseBottomPadding + (asciiDiagram ? asciiHeight + 20 : 0);

        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding + bottomPadding;

        if (isBlack) {
          ctx.fillStyle = '#171717';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (isWhite) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (asciiDiagram) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, img.height, canvas.width, bottomPadding);
        }

        ctx.drawImage(filterCanvas, padding, padding, img.width, img.height);

        if (asciiDiagram) {
          ctx.font = `${fontSize}px monospace`;
          ctx.fillStyle = isBlack ? '#cccccc' : '#444444';
          ctx.textAlign = 'left';
          const startY = img.height + padding + (hasFrame ? 40 : 20);
          asciiLines.forEach((line, index) => {
            ctx.fillText(line, padding || 20, startY + index * lineHeight);
          });
        }

        if (hasFrame) {
          ctx.fillStyle = isBlack ? '#ffffff' : '#171717';
          ctx.font = 'bold 40px Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(state.projectName || 'Thiết kế nội thất', canvas.width - padding, canvas.height - 55);

          const drawParameters = (startX: number) => {
            ctx.textAlign = 'left';
            const startY = canvas.height - 110;
            const lineHeight = 22;
            
            ctx.font = 'bold 15px Inter, sans-serif';
            ctx.fillStyle = isBlack ? '#ffffff' : '#171717';
            
            if (state.activeTab === 'render' && state.renderMode === 'wardrobe') {
              ctx.fillText(`Cánh tủ: ${state.cabinetDoor}`, startX, startY);
              
              ctx.font = '15px Inter, sans-serif';
              ctx.fillStyle = isBlack ? '#cccccc' : '#444444';
              const getDisplayVal = (val: string) => val.replace('Màu Cơ Bản - ', '');
              ctx.fillText(`Màu sắc: ${getDisplayVal(state.furnitureColor)}`, startX, startY + lineHeight * 1);
              ctx.fillText(`Tay nắm: ${state.handles}`, startX, startY + lineHeight * 2);
            } else if (state.activeTab === 'design') {
              ctx.fillText(`Dự án: ${state.projectName || 'Tủ áo'}`, startX, startY);
              
              ctx.font = '15px Inter, sans-serif';
              ctx.fillStyle = isBlack ? '#cccccc' : '#444444';
              ctx.fillText(`Kích thước: ${state.wardrobeLength}x${state.wardrobeHeight}x${state.wardrobeDepth}`, startX, startY + lineHeight * 1);
            } else {
              ctx.fillText(`Loại phòng: ${state.roomType}`, startX, startY);
              
              ctx.font = '15px Inter, sans-serif';
              ctx.fillStyle = isBlack ? '#cccccc' : '#444444';
              ctx.fillText(`Chất liệu nội thất: ${state.mainFurnitureMaterial}`, startX, startY + lineHeight);
              ctx.fillText(`Màu nội thất: ${state.furnitureColor}`, startX, startY + lineHeight * 2);
              ctx.fillText(`Sofa/Giường: ${state.sofaOrBedMaterial}`, startX, startY + lineHeight * 3);
              ctx.fillText(`Sàn: ${state.floor}`, startX, startY + lineHeight * 4);
            }
          };

          if (state.companyLogo) {
            const logoImg = new Image();
            logoImg.onload = () => {
              const logoHeight = 80;
              const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
              ctx.drawImage(logoImg, padding, canvas.height - 120, logoWidth, logoHeight);
              drawParameters(padding + logoWidth + 30);
              resolve(canvas);
            };
            logoImg.onerror = () => {
              drawParameters(padding);
              resolve(canvas);
            };
            logoImg.src = state.companyLogo;
            return;
          } else {
            drawParameters(padding);
          }
        }
        
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = targetImage;
    });
  };

  const handleTransferToRenderMode = async () => {
    try {
      const canvas = await createFinalCanvas();
      const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9);
      handleChange('originalImage', finalImageUrl);
      handleChange('renderMode', 'wardrobe');
      handleChange('activeTab', 'render');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Transfer error:", error);
      alert("Đã xảy ra lỗi khi chuyển ảnh. Vui lòng thử lại.");
    }
  };

  const handleDownload = async () => {
    try {
      const canvas = await createFinalCanvas();
      const link = document.createElement('a');
      link.download = `${state.projectName || 'render'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const handleCopyImage = async () => {
    try {
      const canvas = await createFinalCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Đã copy ảnh vào bộ nhớ tạm! Bạn có thể dán (Ctrl+V) vào bất kỳ đâu.');
        } catch (err) {
          console.error('Clipboard error:', err);
          alert('Trình duyệt không hỗ trợ copy ảnh tự động. Vui lòng tải ảnh xuống và gửi thủ công.');
        }
      }, 'image/png');
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  const handleBlockChange = (type: 'upper' | 'lower', id: string, field: 'functionType' | 'widthMm' | 'heightMm', value: string | number) => {
    const dataKey = 'wardrobeAnalysisData';
    const currentData = state[dataKey];
    if (!currentData) return;
    
    const newData = { ...currentData };
    const blocks = type === 'upper' ? [...newData.upperBlocks] : [...newData.lowerBlocks];
    
    const blockIndex = blocks.findIndex(b => b.id === id);
    if (blockIndex === -1) return;

    if (field === 'functionType') {
        const newFunction = value as string;
        const texts = WARDROBE_FUNCTIONS[newFunction as keyof typeof WARDROBE_FUNCTIONS];
        
        let updatedBlock = { ...blocks[blockIndex], functionType: newFunction, text1: texts.t1, text2: texts.t2 };
        
        // Default height for drawer in wardrobe
        if (newFunction === 'drawer') {
            let defaultHeight = 300;
            const oldHeight = updatedBlock.heightMm || 0;
            const diff = defaultHeight - oldHeight;
            updatedBlock.heightMm = defaultHeight;
            
            // Logic: drawer DOES deduct from mother block
            // Adjust mother block in column if possible
            const columnBlocks = blocks
                .map((b, idx) => ({ ...b, originalIdx: idx }))
                .filter(b => b.start === updatedBlock.start && b.end === updatedBlock.end)
                .sort((a, b) => (a.yOffsetMm || 0) - (b.yOffsetMm || 0));
            
            if (columnBlocks.length > 1) {
                // Find the "Mother" block (usually the main one with label like A1, B1)
                const motherBlockInfo = columnBlocks.find(b => b.label && /^[A-Z]1\s/.test(b.label)) || columnBlocks[columnBlocks.length - 1];
                const motherIdx = motherBlockInfo.originalIdx;
                
                if (blockIndex !== motherIdx) {
                    const motherHeight = Math.max(0, (blocks[motherIdx].heightMm || 0) - diff);
                    blocks[motherIdx] = { ...blocks[motherIdx], heightMm: motherHeight };
                }
            }
        }
        
        const fInfo = WARDROBE_FUNCTIONS[newFunction as keyof typeof WARDROBE_FUNCTIONS];
        const idPart = updatedBlock.label?.split(' ')[0] || 'A1';
        updatedBlock.label = `${idPart} ${fInfo.label.split(' (')[0]}`;
        updatedBlock.text1 = fInfo.t1;
        updatedBlock.text2 = fInfo.t2;
        
        blocks[blockIndex] = updatedBlock;
        
        // Recalculate yOffsets
        const columnBlocks = blocks
            .map((b, idx) => ({ ...b, originalIdx: idx }))
            .filter(b => b.start === blocks[blockIndex].start && b.end === blocks[blockIndex].end)
            .sort((a, b) => a.originalIdx - b.originalIdx);
        
        const reversed = [...columnBlocks].reverse();
        let currentY = 67; // Start after kickplate (50) and bottom panel (17)
        reversed.forEach(cb => {
            const idx = cb.originalIdx;
            blocks[idx] = { ...blocks[idx], yOffsetMm: currentY };
            currentY += blocks[idx].heightMm || 0;
        });
    } else if (field === 'widthMm') {
        const newWidthMm = parseInt(value as string) || 0;
        const newWidthChar = Math.max(1, Math.round(newWidthMm / 100)); // Ensure at least 1 char width for diagram
        blocks[blockIndex] = { ...blocks[blockIndex], widthMm: newWidthMm, widthChar: newWidthChar };
        
        // Recalculate start and end for all subsequent blocks
        let currentStart = blocks[0].start; // usually 0
        for (let i = 0; i < blocks.length; i++) {
            blocks[i] = { ...blocks[i], start: currentStart, end: currentStart + blocks[i].widthChar };
            currentStart = blocks[i].end;
        }
    } else if (field === 'heightMm') {
        const newHeightMm = parseInt(value as string) || 0;
        const oldBlock = blocks[blockIndex];
        const oldHeight = oldBlock.heightMm || 0;
        
        const columnBlocks = blocks
            .map((b, idx) => ({ ...b, originalIdx: idx }))
            .filter(b => b.start === oldBlock.start && b.end === oldBlock.end)
            .sort((a, b) => (a.yOffsetMm || 0) - (b.yOffsetMm || 0));
        
        if (columnBlocks.length > 1) {
            const motherBlockInfo = columnBlocks.find(b => b.label && /^[A-Z]1\s/.test(b.label)) || columnBlocks[columnBlocks.length - 1];
            const motherIdx = motherBlockInfo.originalIdx;
            
            if (blockIndex !== motherIdx) {
                // Editing a sub-block: adjust the mother block
                const diff = newHeightMm - oldHeight;
                const motherHeight = Math.max(0, (blocks[motherIdx].heightMm || 0) - diff);
                blocks[motherIdx] = { ...blocks[motherIdx], heightMm: motherHeight };
                
                const mId = blocks[motherIdx].label?.split(' ')[0] || 'A1';
                const mFInfo = WARDROBE_FUNCTIONS[blocks[motherIdx].functionType as keyof typeof WARDROBE_FUNCTIONS];
                blocks[motherIdx].label = `${mId} ${mFInfo.label.split(' (')[0]}`;

                const finalLabel = `${oldBlock.label?.split(' ')[0] || 'A1'} ${WARDROBE_FUNCTIONS[oldBlock.functionType as keyof typeof WARDROBE_FUNCTIONS].label.split(' (')[0]}`;
                blocks[blockIndex] = { ...oldBlock, heightMm: newHeightMm, label: finalLabel };
            } else {
                // Editing the mother block: adjust the last block (bottom)
                const lastBlockInfo = columnBlocks[0];
                const lastIdx = lastBlockInfo.originalIdx;
                const diff = newHeightMm - oldHeight;
                const lastHeight = Math.max(0, (blocks[lastIdx].heightMm || 0) - diff);
                blocks[lastIdx] = { ...blocks[lastIdx], heightMm: lastHeight };

                const lId = blocks[lastIdx].label?.split(' ')[0] || 'A1';
                const lFInfo = WARDROBE_FUNCTIONS[blocks[lastIdx].functionType as keyof typeof WARDROBE_FUNCTIONS];
                blocks[lastIdx].label = `${lId} ${lFInfo.label.split(' (')[0]}`;

                const finalLabel = `${oldBlock.label?.split(' ')[0] || 'A1'} ${WARDROBE_FUNCTIONS[oldBlock.functionType as keyof typeof WARDROBE_FUNCTIONS].label.split(' (')[0]}`;
                blocks[blockIndex] = { ...oldBlock, heightMm: newHeightMm, label: finalLabel };
            }

            // Update yOffsets for all blocks in column
            const columnBlocksByIndex = columnBlocks.sort((a, b) => a.originalIdx - b.originalIdx);
            const reversed = [...columnBlocksByIndex].reverse();
            
            let currentY = 67; // Start after kickplate (50) and bottom panel (17)
            reversed.forEach(cb => {
                const idx = cb.originalIdx;
                blocks[idx] = { ...blocks[idx], yOffsetMm: currentY };
                currentY += blocks[idx].heightMm || 0;
            });
        } else {
            const finalLabel = `${oldBlock.label?.split(' ')[0] || 'A1'} ${WARDROBE_FUNCTIONS[oldBlock.functionType as keyof typeof WARDROBE_FUNCTIONS].label.split(' (')[0]}`;
            blocks[blockIndex] = { ...oldBlock, heightMm: newHeightMm, label: finalLabel };
        }
    }

    if (type === 'upper') {
        newData.upperBlocks = blocks;
    } else {
        newData.lowerBlocks = blocks;
    }

    // Update totalChars
    const upperEnd = newData.upperBlocks[newData.upperBlocks.length - 1]?.end || 0;
    const lowerEnd = newData.lowerBlocks[newData.lowerBlocks.length - 1]?.end || 0;
    newData.totalChars = Math.max(upperEnd, lowerEnd);

    handleChange(dataKey, newData);
    
    const length = parseInt(state.wardrobeLength) || 0;
    const height = parseInt(state.wardrobeHeight) || 2400;
    const depth = parseInt(state.wardrobeDepth) || 600;
    const numWings = parseInt(state.wardrobeNumWings) || 4;
    
    const newAnalysisText = generateWardrobeAnalysisText(
      newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled, parseInt(state.wardrobeSideShelfLeftWidth) || 0, state.wardrobeSideShelfLeftCategory, state.wardrobeSideShelfLeftType, state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled, parseInt(state.wardrobeSideShelfRightWidth) || 0, state.wardrobeSideShelfRightCategory, state.wardrobeSideShelfRightType, state.wardrobeSideShelfRightExternalType
    );
    handleChange('wardrobeAnalysisResult', newAnalysisText);
  };

  const handleRender = async () => {
    if (!state.originalImage) {
      alert("Vui lòng tải ảnh gốc lên trước khi render!");
      return;
    }
    
    setIsRendering(true);
    setImageSettings(defaultImageSettings); // Reset settings for new render
    const currentRenderId = Date.now();
    renderIdRef.current = currentRenderId;
    try {
      const apiKey = apiMode === 'free' ? process.env.GEMINI_API_KEY : process.env.API_KEY;
      
      if (!apiKey) {
        if (apiMode === 'paid') {
          throw new Error("Vui lòng chọn API Key (Paid) để tiếp tục.");
        } else {
          throw new Error("Không tìm thấy Gemini API Key. Vui lòng kiểm tra cấu hình.");
        }
      }

      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      const modelName = apiMode === 'free' ? 'gemini-2.5-flash-image' : 'gemini-3.1-flash-image-preview';
      
      const base64Data = state.originalImage.split(',')[1];
      const mimeType = state.originalImage.split(';')[0].split(':')[1];
      
      const parts: any[] = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: generateMainPrompt()
        }
      ];

      const config: any = {};
      
      if (apiMode === 'paid') {
        config.imageConfig = {
          aspectRatio: "16:9",
          imageSize: "1K"
        };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        ...(Object.keys(config).length > 0 ? { config } : {})
      });

      if (renderIdRef.current !== currentRenderId) {
        return; // Render was cancelled
      }

      let imageUrl = null;
      let textResponse = "";

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
        if (part.text) {
          textResponse += part.text;
        }
      }

      if (imageUrl) {
        setRenderedImage(imageUrl);
        handleChange('activeTab', 'render');
        setTimeout(() => {
          document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const msg = textResponse || "Không tìm thấy ảnh trong kết quả trả về.";
        alert(`Lỗi: ${msg}`);
      }

    } catch (error: any) {
      console.error("Render error:", error);
      if (renderIdRef.current === currentRenderId) {
        alert(`Đã xảy ra lỗi khi tạo ảnh: ${error.message || 'Vui lòng thử lại.'}`);
      }
    } finally {
      if (renderIdRef.current === currentRenderId) {
        setIsRendering(false);
      }
    }
  };

  const generate2DDesignPrompt = () => {
    return getWardrobeImagePrompt();
  };

  const handleCopy2DDesignPrompt = async () => {
    const promptText = generate2DDesignPrompt();
    try {
      await navigator.clipboard.writeText(promptText);
      alert('Đã copy Prompt thiết kế 2D vào clipboard!');
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      alert('Không thể copy prompt. Vui lòng thử lại.');
    }
  };

  const handleStopRender = () => {
    renderIdRef.current = null;
    setIsRendering(false);
  };


  const handleSwapWardrobeGroups = (groupLabel: string, direction: 'left' | 'right') => {
    const dataKey = 'wardrobeAnalysisData';
    const currentData = state[dataKey];
    if (!currentData) return;

    const newData = { ...currentData };
    const lowerBlocks = [...newData.lowerBlocks];
    const upperBlocks = [...newData.upperBlocks];

    // Get all unique group labels in order of their physical start position
    const labelStarts = new Map<string, number>();
    lowerBlocks.forEach(b => {
        const char = b.label?.charAt(0) || 'A';
        if (!labelStarts.has(char)) {
            labelStarts.set(char, b.start);
        } else {
            labelStarts.set(char, Math.min(labelStarts.get(char)!, b.start));
        }
    });

    const allLabels = Array.from(labelStarts.keys()).sort((a, b) => labelStarts.get(a)! - labelStarts.get(b)!);
    const currentIndex = allLabels.indexOf(groupLabel);
    
    if (direction === 'left' && currentIndex <= 0) return;
    if (direction === 'right' && currentIndex >= allLabels.length - 1) return;

    const targetLabel = direction === 'left' ? allLabels[currentIndex - 1] : allLabels[currentIndex + 1];

    // Find blocks for both groups
    const groupBlocksLower = lowerBlocks.filter(b => b.label?.startsWith(groupLabel));
    const targetBlocksLower = lowerBlocks.filter(b => b.label?.startsWith(targetLabel));

    if (groupBlocksLower.length === 0 || targetBlocksLower.length === 0) return;

    // Get horizontal info
    const groupStart = groupBlocksLower[0].start;
    const groupWidthChar = groupBlocksLower[0].widthChar;

    const targetStart = targetBlocksLower[0].start;
    const targetWidthChar = targetBlocksLower[0].widthChar;

    const newGroupStart = direction === 'right' ? groupStart + targetWidthChar : targetStart;
    const newTargetStart = direction === 'right' ? groupStart : targetStart + groupWidthChar;

    const updateBlocks = (blocks: CabinetBlock[], oldLabel: string, newLabel: string, newStart: number) => {
        return blocks.map(b => {
            if (b.label?.startsWith(oldLabel)) {
                const suffix = b.label.substring(oldLabel.length);
                return { ...b, start: newStart, end: newStart + b.widthChar, label: newLabel + suffix };
            }
            return b;
        });
    };

    let updatedLower = updateBlocks(lowerBlocks, groupLabel, 'TEMP', newGroupStart);
    updatedLower = updateBlocks(updatedLower, targetLabel, groupLabel, newTargetStart);
    updatedLower = updateBlocks(updatedLower, 'TEMP', targetLabel, newGroupStart);

    let updatedUpper = updateBlocks(upperBlocks, groupLabel, 'TEMP', newGroupStart);
    updatedUpper = updateBlocks(updatedUpper, targetLabel, groupLabel, newTargetStart);
    updatedUpper = updateBlocks(updatedUpper, 'TEMP', targetLabel, newGroupStart);

    newData.lowerBlocks = updatedLower;
    newData.upperBlocks = updatedUpper;

    handleChange(dataKey, newData);

    const length = parseInt(state.wardrobeLength) || 0;
    const height = parseInt(state.wardrobeHeight) || 2400;
    const depth = parseInt(state.wardrobeDepth) || 600;
    const numWings = parseInt(state.wardrobeNumWings) || 4;
    
    const newAnalysisText = generateWardrobeAnalysisText(
      newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled, parseInt(state.wardrobeSideShelfLeftWidth) || 0, state.wardrobeSideShelfLeftCategory, state.wardrobeSideShelfLeftType, state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled, parseInt(state.wardrobeSideShelfRightWidth) || 0, state.wardrobeSideShelfRightCategory, state.wardrobeSideShelfRightType, state.wardrobeSideShelfRightExternalType
    );
    handleChange('wardrobeAnalysisResult', newAnalysisText);
  };

  const handleMergeBlocks = (type: 'upper' | 'lower', index: number) => {
    const dataKey = 'wardrobeAnalysisData';
    const currentData = state[dataKey];
    if (!currentData) return;
    
    const newData = { ...currentData };
    const blocks = type === 'upper' ? [...newData.upperBlocks] : [...newData.lowerBlocks];
    
    if (index < 0 || index >= blocks.length - 1) return;

    const block1 = blocks[index];
    const block2 = blocks[index + 1];

    const isVerticalMerge = block1.start === block2.start && block1.end === block2.end;

    const newHeight = isVerticalMerge ? (block1.heightMm || 0) + (block2.heightMm || 0) + 17 : block1.heightMm;
    const mergedBlock = {
        ...block1,
        widthMm: isVerticalMerge ? block1.widthMm : block1.widthMm + block2.widthMm,
        widthChar: isVerticalMerge ? block1.widthChar : block1.widthChar + block2.widthChar,
        heightMm: newHeight,
        end: isVerticalMerge ? block1.end : block2.end,
    };

    const mBase = block1.label?.split(' - ')[0] || 'A1';
    const mFInfo = WARDROBE_FUNCTIONS[block1.functionType as keyof typeof WARDROBE_FUNCTIONS];
    mergedBlock.label = `${mBase} - ${mFInfo.label.split(' (')[0]} ${newHeight}`;

    blocks.splice(index, 2, mergedBlock);

    if (isVerticalMerge) {
        // Recalculate yOffsets for the column after merge
        const targetStart = mergedBlock.start;
        const columnBlocks = blocks
            .map((b, idx) => ({ ...b, originalIdx: idx }))
            .filter(b => b.start === targetStart)
            .sort((a, b) => a.originalIdx - b.originalIdx);
            
        const reversed = [...columnBlocks].reverse();
        let currentY = 67; 
        reversed.forEach(cb => {
            const idx = cb.originalIdx;
            blocks[idx] = { ...blocks[idx], yOffsetMm: currentY };
            currentY += blocks[idx].heightMm || 0;
        });
    } else {
        let currentStart = blocks[0].start;
        for (let i = 0; i < blocks.length; i++) {
            blocks[i] = { ...blocks[i], start: currentStart, end: currentStart + blocks[i].widthChar };
            currentStart = blocks[i].end;
        }
    }

    if (type === 'upper') newData.upperBlocks = blocks;
    else newData.lowerBlocks = blocks;

    const upperEnd = newData.upperBlocks[newData.upperBlocks.length - 1]?.end || 0;
    const lowerEnd = newData.lowerBlocks[newData.lowerBlocks.length - 1]?.end || 0;
    newData.totalChars = Math.max(upperEnd, lowerEnd);

    handleChange(dataKey, newData);

    const length = parseInt(state.wardrobeLength) || 0;
    const height = parseInt(state.wardrobeHeight) || 2400;
    const depth = parseInt(state.wardrobeDepth) || 600;
    const numWings = parseInt(state.wardrobeNumWings) || 4;
    
    const newAnalysisText = generateWardrobeAnalysisText(
      newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled, parseInt(state.wardrobeSideShelfLeftWidth) || 0, state.wardrobeSideShelfLeftCategory, state.wardrobeSideShelfLeftType, state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled, parseInt(state.wardrobeSideShelfRightWidth) || 0, state.wardrobeSideShelfRightCategory, state.wardrobeSideShelfRightType, state.wardrobeSideShelfRightExternalType
    );
    handleChange('wardrobeAnalysisResult', newAnalysisText);
  };

  const handleAddBlock = (type: 'upper' | 'lower', index: number, functionType?: string) => {
    const dataKey = 'wardrobeAnalysisData';
    const currentData = state[dataKey];
    if (!currentData) return;
    
    const newData = { ...currentData };
    const blocks = type === 'upper' ? [...newData.upperBlocks] : [...newData.lowerBlocks];
    
    if (index >= 0 && index < blocks.length) {
        const targetBlock = blocks[index];
        const columnBlocks = blocks
            .filter(b => b.start === targetBlock.start && b.end === targetBlock.end)
            .sort((a, b) => (a.yOffsetMm || 0) - (b.yOffsetMm || 0));
        
        const lastBlock = columnBlocks[columnBlocks.length - 1];
        const lastIndexInBlocks = blocks.findIndex(b => b.id === lastBlock.id);
        
        let nextNum = 1;
        const fullLabel = targetBlock.label || 'A1';
        const idPart = fullLabel.split(' ')[0].substring(0, 2); 
        
        columnBlocks.forEach(b => {
            const bId = b.label?.split(' ')[0] || '';
            if (bId.startsWith(idPart) && bId.length > 2) {
                const num = parseInt(bId.substring(2));
                if (!isNaN(num) && num >= nextNum) nextNum = num + 1;
            }
        });

        const fType = functionType || 'hanging';
        const isDrawer = fType === 'drawer' || fType === 'small_drawer';
        const newBlockHeight = isDrawer ? 300 : 200;
        const fInfo = WARDROBE_FUNCTIONS[fType as keyof typeof WARDROBE_FUNCTIONS];
        
        const finalLabel = `${idPart}${nextNum} ${fInfo.label.split(' (')[0]}`;

        const newBlock = {
            ...targetBlock,
            id: `split-${Date.now()}`,
            heightMm: newBlockHeight,
            yOffsetMm: 0,
            label: finalLabel,
            functionType: fType,
            text1: fInfo.t1,
            text2: fInfo.t2,
        };

        const updatedColumnBlocks = blocks
            .map((b, idx) => ({ ...b, originalIdx: idx }))
            .filter(b => b.start === targetBlock.start && b.end === targetBlock.end)
            .sort((a, b) => a.originalIdx - b.originalIdx);

        const motherBlockInfo = updatedColumnBlocks.find(b => b.label && /^[A-Z]1\s/.test(b.label)) || updatedColumnBlocks[0];
        const motherIdx = motherBlockInfo.originalIdx;
        const newMotherHeight = Math.max(0, (blocks[motherIdx].heightMm || 0) - newBlockHeight);
        
        blocks[motherIdx] = { 
            ...blocks[motherIdx], 
            heightMm: newMotherHeight
        };

        const mId = blocks[motherIdx].label?.split(' ')[0] || 'A1';
        const mFInfo = WARDROBE_FUNCTIONS[blocks[motherIdx].functionType as keyof typeof WARDROBE_FUNCTIONS];
        blocks[motherIdx].label = `${mId} ${mFInfo.label.split(' (')[0]}`;

        blocks.splice(lastIndexInBlocks + 1, 0, newBlock);
        
        const finalColumnBlocks = blocks
            .map((b, idx) => ({ ...b, originalIdx: idx }))
            .filter(b => b.start === targetBlock.start && b.end === targetBlock.end)
            .sort((a, b) => a.originalIdx - b.originalIdx);
            
        const reversed = [...finalColumnBlocks].reverse();
        let currentY = 67; 
        reversed.forEach(cb => {
            const idx = cb.originalIdx;
            blocks[idx] = { ...blocks[idx], yOffsetMm: currentY };
            currentY += blocks[idx].heightMm || 0;
        });
    }

    if (type === 'upper') newData.upperBlocks = blocks;
    else newData.lowerBlocks = blocks;

    const upperEnd = newData.upperBlocks[newData.upperBlocks.length - 1]?.end || 0;
    const lowerEnd = newData.lowerBlocks[newData.lowerBlocks.length - 1]?.end || 0;
    newData.totalChars = Math.max(upperEnd, lowerEnd);

    handleChange(dataKey, newData);

    const length = parseInt(state.wardrobeLength) || 0;
    const height = parseInt(state.wardrobeHeight) || 2400;
    const depth = parseInt(state.wardrobeDepth) || 600;
    const numWings = parseInt(state.wardrobeNumWings) || 4;
    
    const newAnalysisText = generateWardrobeAnalysisText(
      newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled, parseInt(state.wardrobeSideShelfLeftWidth) || 0, state.wardrobeSideShelfLeftCategory, state.wardrobeSideShelfLeftType, state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled, parseInt(state.wardrobeSideShelfRightWidth) || 0, state.wardrobeSideShelfRightCategory, state.wardrobeSideShelfRightType, state.wardrobeSideShelfRightExternalType
    );
    handleChange('wardrobeAnalysisResult', newAnalysisText);
  };

  const handleDeleteBlock = (type: 'upper' | 'lower', index: number) => {
    const dataKey = 'wardrobeAnalysisData';
    const currentData = state[dataKey];
    if (!currentData) return;
    
    const newData = { ...currentData };
    const blocks = type === 'upper' ? [...newData.upperBlocks] : [...newData.lowerBlocks];
    
    if (blocks.length <= 1) return;

    const deletedBlock = blocks[index];
    blocks.splice(index, 1);

    // Give the height back to the mother block
    const columnBlocks = blocks.filter(b => b.start === deletedBlock.start && b.end === deletedBlock.end);
    if (columnBlocks.length > 0) {
        const motherBlock = columnBlocks.find(b => b.label && /^[A-Z]1\s/.test(b.label)) || columnBlocks[0];
        const motherIdxInBlocks = blocks.findIndex(b => b.id === motherBlock.id);
        
        if (motherIdxInBlocks !== -1) {
            const newMotherHeight = (blocks[motherIdxInBlocks].heightMm || 0) + (deletedBlock.heightMm || 0);
            
            let updatedMother = { 
                ...blocks[motherIdxInBlocks], 
                heightMm: newMotherHeight 
            };

            const mId = updatedMother.label?.split(' ')[0] || 'A1';
            const mFInfo = WARDROBE_FUNCTIONS[updatedMother.functionType as keyof typeof WARDROBE_FUNCTIONS];
            updatedMother.label = `${mId} ${mFInfo.label.split(' (')[0]}`;

            blocks[motherIdxInBlocks] = updatedMother;

            const sortedColumn = [...columnBlocks].sort((a, b) => {
                const idxA = blocks.findIndex(item => item.id === a.id);
                const idxB = blocks.findIndex(item => item.id === b.id);
                return idxA - idxB;
            });

            const reversed = [...sortedColumn].reverse();
            let currentY = 67; 
            reversed.forEach(b => {
                const idx = blocks.findIndex(item => item.id === b.id);
                blocks[idx] = { ...blocks[idx], yOffsetMm: currentY };
                currentY += blocks[idx].heightMm || 0;
            });
        }
    }

    if (type === 'upper') newData.upperBlocks = blocks;
    else newData.lowerBlocks = blocks;

    const upperEnd = newData.upperBlocks[newData.upperBlocks.length - 1]?.end || 0;
    const lowerEnd = newData.lowerBlocks[newData.lowerBlocks.length - 1]?.end || 0;
    newData.totalChars = Math.max(upperEnd, lowerEnd);

    handleChange(dataKey, newData);

    const length = parseInt(state.wardrobeLength) || 0;
    const height = parseInt(state.wardrobeHeight) || 2400;
    const depth = parseInt(state.wardrobeDepth) || 600;
    const numWings = parseInt(state.wardrobeNumWings) || 4;
    
    const newAnalysisText = generateWardrobeAnalysisText(
      newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled, parseInt(state.wardrobeSideShelfLeftWidth) || 0, state.wardrobeSideShelfLeftCategory, state.wardrobeSideShelfLeftType, state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled, parseInt(state.wardrobeSideShelfRightWidth) || 0, state.wardrobeSideShelfRightCategory, state.wardrobeSideShelfRightType, state.wardrobeSideShelfRightExternalType
    );
    handleChange('wardrobeAnalysisResult', newAnalysisText);
  };

  const handleMoveBlock = (type: 'upper' | 'lower', index: number, direction: 'up' | 'down') => {
    const dataKey = 'wardrobeAnalysisData';
    const currentData = state[dataKey];
    if (!currentData) return;
    
    const newData = { ...currentData };
    const blocks = type === 'upper' ? [...newData.upperBlocks] : [...newData.lowerBlocks];
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    // Swap blocks
    const temp = blocks[index];
    blocks[index] = blocks[targetIndex];
    blocks[targetIndex] = temp;

    if (type === 'upper') newData.upperBlocks = blocks;
    else newData.lowerBlocks = blocks;

    // Recalculate yOffsets for ALL blocks in the affected columns
    const affectedStarts = new Set([blocks[index].start, blocks[targetIndex].start]);
    affectedStarts.forEach(start => {
        const columnBlocks = blocks
            .map((b, idx) => ({ ...b, originalIdx: idx }))
            .filter(b => b.start === start)
            .sort((a, b) => a.originalIdx - b.originalIdx);
        
        const reversed = [...columnBlocks].reverse();
        let currentY = 67; 
        reversed.forEach(cb => {
            const idx = cb.originalIdx;
            blocks[idx] = { ...blocks[idx], yOffsetMm: currentY };
            currentY += blocks[idx].heightMm || 0;
        });
    });

    const length = parseInt(state.wardrobeLength) || 0;
    const height = parseInt(state.wardrobeHeight) || 2400;
    const depth = parseInt(state.wardrobeDepth) || 600;
    const numWings = parseInt(state.wardrobeNumWings) || 4;
    
    const newAnalysisText = generateWardrobeAnalysisText(
      newData, length, height, depth, numWings, state.wardrobeHasTopBlock, state.wardrobeIsCeilingHeight, state.wardrobeCeilingAdjustment,
      state.wardrobeSideShelfLeftEnabled, parseInt(state.wardrobeSideShelfLeftWidth) || 0, state.wardrobeSideShelfLeftCategory, state.wardrobeSideShelfLeftType, state.wardrobeSideShelfLeftExternalType,
      state.wardrobeSideShelfRightEnabled, parseInt(state.wardrobeSideShelfRightWidth) || 0, state.wardrobeSideShelfRightCategory, state.wardrobeSideShelfRightType, state.wardrobeSideShelfRightExternalType
    );
    handleChange('wardrobeAnalysisResult', newAnalysisText);

    handleChange(dataKey, newData);
  };

  const handleRestoreBlocks = () => {
    handleAnalyzeWardrobe();
  };

  const handleGenerate2DDesign = async () => {
    setIsRendering(true);
    setImageSettings(defaultImageSettings);
    handleChange('frameStyle', 'Không viền (No frame)');
    const currentRenderId = Date.now();
    renderIdRef.current = currentRenderId;
    try {
      const apiKey = apiMode === 'free' ? process.env.GEMINI_API_KEY : process.env.API_KEY;
      
      if (!apiKey) {
        if (apiMode === 'paid') {
          throw new Error("Vui lòng chọn API Key (Paid) để tiếp tục.");
        } else {
          throw new Error("Không tìm thấy Gemini API Key. Vui lòng kiểm tra cấu hình.");
        }
      }

      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      const modelName = apiMode === 'free' ? 'gemini-2.5-flash-image' : 'gemini-3.1-flash-image-preview';
      let prompt = generate2DDesignPrompt();
      
      const parts: any[] = [];
      
      if (state.referenceImage) {
        const refBase64Data = state.referenceImage.split(',')[1];
        const refMimeType = state.referenceImage.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: refBase64Data,
            mimeType: refMimeType,
          }
        });
        prompt += `\n\n[NOTE: A reference image is provided. Please learn from the 2D drawing style, layout representation, and dimensioning style of this reference image, but apply it strictly to the dimensions and layout specified in the prompt above.]`;
      }
      
      parts.push({ text: prompt });

      const totalWidth = parseInt(state.wardrobeLength) || 3500;
      const totalHeight = parseInt(state.wardrobeHeight) || 2400;
      
      const ratio = totalWidth / totalHeight;
      
      let dynamicAspectRatio = "16:9";
      if (ratio > 3.5) dynamicAspectRatio = "4:3"; 
      else if (ratio > 2) dynamicAspectRatio = "16:9";
      else if (ratio > 1.2) dynamicAspectRatio = "4:3";
      else if (ratio > 0.8) dynamicAspectRatio = "1:1";
      else dynamicAspectRatio = "3:4";

      // Override for flash 2 if paid
      if (apiMode === 'paid' && ratio > 3.5) dynamicAspectRatio = "4:1";

      const config: any = {};
      
      if (apiMode === 'paid') {
        config.imageConfig = {
          aspectRatio: dynamicAspectRatio,
          imageSize: "1K"
        };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: parts,
        },
        ...(Object.keys(config).length > 0 ? { config } : {})
      });

      if (renderIdRef.current !== currentRenderId) {
        console.log("Render cancelled");
        return;
      }

      let foundImage = false;
      let textResponse = "";

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
          setDesignImage(imageUrl);
          foundImage = true;
          break;
        }
        if (part.text) {
          textResponse += part.text;
        }
      }
      
      if (!foundImage) {
        const msg = textResponse || "Không thể tạo ảnh. Vui lòng thử lại.";
        alert(`Lỗi: ${msg}`);
      } else {
        setTimeout(() => {
          const element = document.getElementById('design-result-section');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (error: any) {
      if (renderIdRef.current === currentRenderId) {
        console.error("Render error:", error);
        alert(`Đã xảy ra lỗi khi tạo ảnh: ${error.message || 'Vui lòng thử lại.'}`);
      }
    } finally {
      if (renderIdRef.current === currentRenderId) {
        setIsRendering(false);
      }
    }
  };

  const saveCurrentAsPreset = () => {
    setPresetName(`Mục ${customPresets.length + 1}`);
    setShowPresetModal(true);
  };

  const executeSavePreset = () => {
    const name = presetName || `Mục ${customPresets.length + 1}`;
    // We don't save images in presets to avoid huge localStorage size
    const stateToSave = { ...state };
    stateToSave.originalImage = null;
    stateToSave.referenceImage = null;
    stateToSave.companyLogo = null;
    
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name,
      state: stateToSave
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
    setShowPresetModal(false);
  };

  const deleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa cấu hình này?')) {
      const updated = customPresets.filter(p => p.id !== id);
      setCustomPresets(updated);
      localStorage.setItem('customPresets', JSON.stringify(updated));
    }
  };

  const handleBackup = () => {
    let defaultName = '';
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    
    if (state.customerName && state.customerPhone) {
      const nextVersion = (state.exportVersion || 0) + 1;
      const versionStr = `Vs${nextVersion.toString().padStart(3, '0')}`;
      defaultName = `${state.customerName}_${state.customerPhone}_${versionStr}`;
    } else {
      defaultName = `Clone_${dateStr}`;
    }
    
    setBackupFileName(defaultName);
    setShowBackupModal(true);
  };

  const executeBackup = () => {
    const fileName = backupFileName || `kitchen-design-backup-${new Date().toISOString().split('T')[0]}`;
    
    // Calculate new version
    const newVersion = (state.exportVersion || 0) + 1;
    
    // Update state for current session
    if (state.customerName && state.customerPhone) {
      handleChange('exportVersion', newVersion);
    }

    const backupData = {
      state: { ...state, exportVersion: state.customerName && state.customerPhone ? newVersion : state.exportVersion },
      customPresets: customPresets,
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowBackupModal(false);
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.state) {
          setState(data.state);
        }
        if (data.customPresets) {
          setCustomPresets(data.customPresets);
          localStorage.setItem('customPresets', JSON.stringify(data.customPresets));
        }
        alert('Khôi phục dữ liệu thành công!');
      } catch (err) {
        console.error('Lỗi khi khôi phục dữ liệu:', err);
        alert('Lỗi: File không hợp lệ hoặc bị hỏng.');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const scrollToField = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-xl', 'transition-all', 'duration-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-xl', 'transition-all', 'duration-500');
      }, 1500);
    }
  };

  const renderAnalysisEditor = (data: FurnitureAnalysisData | null, type: 'upper' | 'lower', title: string) => {
    if (!data) return null;
    
    const themeColor = 'emerald';
    const themeBg = 'bg-emerald-50';
    const themeBorder = 'border-emerald-100';
    const themeText = 'text-emerald-900';

    return (
      <Accordion 
        title={title} 
        defaultOpen={false}
        extra={
          <button 
            onClick={(e) => { e.stopPropagation(); handleRestoreBlocks(); }}
            className={`text-[10px] flex items-center gap-1 text-zinc-400 hover:text-emerald-600 bg-zinc-100 hover:bg-emerald-50 px-2 py-1 rounded transition-colors font-bold uppercase tracking-tighter`}
            title="Khôi phục lại phân chia ban đầu"
          >
            <RotateCcw size={10} />
            Khôi phục
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-6">
          {type === 'upper' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-zinc-700">Khoang kịch trần (Vali/Chăn màn)</h4>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">KT (Ngang x Cao)</span>
                </div>
              </div>
                <div className="space-y-3">
                  {(() => {
                    const totalUpperWidth = data.upperBlocks.reduce((sum, b) => sum + b.widthMm, 0);
                    const upperHeight = data.upperBlocks[0]?.heightMm || 0;
                    
                    return (
                      <Accordion title={`Danh sách khoang kịch trần KT ${totalUpperWidth} x ${upperHeight}`} defaultOpen={false}>
                        <div className="space-y-2 pt-2">
                          {data.upperBlocks.map((block, idx) => {
                            const isMother = block.label && /^[A-Z]1$/.test(block.label);
                            const isDrawer = block.functionType === 'small_drawer';
                            const bgClass = isMother ? 'bg-emerald-50 border-emerald-200' :
                                           isDrawer ? 'bg-amber-50 border-amber-200' :
                                           'bg-zinc-50/50 border-zinc-100';
                            
                            return (
                              <div key={block.id} className={`flex items-center gap-1 text-sm ${bgClass} p-1.5 rounded-lg border hover:border-emerald-400 transition-colors`}>
                                <div className="flex flex-col gap-1 min-w-[120px] shrink-0 border-r border-zinc-200 pr-2 mr-1">
                                  <span className="text-zinc-400 font-bold text-[9px] uppercase tracking-wider">{block.label?.split(' ')[0]}</span>
                                  <select 
                                    value={block.functionType}
                                    onChange={(e) => handleBlockChange('upper', block.id, 'functionType', e.target.value)}
                                    className="w-full bg-transparent text-[10px] font-semibold text-zinc-600 focus:outline-none cursor-pointer"
                                  >
                                    {Object.entries(WARDROBE_FUNCTIONS)
                                      .filter(([k]) => ['hanging', 'folded', 'drawer'].includes(k) || k === 'left' || k === 'right')
                                      .map(([k, v]) => (
                                        <option key={k} value={k}>{v.label.split(' (')[0]}</option>
                                      ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1 w-24 shrink-0">
                                  <div className="flex items-center gap-0.5 flex-1">
                                    <input
                                      type="number"
                                      step="50"
                                      value={block.widthMm}
                                      readOnly
                                      className={`w-full rounded-md border-zinc-100 bg-zinc-50 text-[10px] text-zinc-400 py-1 px-1 text-right cursor-not-allowed`}
                                      placeholder="Ngang"
                                    />
                                  </div>
                                  <div className="flex items-center gap-0.5 flex-1 border-l border-zinc-100 pl-1">
                                    <input
                                      type="number"
                                      step="50"
                                      value={block.heightMm || 0}
                                      onChange={(e) => handleBlockChange('upper', block.id, 'heightMm', e.target.value)}
                                      className={`w-full rounded-md border-zinc-200 bg-white text-[10px] focus:ring-emerald-500 focus:border-emerald-500 py-1 px-1 text-right`}
                                      placeholder="Cao"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button onClick={() => handleMoveBlock('upper', idx, 'up')} disabled={idx === 0} className={`p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30 disabled:hover:bg-transparent`} title="Chuyển sang trái">
                                    <ArrowLeft size={14} />
                                  </button>
                                  <button onClick={() => handleMoveBlock('upper', idx, 'down')} disabled={idx === data.upperBlocks.length - 1} className={`p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30 disabled:hover:bg-transparent`} title="Chuyển sang phải">
                                    <ArrowRight size={14} />
                                  </button>
                                  <div className="relative">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveAddMenu(activeAddMenu?.id === block.id ? null : {side: 'wardrobe', type: 'upper', id: block.id});
                                      }} 
                                      className={`p-1 ${activeAddMenu?.id === block.id ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'} rounded`} 
                                      title="Thêm khối mới vào sau"
                                    >
                                      <Plus size={14} />
                                    </button>
                                    {activeAddMenu?.id === block.id && activeAddMenu.type === 'upper' && (
                                      <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-[100] py-1 min-w-[180px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 border-b border-zinc-50 uppercase tracking-wider">Chọn loại khối mới</div>
                                        {Object.entries(WARDROBE_FUNCTIONS)
                                          .filter(([key]) => ['hanging', 'folded', 'drawer'].includes(key) || key === 'left' || key === 'right')
                                          .map(([key, val]) => (
                                            <button 
                                              key={key} 
                                              onClick={() => {
                                                handleAddBlock('upper', idx, key);
                                                setActiveAddMenu(null);
                                              }}
                                              className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between group"
                                            >
                                              <span>{val.label.split(' (')[0]}</span>
                                              <Plus size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                  <button onClick={() => handleDeleteBlock('upper', idx)} disabled={data.upperBlocks.length <= 1} className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400" title="Xoá khối này">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Accordion>
                    );
                  })()}
                </div>
            </div>
          )}
          
          {type === 'lower' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-zinc-700">Thân tủ chính (Từ trái sang phải)</h4>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">KT (Ngang x Cao)</span>
                </div>
              </div>
              <div className="space-y-3">
                {(() => {
                  // Group by column for wardrobe
                  const columns: { label: string, blocks: {block: CabinetBlock, idx: number}[] }[] = [];
                  data.lowerBlocks.forEach((block, idx) => {
                    const colChar = block.label?.charAt(0) || 'A';
                    let col = columns.find(c => c.label === colChar);
                    if (!col) {
                      col = { label: colChar, blocks: [] };
                      columns.push(col);
                    }
                    col.blocks.push({block, idx});
                  });

                  return columns.map((col, colIdx) => {
                    const colWidth = col.blocks[0]?.block.widthMm || 0;
                    const totalFunctionalHeight = col.blocks.reduce((sum, b) => sum + (b.block.heightMm || 0), 0);
                    const totalGroupHeight = totalFunctionalHeight + 84;
                    
                    // KT Lọt lòng: Ngang - 34 (17*2), Cao - 84 (17 đỉnh + 67 chân)
                    const internalWidth = Math.max(0, colWidth - 34);
                    const internalHeight = totalFunctionalHeight;
                    
                    return (
                      <Accordion 
                        key={col.label} 
                        title={`Nhóm ${col.label} KT ${colWidth} x ${totalGroupHeight}`} 
                        defaultOpen={false}
                        extra={
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              Lọt lòng: {internalWidth} x {internalHeight}
                            </span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSwapWardrobeGroups(col.label, 'left'); }}
                                disabled={colIdx === 0}
                                className="p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-20"
                                title="Hoán đổi sang trái"
                              >
                                <ArrowLeft size={14} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSwapWardrobeGroups(col.label, 'right'); }}
                                disabled={colIdx === columns.length - 1}
                                className="p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-20"
                                title="Hoán đổi sang phải"
                              >
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          </div>
                        }
                      >
                        <div className="space-y-2 pt-2">
                          {col.blocks.map(({block, idx}) => {
                            const isMother = block.label && /^[A-Z]1$/.test(block.label);
                            const isDrawer = block.functionType === 'small_drawer';
                            const bgClass = isMother ? 'bg-emerald-50 border-emerald-200' :
                                           isDrawer ? 'bg-amber-50 border-amber-200' :
                                           'bg-zinc-50/50 border-zinc-100';
                            
                            return (
                              <div key={block.id} className={`flex items-center gap-1 text-sm ${bgClass} p-1.5 rounded-lg border hover:border-emerald-400 transition-colors`}>
                                <div className="flex flex-col gap-1 min-w-[120px] shrink-0 border-r border-zinc-200 pr-2 mr-1">
                                  <span className="text-zinc-400 font-bold text-[9px] uppercase tracking-wider">{block.label?.split(' ')[0]}</span>
                                  <select 
                                    value={block.functionType}
                                    onChange={(e) => handleBlockChange('lower', block.id, 'functionType', e.target.value)}
                                    className="w-full bg-transparent text-[10px] font-semibold text-zinc-600 focus:outline-none cursor-pointer"
                                  >
                                    {Object.entries(WARDROBE_FUNCTIONS)
                                      .filter(([k]) => ['hanging', 'folded', 'drawer', 'double_door', 'single_door'].includes(k) || k === 'left' || k === 'right')
                                      .map(([k, v]) => (
                                        <option key={k} value={k}>{v.label.split(' (')[0]}</option>
                                      ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1 w-24 shrink-0">
                                  <div className="flex items-center gap-0.5 flex-1 pl-1">
                                    <input
                                      type="number"
                                      step="50"
                                      value={block.heightMm || 0}
                                      onChange={(e) => handleBlockChange('lower', block.id, 'heightMm', e.target.value)}
                                      className={`w-full rounded-md border-zinc-200 bg-white text-[10px] focus:ring-emerald-500 focus:border-emerald-500 py-1 px-1 text-right`}
                                      placeholder="Cao"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button onClick={() => handleMoveBlock('lower', idx, 'up')} disabled={idx === 0} className={`p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30 disabled:hover:bg-transparent`} title="Chuyển lên trên">
                                    <ChevronUp size={14} />
                                  </button>
                                  <button onClick={() => handleMoveBlock('lower', idx, 'down')} disabled={idx === col.blocks.length - 1} className={`p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30 disabled:hover:bg-transparent`} title="Chuyển xuống dưới">
                                    <ChevronDown size={14} />
                                  </button>
                                  <div className="relative">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveAddMenu(activeAddMenu?.id === block.id ? null : {side: 'wardrobe', type: 'lower', id: block.id});
                                      }} 
                                      className={`p-1 ${activeAddMenu?.id === block.id ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'} rounded`} 
                                      title="Thêm khối mới vào sau"
                                    >
                                      <Plus size={14} />
                                    </button>
                                    {activeAddMenu?.id === block.id && activeAddMenu.type === 'lower' && (
                                      <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-[100] py-1 min-w-[180px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 border-b border-zinc-50 uppercase tracking-wider">Chọn loại khối mới</div>
                                        {Object.entries(WARDROBE_FUNCTIONS)
                                          .filter(([key]) => ['hanging', 'folded', 'drawer'].includes(key) || key === 'left' || key === 'right')
                                          .map(([key, val]) => (
                                            <button 
                                              key={key} 
                                              onClick={() => {
                                                handleAddBlock('lower', idx, key);
                                                setActiveAddMenu(null);
                                              }}
                                              className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between group"
                                            >
                                              <span>{val.label.split(' (')[0]}</span>
                                              <Plus size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                  <button onClick={() => handleDeleteBlock('lower', idx)} disabled={data.lowerBlocks.length <= 1} className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400" title="Xoá khối này">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Accordion>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </Accordion>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Prompt Modal */}
      <AnimatePresence>
        {showPromptModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="text-blue-500" size={20} />
                  Prompt Render AI
                </h3>
                <button 
                  onClick={() => setShowPromptModal(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <p className="text-sm text-zinc-500 mb-4">
                  Đây là câu lệnh (prompt) được tạo tự động dựa trên các lựa chọn cấu hình của bạn. Bạn có thể copy đoạn prompt này để sử dụng trên các công cụ tạo ảnh AI khác như Midjourney, Stable Diffusion, v.v.
                </p>
                <textarea
                  value={generatedPrompt}
                  readOnly
                  className="w-full h-64 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPrompt);
                    alert('Đã copy Prompt vào clipboard!');
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  <Copy size={18} />
                  Copy Prompt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preset Modal */}
      <AnimatePresence>
        {showPresetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
            >
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Save className="text-blue-500" size={20} />
                  Lưu cấu hình mới
                </h3>
                <button 
                  onClick={() => setShowPresetModal(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Tên cấu hình mẫu</label>
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Nhập tên cấu hình..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') executeSavePreset();
                      if (e.key === 'Escape') setShowPresetModal(false);
                    }}
                  />
                  <p className="text-xs text-zinc-500">Cấu hình sẽ được lưu vào bộ nhớ trình duyệt.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPresetModal(false)}
                    className="flex-1 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={executeSavePreset}
                    className="flex-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Lưu cấu hình
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Backup Modal */}
      <AnimatePresence>
        {showBackupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
            >
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Download className="text-blue-500" size={20} />
                  Sao lưu dữ liệu
                </h3>
                <button 
                  onClick={() => setShowBackupModal(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Tên bản sao lưu</label>
                  <input
                    type="text"
                    value={backupFileName}
                    onChange={(e) => setBackupFileName(e.target.value)}
                    placeholder="Nhập tên file..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') executeBackup();
                      if (e.key === 'Escape') setShowBackupModal(false);
                    }}
                  />
                  <p className="text-xs text-zinc-500">File sẽ được lưu dưới định dạng .json</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowBackupModal(false)}
                    className="flex-1 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={executeBackup}
                    className="flex-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Tải xuống
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Paste Modal */}
      {showPasteModal && (
        <div id="paste-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 text-center relative border border-zinc-100"
          >
            <button 
              onClick={() => setShowPasteModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <ClipboardPaste size={32} className="text-blue-600 -rotate-3" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Dán ảnh vào khung</h3>
            <p className="text-zinc-500 mb-8">
              Hãy nhấn tổ hợp phím <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded-lg font-mono text-sm font-semibold text-zinc-800 mx-1 shadow-sm">Ctrl + V</kbd> (hoặc <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded-lg font-mono text-sm font-semibold text-zinc-800 mx-1 shadow-sm">Cmd + V</kbd> trên Mac) để dán ảnh bạn vừa copy vào đây.
            </p>
            <button
              onClick={() => setShowPasteModal(false)}
              className="w-full py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold rounded-xl transition-colors"
            >
              Hủy
            </button>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl text-white shadow-sm shadow-blue-500/20">
              <Wand2 size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 hidden md:block">Render Prompt Builder</h1>
          </div>
          <div className="flex items-center gap-4 overflow-hidden">
            <button
              onClick={() => setApiMode(null)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-full bg-zinc-100 text-zinc-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
              title="Đổi phiên bản API Miễn phí / Trả phí"
            >
              {apiMode === 'paid' ? <Sparkles size={14} className="text-blue-500" /> : <Sun size={14} className="text-orange-500" />}
              {apiMode === 'paid' ? 'Bản Trả Phí' : 'Bản Miễn Phí'}
            </button>
            <div className="h-4 w-px bg-zinc-200 hidden sm:block"></div>
            <span className="text-sm text-zinc-500 font-medium hidden sm:inline-block whitespace-nowrap">Cấu hình mẫu:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar flex-nowrap">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.state)}
                  className="whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-all border border-transparent hover:border-zinc-300 flex-shrink-0"
                >
                  {preset.name}
                </button>
              ))}
              {customPresets.map(preset => (
                <div key={preset.id} className="relative group flex-shrink-0">
                  <button
                    onClick={() => applyPreset(preset.state)}
                    className="whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all border border-blue-200 pr-9"
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={(e) => deleteCustomPreset(preset.id, e)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-blue-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-white"
                    title="Xóa cấu hình"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-200/80">
              <div className="px-6 py-5 border-b border-zinc-100 bg-white flex items-center gap-3 rounded-t-3xl">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-200">
                  <SlidersHorizontal size={18} />
                </div>
                <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Cấu hình</h2>
              </div>
              
              <div className="p-6 space-y-8">
                
                {/* Main Tabs */}
                <div className="flex p-1.5 bg-zinc-100/60 rounded-2xl mb-8 border border-zinc-200/40 shadow-inner">
                  <button
                    onClick={() => handleChange('activeTab', 'design')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                      state.activeTab === 'design' 
                        ? 'bg-white text-blue-700 shadow-md ring-1 ring-zinc-200/50' 
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-white/40'
                    }`}
                  >
                    <Layout size={18} />
                    Thiết kế
                  </button>
                  <button
                    onClick={() => handleChange('activeTab', 'render')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                      state.activeTab === 'render' 
                        ? 'bg-white text-blue-700 shadow-md ring-1 ring-zinc-200/50' 
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-white/40'
                    }`}
                  >
                    <Wand2 size={18} />
                    Render
                  </button>
                </div>

                {/* Customer Info Section */}
                <Accordion 
                  title={<span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Thông tin khách hàng</span>}
                  defaultOpen={false}
                >
                  <div className="space-y-4 pt-2">
                    <div className="space-y-3">
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                          <User size={16} />
                        </div>
                        <input
                          type="text"
                          placeholder="Tên khách hàng..."
                          value={state.customerName}
                          onChange={(e) => handleChange('customerName', e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] font-bold text-zinc-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
                          <Phone size={16} />
                        </div>
                        <input
                          type="text"
                          placeholder="Số điện thoại (SDT)..."
                          value={state.customerPhone}
                          onChange={(e) => handleChange('customerPhone', e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] font-bold text-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-4 top-4 text-zinc-400 group-focus-within:text-violet-500 transition-colors">
                          <MapPin size={16} />
                        </div>
                        <textarea
                          placeholder="Địa chỉ công trình..."
                          value={state.customerAddress}
                          onChange={(e) => handleChange('customerAddress', e.target.value)}
                          rows={2}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-[13px] font-bold text-zinc-900 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 focus:outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!state.customerName || !state.customerPhone) {
                            alert("Vui lòng nhập Tên và SDT để lưu!");
                            return;
                          }
                          const key = `session_${state.customerName}_${state.customerPhone}`;
                          localStorage.setItem(key, JSON.stringify(state));
                          alert(`Đã lưu dữ liệu cho khách hàng: ${state.customerName}`);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Save size={14} /> Lưu session
                      </button>
                      <button
                        onClick={() => {
                          if (!state.customerName || !state.customerPhone) {
                            alert("Vui lòng nhập Tên và SDT để tìm kiếm dữ liệu!");
                            return;
                          }
                          const key = `session_${state.customerName}_${state.customerPhone}`;
                          const saved = localStorage.getItem(key);
                          if (saved) {
                            try {
                              const parsed = JSON.parse(saved);
                              setState(prev => ({ ...prev, ...parsed }));
                              alert(`Đã khôi phục dữ liệu cho: ${state.customerName}`);
                            } catch (e) {
                              alert("Lỗi khi khôi phục dữ liệu!");
                            }
                          } else {
                            alert("Không tìm thấy dữ liệu cho khách hàng này!");
                          }
                        }}
                        className="flex-1 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw size={14} /> Khôi phục
                      </button>
                    </div>
                  </div>
                </Accordion>

                {/* Render Mode Toggle (Always visible) */}
                <div className="space-y-3 mb-8">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Chế độ làm việc</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                        state.renderMode === 'wardrobe' 
                          ? 'border-blue-600 bg-blue-50/30 shadow-lg shadow-blue-500/10' 
                          : 'border-zinc-100 bg-white hover:border-blue-200 hover:bg-blue-50/20'
                      }`}
                      onClick={() => handleChange('renderMode', 'wardrobe')}
                    >
                      <div className={`p-2.5 rounded-xl mb-2 transition-all ${state.renderMode === 'wardrobe' ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200' : 'bg-zinc-100 text-zinc-500'}`}>
                        <Layout size={20} />
                      </div>
                      <h3 className={`font-black text-[11px] uppercase tracking-[0.1em] transition-colors ${state.renderMode === 'wardrobe' ? 'text-blue-900' : 'text-zinc-400'}`}>TỦ ÁO</h3>
                    </button>

                    <button
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                        state.renderMode === 'interior' 
                          ? 'border-emerald-600 bg-emerald-50/30 shadow-lg shadow-emerald-500/10' 
                          : 'border-zinc-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/20'
                      }`}
                      onClick={() => handleChange('renderMode', 'interior')}
                    >
                      <div className={`p-2.5 rounded-xl mb-2 transition-all ${state.renderMode === 'interior' ? 'bg-emerald-600 text-white scale-110 shadow-lg shadow-emerald-200' : 'bg-zinc-100 text-zinc-400'}`}>
                        <Armchair size={20} />
                      </div>
                      <h3 className={`font-black text-[11px] uppercase tracking-[0.1em] transition-colors ${state.renderMode === 'interior' ? 'text-emerald-900' : 'text-zinc-400'}`}>NỘI THẤT</h3>
                    </button>
                  </div>
                </div>


                {state.activeTab === 'render' && (
                  <div id="field-originalImage" className="scroll-mt-24 space-y-3">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Hình ảnh nguồn</label>
                    {!state.originalImage ? (
                      <div className="mt-2 flex justify-center rounded-3xl border-2 border-dashed border-zinc-200 px-6 py-12 hover:bg-blue-50/30 hover:border-blue-400 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="text-center relative z-10">
                          <div className="mx-auto h-16 w-16 text-blue-500 group-hover:scale-110 transition-transform flex items-center justify-center bg-blue-50 rounded-2xl shadow-sm border border-blue-100 mb-4">
                            <Upload size={28} />
                          </div>
                          <div className="flex text-sm leading-6 text-zinc-700 justify-center font-bold">
                            Tải ảnh SketchUp lên
                            <input id="original-image-upload" name="original-image-upload" type="file" accept="image/*" className="sr-only" ref={originalImageRef} onChange={handleOriginalImageUpload} />
                          </div>
                          <p className="text-[11px] leading-5 text-zinc-400 mt-2 font-medium">Hỗ trợ PNG, JPG • Ctrl+V để dán trực tiếp</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    ) : (
                      <div className="relative mt-2 block w-full group overflow-hidden rounded-3xl border border-zinc-200/80 shadow-sm">
                        <img src={state.originalImage} alt="Original SketchUp" className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                          <button
                            onClick={removeOriginalImage}
                            className="bg-white text-rose-600 hover:bg-rose-600 hover:text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-xl transition-all scale-90 group-hover:scale-100"
                          >
                            Xóa và đổi ảnh
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {state.activeTab === 'render' && (
                  <Accordion title="Phong cách" defaultOpen={true}>
                    <SelectField id="field-style" label="Phong cách (Style)" value={state.style} options={OPTIONS.style} onChange={(v) => handleChange('style', v)} />
                  </Accordion>
                )}

                {state.activeTab === 'render' && state.renderMode === 'wardrobe' && (
                  <>
                    <Accordion title="Vật liệu & Màu sắc" defaultOpen={true}>
                      <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors mb-4">
                        <input
                          type="checkbox"
                          checked={state.wardrobeApplyMaterials}
                          onChange={(e) => handleChange('wardrobeApplyMaterials', e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-900">Thiết lập Vật liệu & Màu sắc</span>
                          <span className="text-[10px] text-zinc-500">Bật để tùy chỉnh mã màu mẫu</span>
                        </div>
                      </label>

                      {state.wardrobeApplyMaterials && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 mb-4 pb-4 border-b border-zinc-100">
                          <SelectField id="field-cabinetDoor" label="Vật liệu cánh tủ" value={state.cabinetDoor} options={OPTIONS.cabinetDoor} onChange={(v) => handleChange('cabinetDoor', v)} />
                          
                          <div className="space-y-3">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Màu tủ áo (Mã Màu)</label>
                        <select
                          id="field-lowerCabinetColor"
                          value={state.lowerCabinetColor}
                          onChange={(e) => handleChange('lowerCabinetColor', e.target.value)}
                          className="w-full h-12 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13px] font-bold text-zinc-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                        >
                          <optgroup label="An Cường Acrylic">
                            {OPTIONS.cabinetColor.filter(c => c.includes('ALD AC')).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Màu cơ bản">
                            {OPTIONS.cabinetColor.filter(c => c.includes('Màu Cơ Bản')).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </optgroup>
                          <optgroup label="MDF & Melamine">
                            {OPTIONS.cabinetColor.filter(c => c.includes('MDF & MELAMIN')).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </optgroup>
                        </select>
                        <div className="flex flex-col gap-2 mt-2 ml-1">
                          {state.lowerCabinetColor.startsWith('MDF & MELAMIN') && (
                            <p 
                              className="text-xs text-blue-600 flex items-center gap-1.5 cursor-pointer hover:underline font-medium"
                              onClick={() => window.open(`https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(state.lowerCabinetColor.replace('MDF & MELAMIN - ', '') + ' parent:11hbxDuO3Tc57gbT44MroYi6k-gGN-_Xx')}`, '_blank')}
                            >
                              <FolderOpen size={14} /> Tìm ảnh {state.lowerCabinetColor.replace('MDF & MELAMIN - ', '')} trên Google Drive
                            </p>
                          )}
                          <label className="text-xs text-zinc-500 flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors w-fit font-medium">
                            <Upload size={14} /> Tải ảnh mã màu từ máy tính
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => handleChange('lowerCabinetImage', e.target?.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {state.lowerCabinetImage && (
                            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-zinc-200 mt-2 shadow-sm group">
                              <img src={state.lowerCabinetImage} alt="Wardrobe color" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleChange('lowerCabinetImage', null)}
                                className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <SelectField id="field-handles" label="Tay nắm / Phụ kiện" value={state.handles} options={OPTIONS.handles} onChange={(v) => handleChange('handles', v)} />
                  </Accordion>
                  </>
                )}


                {state.activeTab === 'design' && (
                  <>
                    <Accordion 
                      title={<span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dựng hình (SketchUp)</span>} 
                      isOpen={state.wardrobeAccordionOpen} 
                      onToggle={(open) => handleChange('wardrobeAccordionOpen', open)}
                    >
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField id="field-wardrobeLength" label="Chiều dài (mm)" value={state.wardrobeLength} onChange={(v) => handleChange('wardrobeLength', v)} placeholder="VD: 2400mm" />
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Chiều cao (mm)</label>
                            <div className="flex gap-1.5">
                              <select
                                value={['2000', '2200', '2400'].includes(state.wardrobeHeight) ? state.wardrobeHeight : 'custom'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== 'custom') {
                                    handleChange('wardrobeHeight', val);
                                  } else {
                                    // Set to a custom value if it was a preset, or keep current if already custom
                                    if (['2000', '2200', '2400'].includes(state.wardrobeHeight)) {
                                      handleChange('wardrobeHeight', '2500'); // Default custom value
                                    }
                                  }
                                }}
                                className="flex-1 rounded-xl border border-zinc-200 bg-white px-2 py-2.5 text-xs font-bold text-zinc-700 focus:border-blue-500 focus:outline-none transition-all"
                              >
                                <option value="2000">2000mm</option>
                                <option value="2200">2200mm</option>
                                <option value="2400">2400mm</option>
                                <option value="custom">Tuỳ chọn</option>
                              </select>
                              {(!['2000', '2200', '2400'].includes(state.wardrobeHeight)) && (
                                <input
                                  type="text"
                                  value={state.wardrobeHeight}
                                  onChange={(e) => handleChange('wardrobeHeight', e.target.value)}
                                  placeholder="Nhập..."
                                  className="w-16 rounded-xl border border-zinc-200 bg-white px-2 py-2.5 text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none transition-all"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField id="field-wardrobeDepth" label="Chiều sâu (mm)" value={state.wardrobeDepth} onChange={(v) => handleChange('wardrobeDepth', v)} placeholder="VD: 600mm" />
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Số cánh (Để trống = Auto)</label>
                            <input
                              type="text"
                              value={state.wardrobeNumWings}
                              onChange={(e) => handleChange('wardrobeNumWings', e.target.value)}
                              placeholder="Auto"
                              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                          </div>
                        </div>

                        {(state.wardrobeSideShelfLeftEnabled || state.wardrobeSideShelfRightEnabled) && (
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-indigo-500 rounded-lg text-white">
                                <Ruler size={14} />
                              </div>
                              <span className="text-xs font-bold text-indigo-700">Chiều ngang thân tủ chính:</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-indigo-700 block text-lg leading-none">
                                {(parseInt(state.wardrobeLength) || 0) - (state.wardrobeSideShelfLeftEnabled ? (parseInt(state.wardrobeSideShelfLeftWidth) || 0) : 0) - (state.wardrobeSideShelfRightEnabled ? (parseInt(state.wardrobeSideShelfRightWidth) || 0) : 0)}mm
                              </span>
                              <span className="text-[10px] text-indigo-400 font-medium italic">
                                ({state.wardrobeLength} - {state.wardrobeSideShelfLeftEnabled ? state.wardrobeSideShelfLeftWidth : 0} - {state.wardrobeSideShelfRightEnabled ? state.wardrobeSideShelfRightWidth : 0})
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 mt-2">
                          <label className={`flex items-center gap-2 text-sm text-zinc-700 ${parseInt(state.wardrobeHeight) >= 2100 ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={state.wardrobeIsCeilingHeight}
                              disabled={parseInt(state.wardrobeHeight) >= 2100}
                              onChange={(e) => handleChange('wardrobeIsCeilingHeight', e.target.checked)}
                              className="rounded text-emerald-500 focus:ring-emerald-500"
                            />
                            Tủ chạm trần (A00, B00...)
                          </label>
                          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeShiftDoors}
                              onChange={(e) => handleChange('wardrobeShiftDoors', e.target.checked)}
                              className="rounded text-blue-500 focus:ring-blue-500"
                            />
                            Tủ áo Dời Cánh bên
                          </label>
                          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeFullDoors}
                              onChange={(e) => handleChange('wardrobeFullDoors', e.target.checked)}
                              className="rounded text-emerald-500 focus:ring-emerald-500"
                            />
                            Tủ Áo Nguyên Cánh
                          </label>
                          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeShowInternalBlocks}
                              onChange={(e) => handleChange('wardrobeShowInternalBlocks', e.target.checked)}
                              className="rounded text-amber-500 focus:ring-amber-500"
                            />
                            Hiện khối chức năng (A1, A11...)
                          </label>
                          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeHideDoors}
                              onChange={(e) => handleChange('wardrobeHideDoors', e.target.checked)}
                              className="rounded text-rose-500 focus:ring-rose-500"
                            />
                            Ẩn cánh tủ (SketchUp)
                          </label>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 mt-1">
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                            Thêm kệ trang trí
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                             <label className={`flex items-center justify-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                               state.wardrobeSideShelfLeftEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                             }`}>
                               <input
                                 type="checkbox"
                                 checked={state.wardrobeSideShelfLeftEnabled}
                                 onChange={(e) => handleChange('wardrobeSideShelfLeftEnabled', e.target.checked)}
                                 className="rounded text-indigo-500 focus:ring-indigo-500"
                               />
                               <span className="text-sm font-medium">Bên Trái</span>
                             </label>
                             <label className={`flex items-center justify-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                               state.wardrobeSideShelfRightEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                             }`}>
                               <input
                                 type="checkbox"
                                 checked={state.wardrobeSideShelfRightEnabled}
                                 onChange={(e) => handleChange('wardrobeSideShelfRightEnabled', e.target.checked)}
                                 className="rounded text-indigo-500 focus:ring-indigo-500"
                               />
                               <span className="text-sm font-medium">Bên Phải</span>
                             </label>
                          </div>
                        </div>

                        {[
                          { side: 'Left', label: 'Cấu hình Kệ Trái', enabled: state.wardrobeSideShelfLeftEnabled },
                          { side: 'Right', label: 'Cấu hình Kệ Phải', enabled: state.wardrobeSideShelfRightEnabled }
                        ].map(({ side, label, enabled }) => enabled && (
                          <div key={side} className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                            <div className="flex items-center justify-between">
                               <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{label}</h4>
                               <button 
                                 onClick={() => handleChange(`wardrobeSideShelf${side}Enabled` as any, false)}
                                 className="text-indigo-400 hover:text-indigo-600 transition-colors"
                               >
                                 <X size={14} />
                               </button>
                            </div>
                            
                            <div className="flex gap-2 p-1 bg-zinc-200/50 rounded-xl">
                              <button
                                onClick={() => handleChange(`wardrobeSideShelf${side}Category` as any, 'internal')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                  (state as any)[`wardrobeSideShelf${side}Category`] === 'internal' 
                                    ? 'bg-white shadow-sm text-indigo-600' 
                                    : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                              >
                                Tự tạo sẵn
                              </button>
                              <button
                                onClick={() => handleChange(`wardrobeSideShelf${side}Category` as any, 'external')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                  (state as any)[`wardrobeSideShelf${side}Category`] === 'external' 
                                    ? 'bg-white shadow-sm text-indigo-600' 
                                    : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                              >
                                Model ngoài
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              <InputField 
                                id={`field-wardrobeSideShelf${side}Width`}
                                label="Rộng kệ (mm)" 
                                value={(state as any)[`wardrobeSideShelf${side}Width`]} 
                                onChange={(v) => handleChange(`wardrobeSideShelf${side}Width` as any, v)} 
                                placeholder="400" 
                              />
                            </div>

                            {(state as any)[`wardrobeSideShelf${side}Category`] === 'internal' ? (
                              <div className="space-y-3">
                                <div className="space-y-1.5">
                                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kiểu kệ trang trí</label>
                                  <select
                                    value={(state as any)[`wardrobeSideShelf${side}Type`]}
                                    onChange={(e) => handleChange(`wardrobeSideShelf${side}Type` as any, e.target.value as any)}
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none transition-all"
                                  >
                                    <option value="shelves">Kệ 1 (Ngăn chia đều)</option>
                                    <option value="hanging">Kệ trang trí 2</option>
                                    <option value="zigzag">Kệ trang trí 3</option>
                                    <option value="drawers">Kệ trang trí 4</option>
                                    <option value="wine">Kệ trang trí 5</option>
                                    <option value="rounded">Kệ trang trí 6</option>
                                    <option value="glass_display">Kệ trang trí 7</option>
                                    <option value="bag_display">Kệ trang trí 8</option>
                                    <option value="vanity">Kệ trang trí 9</option>
                                    <option value="mirror">Kệ trang trí 10</option>
                                  </select>
                                </div>
                                {(state as any)[`wardrobeSideShelf${side}Type`] === 'shelves' && (
                                  <InputField 
                                    id={`field-wardrobeSideShelf${side}Spacing`}
                                    label="Cao lọt lòng mỗi ngăn (mm)" 
                                    value={(state as any)[`wardrobeSideShelf${side}Spacing`]} 
                                    onChange={(v) => handleChange(`wardrobeSideShelf${side}Spacing` as any, v)} 
                                    placeholder="400" 
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="space-y-1.5 pt-2">
                                  <label className="block text-xs font-semibold text-zinc-800 uppercase tracking-wider underline">Cấu hình Model ngoài</label>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                    Thư mục gốc (D:/Models/)
                                    <FolderOpen size={14} className="text-zinc-400" />
                                  </label>
                                  <input
                                    type="text"
                                    value={state.wardrobeModelBaseDir}
                                    onChange={(e) => handleChange('wardrobeModelBaseDir', e.target.value)}
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none transition-all"
                                    placeholder="D:/SketchUp/Models/"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Đường dẫn file .skp</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      readOnly
                                      value={state.wardrobeSideShelfExternalPaths?.[(state as any)[`wardrobeSideShelf${side}ExternalType`]] || ''}
                                      className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] focus:outline-none font-mono"
                                      placeholder="Chưa chọn file..."
                                    />
                                    <button 
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.skp';
                                        input.onchange = (e: any) => {
                                          const file = e.target.files[0];
                                          if (file) {
                                            const extType = (state as any)[`wardrobeSideShelf${side}ExternalType`];
                                            const baseDir = state.wardrobeModelBaseDir.replace(/\\/g, '/');
                                            const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
                                            const fullPath = normalizedBase + file.name;
                                            
                                            const newPaths = { ...state.wardrobeSideShelfExternalPaths, [extType]: fullPath };
                                            handleChange('wardrobeSideShelfExternalPaths', newPaths);
                                            
                                            const fileName = file.name;
                                            
                                            // Extract width from filename (e.g., "Kệ 1 400.skp" -> 400)
                                            const match = fileName.match(/(\d+)(?=\.skp$)/i);
                                            if (match) {
                                              const width = match[1];
                                              handleChange(`wardrobeSideShelf${side}Width` as any, width);
                                            }

                                            const rubyCode = `# Model ngoài ${extType === 'left' ? 'Trái' : 'Phải'}\n# Thư mục: ${normalizedBase}\n# File: ${fileName}\n\nmodel = Sketchup.active_model\npath = "${fullPath}"\n\nbegin\n  definition = model.definitions.load(path)\n  if definition\n    instance = entities.add_instance(definition, [x.mm, y.mm, z.mm])\n    puts "Loaded model: #{path}"\n  else\n    UI.messagebox("Không thể tải model từ đường dẫn: #{path}")\n  end\nrescue => e\n  UI.messagebox("Lỗi khi tải model: #{e.message}")\nend`;
                                            
                                            const newCodes = { ...state.wardrobeSideShelfExternalCodes, [extType]: rubyCode };
                                            handleChange('wardrobeSideShelfExternalCodes', newCodes);
                                          }
                                        };
                                        input.click();
                                      }}
                                      className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-2 text-xs font-bold whitespace-nowrap"
                                    >
                                      <Upload size={14} /> Duyệt File
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {state.wardrobeIsCeilingHeight && (
                          <div className="pt-2 space-y-2">
                            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Điều chỉnh Kịch trần (±100mm)</label>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => handleChange('wardrobeCeilingAdjustment', state.wardrobeCeilingAdjustment - 100)}
                                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Minus size={16} /> Giảm
                              </button>
                              <div className="w-16 text-center font-bold text-blue-600">
                                {state.wardrobeCeilingAdjustment > 0 ? `+${state.wardrobeCeilingAdjustment}` : state.wardrobeCeilingAdjustment}
                              </div>
                              <button 
                                onClick={() => handleChange('wardrobeCeilingAdjustment', state.wardrobeCeilingAdjustment + 100)}
                                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Plus size={16} /> Tăng
                              </button>
                            </div>
                            <p className="text-[10px] text-zinc-400 italic">* Tăng kịch trần sẽ tự động giảm chiều cao thân tủ tương ứng.</p>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            onClick={handleAnalyzeWardrobe}
                            className="w-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <Layout size={18} />
                            Phân tích công năng tủ áo
                          </button>
                        </div>
                      </div>
                    </Accordion>
                    
                    <Accordion 
                      title={<span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Xuất hình (SketchUp)</span>}
                    >
                      <div className="space-y-4 pt-1">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeExportFullDoors}
                              onChange={(e) => handleChange('wardrobeExportFullDoors', e.target.checked)}
                              className="rounded text-blue-500 focus:ring-blue-500"
                            />
                            Tủ Áo Nguyên Cánh
                          </label>
                          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeExportShiftDoors}
                              onChange={(e) => handleChange('wardrobeExportShiftDoors', e.target.checked)}
                              className="rounded text-emerald-500 focus:ring-emerald-500"
                            />
                            Tủ Áo Dời Cánh
                          </label>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-zinc-100 shadow-sm space-y-3">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Chọn góc xuất hình:</p>
                          
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest pl-1">Phối cảnh (3D)</p>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-blue-500 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={state.wardrobeExportView3DLeft}
                                  onChange={(e) => handleChange('wardrobeExportView3DLeft', e.target.checked)}
                                  className="rounded text-blue-500 focus:ring-blue-500"
                                />
                                Góc 3D Trái
                              </label>
                              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-blue-500 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={state.wardrobeExportView3DRight}
                                  onChange={(e) => handleChange('wardrobeExportView3DRight', e.target.checked)}
                                  className="rounded text-blue-500 focus:ring-blue-500"
                                />
                                Góc 3D Phải
                              </label>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest pl-1">Hình chiếu</p>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-blue-500 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={state.wardrobeExportViewFront}
                                  onChange={(e) => handleChange('wardrobeExportViewFront', e.target.checked)}
                                  className="rounded text-blue-500 focus:ring-blue-500"
                                />
                                Mặt đứng
                              </label>
                              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-blue-500 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={state.wardrobeExportViewTop}
                                  onChange={(e) => handleChange('wardrobeExportViewTop', e.target.checked)}
                                  className="rounded text-blue-500 focus:ring-blue-500"
                                />
                                Mặt bằng
                              </label>
                              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-blue-500 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={state.wardrobeExportViewSideLeft}
                                  onChange={(e) => handleChange('wardrobeExportViewSideLeft', e.target.checked)}
                                  className="rounded text-blue-500 focus:ring-blue-500"
                                />
                                Mặt bên trái
                              </label>
                              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-blue-500 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={state.wardrobeExportViewSideRight}
                                  onChange={(e) => handleChange('wardrobeExportViewSideRight', e.target.checked)}
                                  className="rounded text-blue-500 focus:ring-blue-500"
                                />
                                Mặt bên phải
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <button
                            onClick={() => handleCopySketchUpCode(true)}
                            disabled={!state.wardrobeAnalysisData}
                            className={`w-full font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                              !state.wardrobeAnalysisData 
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                : (copiedExport 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                    : (isSketchUpBuilt ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-400 text-white opacity-80 cursor-pointer'))
                            }`}
                          >
                            {copiedExport ? <Check size={18} /> : <Camera size={18} />}
                            {copiedExport ? 'Đã copy code Xuất hình' : 'XUẤT HÌNH SKETCHUP'}
                          </button>
                          {!state.wardrobeAnalysisData && (
                            <p className="text-[10px] text-zinc-400 mt-2 text-center">* Cần Phân tích công năng trước khi xuất hình</p>
                          )}
                          {!isSketchUpBuilt && state.wardrobeAnalysisData && (
                            <p className="text-[10px] text-orange-500 mt-2 text-center">* Cần kích hoạt Dựng hình trước khi Xuất hình</p>
                          )}
                        </div>

                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 italic">
                          <p className="text-[10px] text-zinc-500">
                            * Khi xuất Ruby, SketchUp sẽ tự động lưu ảnh các góc nhìn tương ứng nếu các mục trên được chọn.
                          </p>
                        </div>
                      </div>
                    </Accordion>

                    <Accordion 
                      title={<span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Vật liệu & Màu sắc (Nâng cao)</span>}
                      isOpen={state.wardrobeAdvancedFeaturesOpen}
                      onToggle={(open) => handleChange('wardrobeAdvancedFeaturesOpen', open)}
                      extra={<Sparkles size={14} className="text-amber-500" />}
                    >
                      <div className="space-y-4 pt-1">
                        <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={state.wardrobeApplyMaterials}
                            onChange={(e) => handleChange('wardrobeApplyMaterials', e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-900">Thiết lập Vật liệu & Màu sắc</span>
                            <span className="text-[10px] text-zinc-500">Bật để tùy chỉnh mã màu và đường dẫn map</span>
                          </div>
                        </label>

                        {state.wardrobeApplyMaterials && (
                          <div className="space-y-4 pt-2 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Thương hiệu Map màu</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['An Cường', 'Mộc Phát', 'Clone 1', 'Clone 2'].map((brand) => (
                                <button
                                  key={brand}
                                  onClick={() => {
                                    handleChange('wardrobeColorBrand', brand as any);
                                    const brandPaths: Record<string, string> = {
                                      'An Cường': 'D:\\AI APP SKETCHUP\\MAP MÀU\\AN CƯỜNG',
                                      'Mộc Phát': 'D:/MOC PHAT MAP/',
                                      'Clone 1': 'D:/CLONE 1/',
                                      'Clone 2': 'D:/CLONE 2/'
                                    };
                                    handleChange('wardrobeExternalBaseDir', brandPaths[brand] || state.wardrobeExternalBaseDir);
                                  }}
                                  className={`px-3 py-2 text-[10px] font-semibold rounded-xl border transition-all ${
                                    state.wardrobeColorBrand === brand
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]'
                                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                                  }`}
                                >
                                  {brand === 'An Cường' && <span className="flex items-center justify-center gap-1"><Sparkles size={10} /> {brand}</span>}
                                  {brand !== 'An Cường' && brand}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Đường dẫn gốc (SketchUp)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={state.wardrobeExternalBaseDir}
                                onChange={(e) => handleChange('wardrobeExternalBaseDir', e.target.value)}
                                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs font-mono focus:outline-none transition-all"
                                placeholder="VD: D:/AI APP SKETCHUP/MAP MÀU/AN CƯỜNG/"
                              />
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <FolderOpen size={14} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-zinc-100 italic">
                          <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeSameColor}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                handleChange('wardrobeSameColor', checked);
                                if (checked) {
                                  handleChange('wardrobeDoorColorMapPath', state.wardrobeBoxColorMapPath);
                                } else {
                                  handleChange('wardrobeAllSameColor', false);
                                }
                              }}
                              className="rounded text-blue-500 focus:ring-blue-500"
                            />
                            Thùng & Cánh cùng màu
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-emerald-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.wardrobeAllSameColor}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                handleChange('wardrobeAllSameColor', checked);
                                if (checked) {
                                  handleChange('wardrobeSameColor', true);
                                  handleChange('wardrobeDoorColorMapPath', state.wardrobeBoxColorMapPath);
                                  handleChange('wardrobeShelfColorMapPath', state.wardrobeBoxColorMapPath);
                                }
                              }}
                              className="rounded text-emerald-500 focus:ring-emerald-500"
                            />
                            Thùng & Cánh & Kệ cùng màu
                          </label>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                              {state.wardrobeAllSameColor ? 'Map ảnh màu (Thùng/Cánh/Kệ)' : (state.wardrobeSameColor ? 'Map ảnh màu (Thùng & Cánh)' : 'Màu Thùng Tủ (Map ảnh màu)')}
                              <Palette size={14} className="text-zinc-400" />
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={state.wardrobeBoxColorMapPath}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleChange('wardrobeBoxColorMapPath', val);
                                  if (state.wardrobeSameColor || state.wardrobeAllSameColor) handleChange('wardrobeDoorColorMapPath', val);
                                  if (state.wardrobeAllSameColor) handleChange('wardrobeShelfColorMapPath', val);
                                }}
                                className="flex-1 rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2 text-[10px] font-mono text-blue-700 focus:outline-none transition-all"
                                placeholder="Đường dẫn màu thùng..."
                              />
                              <button 
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e: any) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const baseDir = state.wardrobeExternalBaseDir.replace(/\\/g, '/');
                                      const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
                                      const fullPath = normalizedBase + file.name;
                                      handleChange('wardrobeBoxColorMapPath', fullPath);
                                      if (state.wardrobeSameColor || state.wardrobeAllSameColor) handleChange('wardrobeDoorColorMapPath', fullPath);
                                      if (state.wardrobeAllSameColor) handleChange('wardrobeShelfColorMapPath', fullPath);
                                    }
                                  };
                                  input.click();
                                }}
                                className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-sm active:scale-95"
                                title="Duyệt file màu thùng"
                              >
                                <Upload size={14} />
                              </button>
                            </div>
                            {state.wardrobeColorBrand === 'An Cường' && (
                              <ColorPicker 
                                label="màu thùng"
                                searchTerm={boxColorSearch}
                                setSearchTerm={setBoxColorSearch}
                                colors={AN_CUONG_COLORS}
                                onSelect={(color) => {
                                  const baseDir = state.wardrobeExternalBaseDir.replace(/\\/g, '/');
                                  const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
                                  const fullPath = normalizedBase + color + '.jpg';
                                  handleChange('wardrobeBoxColorMapPath', fullPath);
                                  if (state.wardrobeSameColor || state.wardrobeAllSameColor) handleChange('wardrobeDoorColorMapPath', fullPath);
                                  if (state.wardrobeAllSameColor) handleChange('wardrobeShelfColorMapPath', fullPath);
                                }}
                              />
                            )}
                          </div>

                          {!state.wardrobeSameColor && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                Màu Cánh Tủ (Map ảnh màu)
                                <Palette size={14} className="text-zinc-400" />
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={state.wardrobeDoorColorMapPath}
                                  onChange={(e) => handleChange('wardrobeDoorColorMapPath', e.target.value)}
                                  className="flex-1 rounded-xl border border-amber-100 bg-amber-50/30 px-3 py-2 text-[10px] font-mono text-amber-700 focus:outline-none transition-all"
                                  placeholder="Đường dẫn màu cánh..."
                                />
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const baseDir = state.wardrobeExternalBaseDir.replace(/\\/g, '/');
                                        const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
                                        const fullPath = normalizedBase + file.name;
                                        handleChange('wardrobeDoorColorMapPath', fullPath);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="px-3 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-sm active:scale-95"
                                  title="Duyệt file màu cánh"
                                >
                                  <Upload size={14} />
                                </button>
                              </div>
                              {state.wardrobeColorBrand === 'An Cường' && (
                                <ColorPicker 
                                  label="màu cánh"
                                  searchTerm={doorColorSearch}
                                  setSearchTerm={setDoorColorSearch}
                                  colors={AN_CUONG_COLORS}
                                  onSelect={(color) => {
                                    const baseDir = state.wardrobeExternalBaseDir.replace(/\\/g, '/');
                                    const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
                                    const fullPath = normalizedBase + color + '.jpg';
                                    handleChange('wardrobeDoorColorMapPath', fullPath);
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {!state.wardrobeAllSameColor && (state.wardrobeSideShelfLeftEnabled || state.wardrobeSideShelfRightEnabled) && (
                            <div className="space-y-1.5 pt-1 border-t border-zinc-100">
                              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                Màu kệ trang trí (Góc)
                                <Sparkles size={14} className="text-zinc-400" />
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={state.wardrobeShelfColorMapPath}
                                  onChange={(e) => handleChange('wardrobeShelfColorMapPath', e.target.value)}
                                  className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50/30 px-3 py-2 text-[10px] font-mono text-emerald-700 focus:outline-none transition-all"
                                  placeholder="Đường dẫn màu kệ trang trí..."
                                />
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const baseDir = state.wardrobeExternalBaseDir.replace(/\\/g, '/');
                                        const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
                                        const fullPath = normalizedBase + file.name;
                                        handleChange('wardrobeShelfColorMapPath', fullPath);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="px-3 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm active:scale-95"
                                  title="Duyệt file màu kệ trang trí"
                                >
                                  <Upload size={14} />
                                </button>
                              </div>
                              {state.wardrobeColorBrand === 'An Cường' && (
                                <ColorPicker 
                                  label="màu kệ trang trí"
                                  searchTerm={shelfColorSearch}
                                  setSearchTerm={setShelfColorSearch}
                                  colors={AN_CUONG_COLORS}
                                  onSelect={(color) => {
                                    const baseDir = state.wardrobeExternalBaseDir.replace(/\\/g, '/');
                                    const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
                                    const fullPath = normalizedBase + color + '.jpg';
                                    handleChange('wardrobeShelfColorMapPath', fullPath);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Accordion>
                  </>
                )}

                {state.activeTab === 'render' && state.renderMode === 'interior' && (
                  <>
                    <Accordion title="Thông tin không gian" defaultOpen={true}>
                      <SelectField id="field-roomType" label="Loại phòng" value={state.roomType} options={OPTIONS.roomType} onChange={(v) => handleChange('roomType', v)} />
                    </Accordion>
                    
                    <Accordion title="Đồ nội thất chính" defaultOpen={true}>
                      <SelectField id="field-mainFurnitureMaterial" label="Chất liệu nội thất chính" value={state.mainFurnitureMaterial} options={OPTIONS.mainFurnitureMaterial} onChange={(v) => handleChange('mainFurnitureMaterial', v)} />
                      <SelectField id="field-furnitureColor" label="Tone màu nội thất" value={state.furnitureColor} options={OPTIONS.furnitureColor} onChange={(v) => handleChange('furnitureColor', v)} />
                      <SelectField id="field-sofaOrBedMaterial" label="Chất liệu Sofa/Giường" value={state.sofaOrBedMaterial} options={OPTIONS.sofaOrBedMaterial} onChange={(v) => handleChange('sofaOrBedMaterial', v)} />
                    </Accordion>
                  </>
                )}

                {state.renderMode !== 'wardrobe' && (
                  <>
                    <Accordion title="Ghi chú thêm" defaultOpen={false}>
                      <textarea
                        value={state.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Ví dụ: Thêm một bình hoa nhỏ trên bàn đảo, ánh sáng hắt từ dưới chân tủ..."
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 min-h-[100px] resize-y transition-all"
                      />
                    </Accordion>

                    <Accordion title="Trình bày & Xuất ảnh" defaultOpen={false}>
                      <div className="space-y-5">
                        <SelectField id="field-frameStyle" label="Khung viền trang trí" value={state.frameStyle} options={OPTIONS.frameStyle} onChange={(v) => handleChange('frameStyle', v)} />
                        
                        <div>
                          <label className="block text-sm font-semibold text-zinc-800 mb-2">Tên dự án / Tiêu đề</label>
                          <input
                            type="text"
                            value={state.projectName}
                            onChange={(e) => handleChange('projectName', e.target.value)}
                            placeholder="VD: Biệt thự Vinhomes - Bếp hiện đại"
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-zinc-800 mb-3">Logo Công ty</label>
                          <div className="flex flex-col gap-2 mb-4">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all">
                              <input 
                                type="radio" 
                                name="logoType" 
                                value="none" 
                                checked={state.logoType === 'none'} 
                                onChange={() => {
                                  handleChange('logoType', 'none');
                                  handleChange('companyLogo', null);
                                }}
                                className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="text-sm font-medium text-zinc-700">Không dùng logo</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all">
                              <input 
                                type="radio" 
                                name="logoType" 
                                value="custom" 
                                checked={state.logoType === 'custom'} 
                                onChange={() => {
                                  handleChange('logoType', 'custom');
                                  if (!companyLogoRef.current?.files?.[0]) {
                                    handleChange('companyLogo', null);
                                  }
                                }}
                                className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="text-sm font-medium text-zinc-700">Tải logo khác</span>
                            </label>
                          </div>

                          {state.logoType === 'custom' && !state.companyLogo && (
                            <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-zinc-200 px-4 py-6 hover:bg-zinc-50 hover:border-blue-300 transition-all group">
                              <div className="text-center">
                                <div className="flex text-sm leading-6 text-zinc-600 justify-center">
                                  <label
                                    htmlFor="logo-upload"
                                    className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none hover:text-blue-500"
                                  >
                                    <span>Tải logo lên</span>
                                    <input id="logo-upload" type="file" accept="image/*" className="sr-only" ref={companyLogoRef} onChange={handleLogoUpload} />
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}

                          {state.companyLogo && (
                            <div className="relative mt-2 inline-block bg-zinc-50 p-4 rounded-xl border border-zinc-200 shadow-sm group">
                              <img src={state.companyLogo} alt="Logo" className="h-12 w-auto object-contain" />
                              {state.logoType === 'custom' && (
                                <button
                                  onClick={removeLogo}
                                  className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 shadow-sm border border-zinc-200 text-zinc-400 hover:text-rose-500 hover:border-rose-200 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Accordion>
                  </>
                )}

    {/* Analysis Editor in Sidebar */}
    {state.activeTab === 'design' && state.wardrobeAnalysisData && (
      <div className="space-y-6 pt-4">
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 text-center transition-colors">Bố cục chi tiết</label>
        {state.wardrobeAnalysisData.lowerBlocks.length > 0 && renderAnalysisEditor(state.wardrobeAnalysisData, 'lower', 'Khoang thân tủ áo')}
        {state.wardrobeAnalysisData.upperBlocks.length > 0 && renderAnalysisEditor(state.wardrobeAnalysisData, 'upper', 'Khoang kịch trần')}
      </div>
    )}
  </div>
</div>
</div>

{/* Right Column: Output */}
<div className="lg:col-span-7 xl:col-span-8 space-y-6">

{/* Analysis Result */}
{state.activeTab === 'design' && state.wardrobeAnalysisResult && (
  <div className="rounded-3xl shadow-sm border overflow-hidden bg-emerald-50/50 border-emerald-100">
    <div className="px-6 py-4 border-b flex items-center justify-between bg-emerald-50/80 border-emerald-100">
      <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-emerald-900">
        <LayoutDashboard size={20} className="text-emerald-600" />
        Kết quả phân tích công năng
      </h2>
      <div className="flex items-center gap-3">
        <button
          onClick={copyImagePrompt}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium hover:bg-emerald-50 transition-all shadow-sm active:scale-95"
          title="Tạo prompt cho AI tạo ảnh (Midjourney, DALL-E...)"
        >
          <ImageIcon size={14} />
          Tạo Prompt Hình Ảnh
        </button>
        <button
          onClick={() => handleCopySketchUpCode(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm active:scale-95 ${
            copiedSketchUp 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
          title="Lấy mã Ruby để tự động dựng khối trong SketchUp"
        >
          {copiedSketchUp ? <Check size={14} /> : <Code size={14} />}
          {copiedSketchUp ? 'Đã copy mã Ruby' : 'DỰNG HÌNH SKETCHUP'}
        </button>
        <button
          onClick={() => handleCopySketchUpCode(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm active:scale-95 ${
            copiedExport 
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
              : (isSketchUpBuilt ? 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50' : 'bg-zinc-100 text-zinc-400 border border-zinc-200 opacity-60 cursor-not-allowed')
          }`}
          title="Lấy mã Ruby để xuất hình trong SketchUp (Yêu cầu Dựng hình trước)"
        >
          {copiedExport ? <Check size={14} /> : <Camera size={14} />}
          {copiedExport ? 'Đã copy code Xuất hình' : 'XUẤT HÌNH SKETCHUP'}
        </button>
        <button 
          onClick={() => {
            handleChange('wardrobeAnalysisResult', null);
            handleChange('wardrobeAnalysisData', null);
          }}
          className="text-zinc-400 hover:text-rose-500 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
    <div className="p-6">
      <div className="prose prose-sm max-w-none prose-emerald">
        {(() => {
          const parts = state.wardrobeAnalysisResult.split('**SƠ ĐỒ THIẾT KẾ CHI TIẾT**');
          if (parts.length < 2) return <Markdown>{state.wardrobeAnalysisResult}</Markdown>;
          
          return (
            <>
              <div className="mb-4">
                <Accordion title="Xem thông tin tổng quát & chi tiết từng khoang" defaultOpen={false}>
                  <div className="prose prose-sm max-w-none prose-emerald pt-2 pb-1">
                    <Markdown>{parts[0]}</Markdown>
                  </div>
                </Accordion>
              </div>
              
              <div className="mt-4">
                <Markdown>{`**SƠ ĐỒ THIẾT KẾ CHI TIẾT**` + parts[1]}</Markdown>
              </div>
            </>
          );
        })()}
      </div>
      
      <div className="mt-6 pt-6 border-t border-emerald-100 flex flex-wrap justify-end gap-3">
        {isRendering && (
          <button
            onClick={handleStopRender}
            className="bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
          >
            <X size={16} />
            Dừng Render
          </button>
        )}
      </div>

                  <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-3">
                    <button
                      onClick={() => handleCopySketchUpCode(false)}
                      className={`w-full font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                        copiedSketchUp 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {copiedSketchUp ? <Check size={18} /> : <Code size={18} />}
                      {copiedSketchUp ? 'Đã copy code SketchUp' : 'DỰNG HÌNH SKETCHUP'}
                    </button>
                    <button
                      onClick={() => handleCopySketchUpCode(true)}
                      className={`w-full font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                        copiedExport 
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                          : (isSketchUpBuilt ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-400 text-white opacity-80 cursor-pointer')
                      }`}
                    >
                      {copiedExport ? <Check size={18} /> : <Camera size={18} />}
                      {copiedExport ? 'Đã copy code Xuất hình' : 'XUẤT HÌNH SKETCHUP'}
                    </button>
                    {designImage && (
                      <button
                        onClick={handleTransferToRenderMode}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                        title="Chuyển thiết kế này sang mục Render AI để tiếp tục render với phong cách khác"
                      >
                        <ArrowRight size={18} />
                        Chuyển sang Render AI
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Summary (Moved to top) */}
            <div id="summary-section" className="bg-white rounded-3xl shadow-sm border border-zinc-200/80 overflow-hidden scroll-mt-24">
              <div className="px-6 py-4 border-b border-zinc-100 bg-white flex items-center justify-between">
                <h2 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  Cấu hình đang chọn
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBackup}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-blue-600 transition-all shadow-sm"
                    title="Tải toàn bộ dữ liệu thiết kế về máy tính để sao lưu"
                  >
                    <Download size={14} />
                    Sao lưu
                  </button>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                    <FolderOpen size={14} />
                    Khôi phục
                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                  </label>
                  <button
                    onClick={saveCurrentAsPreset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-blue-600 transition-all shadow-sm"
                    title="Lưu các lựa chọn hiện tại thành một cấu hình mẫu để dùng lại sau"
                  >
                    <Save size={14} />
                    Lưu thành cấu hình mới
                  </button>
                </div>
              </div>
              <div className="p-5 bg-zinc-50/30">
                <div className="flex flex-wrap gap-2">
                  {state.originalImage && <SummaryItem label="Bản vẽ gốc" value="Đã tải lên" onClick={() => scrollToField('field-originalImage')} />}
                  {state.activeTab === 'render' && (
                    <SummaryItem label="Phong cách" value={state.style} onClick={() => scrollToField('field-style')} />
                  )}
                  {state.activeTab === 'design' && (
                    <>
                      <SummaryItem label="Dài tủ áo" value={state.wardrobeLength} onClick={() => scrollToField('field-wardrobeLength')} />
                      <SummaryItem label="Cao tủ áo" value={state.wardrobeHeight} onClick={() => scrollToField('field-wardrobeHeight')} />
                      <SummaryItem label="Sâu tủ áo" value={state.wardrobeDepth} onClick={() => scrollToField('field-wardrobeDepth')} />
                      <SummaryItem label="Số cánh" value={state.wardrobeNumWings || 'Auto'} onClick={() => scrollToField('field-wardrobeNumWings')} />
                      {state.wardrobeIsCeilingHeight && <SummaryItem label="Chạm trần" value="Có" onClick={() => scrollToField('field-wardrobeIsCeilingHeight')} />}
                      <SummaryItem label="Dịch cánh" value={state.wardrobeShiftDoors ? "Bật (2000mm)" : "Tắt"} onClick={() => scrollToField('field-wardrobeShiftDoors')} />
                      <SummaryItem label="Khối chức năng" value={state.wardrobeShowInternalBlocks ? "Đang hiện" : "Đang ẩn"} onClick={() => scrollToField('field-wardrobeShowInternalBlocks')} />
                      <SummaryItem label="Trạng thái cánh" value={state.wardrobeHideDoors ? "Đang ẩn" : "Đang hiện"} onClick={() => scrollToField('field-wardrobeHideDoors')} />
                    </>
                  )}
                  {state.activeTab === 'render' && state.renderMode === 'interior' && (
                    <>
                      <SummaryItem label="Loại phòng" value={state.roomType} onClick={() => scrollToField('field-roomType')} />
                      <SummaryItem label="Chất liệu nội thất" value={state.mainFurnitureMaterial} onClick={() => scrollToField('field-mainFurnitureMaterial')} />
                      <SummaryItem label="Màu nội thất" value={state.furnitureColor} onClick={() => scrollToField('field-furnitureColor')} />
                      <SummaryItem label="Sofa/Giường" value={state.sofaOrBedMaterial} onClick={() => scrollToField('field-sofaOrBedMaterial')} />
                    </>
                  )}
                  {state.renderMode !== 'wardrobe' && (
                    <>
                      <SummaryItem label="Sàn" value={state.floor} onClick={() => scrollToField('field-floor')} />
                      <SummaryItem label="Tường" value={state.wall} onClick={() => scrollToField('field-wall')} />
                      <SummaryItem label="Đèn trần" value={state.ceilingLight} onClick={() => scrollToField('field-ceilingLight')} />
                      <SummaryItem label="Trang trí" value={state.decor} onClick={() => scrollToField('field-decor')} />
                      <SummaryItem label="Ánh sáng" value={state.lighting} onClick={() => scrollToField('field-lighting')} />
                      <SummaryItem label="Độ sáng" value={state.exposure} onClick={() => scrollToField('field-exposure')} />
                      <SummaryItem label="Góc Camera" value={state.cameraAngle} onClick={() => scrollToField('field-cameraAngle')} />
                      <SummaryItem label="Render" value={state.renderQuality} onClick={() => scrollToField('field-renderQuality')} />
                    </>
                  )}
                  {state.referenceImage && <SummaryItem label="Ảnh tham khảo" value="Đã tải lên" onClick={() => scrollToField('field-referenceImage')} />}
                </div>
              </div>
            </div>

            {/* Render Output (Only in Render Tab) */}
            {state.activeTab === 'render' && (
              <div id="render-result-section" className="bg-white rounded-3xl shadow-sm border border-zinc-200/80 overflow-hidden scroll-mt-24">
              <div className="px-6 py-4 border-b border-zinc-100 bg-white flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <ImageIcon size={18} />
                    </div>
                    <h2 className="font-bold text-zinc-900">Kết quả Render AI</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={externalImageRef}
                    onChange={handleExternalImageUpload}
                  />
                  <button
                    onClick={handlePasteExternalImage}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
                    title="Dán ảnh từ bộ nhớ tạm (Clipboard)"
                  >
                    <ClipboardPaste size={16} />
                    <span className="hidden sm:inline">Dán ảnh</span>
                  </button>
                  <button
                    onClick={() => externalImageRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
                    title="Tải ảnh từ máy tính lên chỉ để đóng khung và thêm logo"
                  >
                    <Upload size={16} />
                    <span className="hidden sm:inline">Tải ảnh ngoài</span>
                  </button>
                  {renderedImage && (
                    <button
                      onClick={() => setShowInpaintTool(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
                      title="Tạo mask khoanh vùng để sửa lỗi (Inpaint)"
                    >
                      <Wand2 size={16} className="text-blue-500" />
                      <span className="hidden sm:inline">Sửa lỗi (Inpaint)</span>
                    </button>
                  )}
                  {isRendering && (
                    <button
                      onClick={handleStopRender}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sm"
                    >
                      <X size={16} />
                      Dừng Render
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setGeneratedPrompt(generateMainPrompt());
                      setShowPromptModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
                    title="Xem và copy Prompt dùng để render"
                  >
                    <FileText size={16} className="text-zinc-500" />
                    <span className="hidden sm:inline">Lấy Prompt</span>
                  </button>
                  <button
                    onClick={handleRender}
                    disabled={isRendering || !state.originalImage}
                    className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-white transition-all shadow-sm ${
                      isRendering || !state.originalImage 
                        ? 'bg-zinc-300 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {isRendering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                        Đang Render...
                      </>
                    ) : (
                      <>
                        <Play size={16} className="fill-current" />
                        Render Ngay
                      </>
                    )}
                  </button>
                </div>
                </div>
                  <div className="flex items-center gap-6 flex-wrap pt-2 border-t border-zinc-100">
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer">
                      <input type="checkbox" checked={state.renderIncludeCabinetDoors} onChange={(e) => handleChange('renderIncludeCabinetDoors', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500" />
                      Hiển thị màu sắc/vật liệu
                    </label>
                  </div>
              </div>
              <div id="render-result-section" className="p-6 bg-zinc-50/50 flex flex-col justify-center items-center min-h-[400px]">
                {renderedImage ? (
                  <div className="w-full flex flex-col items-center">
                    {/* Frame Container */}
                    <div className={`relative transition-all duration-300 w-full max-w-5xl flex flex-col ${
                      state.frameStyle === 'Viền trắng tối giản (Minimalist White)' ? 'bg-white p-3 pb-14 sm:p-4 sm:pb-16 shadow-xl border border-zinc-200' :
                      state.frameStyle === 'Viền đen sang trọng (Luxury Black)' ? 'bg-[#121212] p-3 pb-14 sm:p-4 sm:pb-16 shadow-2xl ring-1 ring-white/10' : ''
                    }`}>
                      <img 
                        src={processedImage || renderedImage} 
                        alt="Rendered Result" 
                        className={`w-full h-auto shadow-sm transition-all duration-200 ${state.frameStyle === 'Không viền (No frame)' ? 'rounded-2xl border border-zinc-200 max-h-[600px] object-contain shadow-md' : ''}`} 
                      />
                      
                      {showDimensionsOnImage && getAsciiDiagram() && (
                        <div className={`mt-4 mb-10 sm:mb-12 w-full overflow-x-auto whitespace-pre font-mono text-[9px] sm:text-[11px] leading-tight ${state.frameStyle === 'Viền đen sang trọng (Luxury Black)' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {getAsciiDiagram()}
                        </div>
                      )}
                      
                      {state.frameStyle !== 'Không viền (No frame)' && (
                        <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-5 right-4 sm:right-5 flex justify-between items-end">
                          {state.companyLogo ? (
                            <img src={state.companyLogo} alt="Company Logo" className="h-6 sm:h-8 object-contain" />
                          ) : (
                            <div></div>
                          )}
                          <div className={`text-lg sm:text-xl font-bold tracking-tight ${state.frameStyle === 'Viền đen sang trọng (Luxury Black)' ? 'text-white' : 'text-zinc-900'}`}>
                            {state.projectName || 'Thiết kế nội thất'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="mt-8 w-full max-w-5xl flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row gap-3 w-full justify-end flex-wrap">
                        {(state.wardrobeAnalysisResult) && (
                          <button
                            onClick={() => setShowDimensionsOnImage(!showDimensionsOnImage)}
                            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl shadow-sm font-semibold transition-all ${showDimensionsOnImage ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
                            title="Hiển thị sơ đồ kích thước trên ảnh khi tải xuống"
                          >
                            <Ruler className="w-5 h-5" />
                            {showDimensionsOnImage ? 'Ẩn kích thước' : 'Hiện kích thước'}
                          </button>
                        )}
                        <button
                          onClick={() => setShowAdvancedEditor(!showAdvancedEditor)}
                          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl shadow-sm font-semibold transition-all ${showAdvancedEditor ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
                        >
                          <SlidersHorizontal className="w-5 h-5" />
                          Chỉnh sửa ảnh nâng cao
                        </button>
                        <button
                          onClick={handleCopyImage}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl shadow-sm font-medium transition-colors"
                        >
                          {copiedMain ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          {copiedMain ? 'Đã copy' : 'Copy ảnh'}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm font-medium transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          Tải xuống
                        </button>
                      </div>

                      {showAdvancedEditor && (
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                              <Palette className="w-5 h-5 text-blue-600" />
                              Chỉnh sửa nâng cao
                            </h3>
                            <button 
                              onClick={() => setImageSettings(defaultImageSettings)}
                              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1 rounded-md hover:bg-zinc-100"
                            >
                              Đặt lại mặc định
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Light/Exposure Group */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                                <Sun className="w-4 h-4" /> Ánh sáng
                              </h4>
                              
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Độ sáng (Exposure)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.exposure}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.exposure} onChange={(e) => setImageSettings({...imageSettings, exposure: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                                
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Độ tương phản (Contrast)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.contrast}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.contrast} onChange={(e) => setImageSettings({...imageSettings, contrast: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Vùng sáng (Highlights)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.highlights}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.highlights} onChange={(e) => setImageSettings({...imageSettings, highlights: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Vùng tối (Shadows)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.shadows}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.shadows} onChange={(e) => setImageSettings({...imageSettings, shadows: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                                
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Trắng (Whites)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.whites}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.whites} onChange={(e) => setImageSettings({...imageSettings, whites: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Đen (Blacks)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.blacks}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.blacks} onChange={(e) => setImageSettings({...imageSettings, blacks: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                              </div>
                            </div>

                            {/* Color Group */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                                <Palette className="w-4 h-4" /> Màu sắc
                              </h4>
                              
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Nhiệt độ màu (Temp)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.temperature}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.temperature} onChange={(e) => setImageSettings({...imageSettings, temperature: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Sắc độ (Tint)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.tint}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.tint} onChange={(e) => setImageSettings({...imageSettings, tint: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Độ bão hòa (Saturation)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.saturation}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.saturation} onChange={(e) => setImageSettings({...imageSettings, saturation: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Độ tươi (Vibrance)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.vibrance}</span>
                                  </div>
                                  <input type="range" min="-100" max="100" value={imageSettings.vibrance} onChange={(e) => setImageSettings({...imageSettings, vibrance: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                                
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-sm text-zinc-700">Tông màu (Hue)</label>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{imageSettings.hue}</span>
                                  </div>
                                  <input type="range" min="-180" max="180" value={imageSettings.hue} onChange={(e) => setImageSettings({...imageSettings, hue: Number(e.target.value)})} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-zinc-400">
                    <ImageIcon size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Nhấn "Render Ngay" để xem kết quả</p>
                    {!state.originalImage && <p className="text-xs mt-1 text-rose-500">Vui lòng tải ảnh gốc lên trước</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
        </div>
      </main>

      {/* Inpaint Mask Tool Modal */}
      <AnimatePresence>
        {showInpaintTool && renderedImage && (
          <InpaintMaskTool 
            imageUrl={processedImage || renderedImage} 
            onClose={() => setShowInpaintTool(false)} 
            onApply={(newImage) => {
              setRenderedImage(newImage);
              setImageSettings(defaultImageSettings);
              setShowInpaintTool(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Advanced Image Editor */}
    </div>
  );
}

function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  prefixToRemove = '',
  isSelected,
  label
}: { 
  options: string[], 
  value: string, 
  onChange: (val: string) => void, 
  placeholder: string,
  prefixToRemove?: string,
  isSelected: boolean,
  label?: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const displayOpt = opt.replace(prefixToRemove, '');
    return displayOpt.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const displayValue = value && options.includes(value) ? (label ? `${label}: ${value.replace(prefixToRemove, '')}` : value.replace(prefixToRemove, '')) : '';

  return (
    <div className={`relative inline-block ${isOpen ? 'z-50' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border flex items-center justify-between min-w-[200px] outline-none shadow-sm ${
          isSelected
            ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500/20'
            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
        }`}
      >
        <span className="truncate mr-4">{displayValue || placeholder}</span>
        <svg className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-max min-w-full max-w-[300px] bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden"
          >
            <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                placeholder="Nhập mã số để tìm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-zinc-500 text-center font-medium">Không tìm thấy mã màu</div>
              ) : (
                filteredOptions.map((opt, index) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors font-medium ${
                      value === opt ? 'bg-blue-50 text-blue-700' : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {index + 1}. {opt.replace(prefixToRemove, '')}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputField({ id, label, value, onChange, placeholder }: { id?: string, label: string, value: string, onChange: (val: string) => void, placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5" id={id}>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
      />
    </div>
  );
}

function SelectField({ id, label, value, options, onChange }: { id?: string, label: string, value: string, options: string[], onChange: (val: string) => void }) {
  const [customMode, setCustomMode] = useState(!options.includes(value));

  useEffect(() => {
    if (options.includes(value)) {
      setCustomMode(false);
    } else {
      setCustomMode(true);
    }
  }, [value, options]);

  const handleSelectChange = (val: string) => {
    if (val === '__custom__') {
      setCustomMode(true);
      onChange('');
    } else {
      setCustomMode(false);
      onChange(val);
      
      // Auto scroll back to summary section after selection
      setTimeout(() => {
        const summaryElement = document.getElementById('summary-section');
        if (summaryElement) {
          summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          summaryElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'transition-all', 'duration-500');
          setTimeout(() => {
            summaryElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'transition-all', 'duration-500');
          }, 1500);
        }
      }, 400); // 400ms delay to let user see their selection
    }
  };

  const normalOptions = options.filter(opt => !opt.startsWith('ALD ') && !opt.startsWith('MDF & MELAMIN') && !opt.startsWith('Màu Cơ Bản - '));
  const vpOptions = options.filter(opt => !opt.startsWith('Kính bếp VP') && opt === ''); // Hide kitchen options but keep structure for now if needed
  const aldOptions = options.filter(opt => opt.startsWith('ALD '));
  const mdfOptions = options.filter(opt => opt.startsWith('MDF & MELAMIN'));
  const basicOptions = options.filter(opt => opt.startsWith('Màu Cơ Bản - '));
  const isVPSelected = vpOptions.includes(value);
  const isALDSelected = aldOptions.includes(value);
  const isMDFSelected = mdfOptions.includes(value);
  const isBasicSelected = basicOptions.includes(value);

  return (
    <div id={id} className="mb-8 scroll-mt-24 relative focus-within:z-50">
      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1 mb-3">{label}</label>
      <div className="flex flex-wrap gap-2.5">
        {normalOptions.map((opt, index) => (
          <button
            key={opt}
            onClick={() => handleSelectChange(opt)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border text-left shadow-sm ${
              value === opt && !customMode
                ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500/20'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
            }`}
          >
            {index + 1}. {opt}
          </button>
        ))}
        {basicOptions.length > 0 && (
          <SearchableSelect
            options={basicOptions}
            value={value}
            onChange={handleSelectChange}
            placeholder={`Màu Cơ Bản (${basicOptions.length} màu)...`}
            prefixToRemove="Màu Cơ Bản - "
            isSelected={isBasicSelected && !customMode}
            label="Màu Cơ Bản"
          />
        )}
        {vpOptions.length > 0 && (
          <SearchableSelect
            options={vpOptions}
            value={value}
            onChange={handleSelectChange}
            placeholder={`Màu kính VP (${vpOptions.length} màu)...`}
            prefixToRemove="Kính bếp "
            isSelected={isVPSelected && !customMode}
            label="Kính VP"
          />
        )}
        {aldOptions.length > 0 && (
          <SearchableSelect
            options={aldOptions}
            value={value}
            onChange={handleSelectChange}
            placeholder={`Màu ALD (${aldOptions.length} màu)...`}
            prefixToRemove="ALD "
            isSelected={isALDSelected && !customMode}
            label="ALD"
          />
        )}
        {mdfOptions.length > 0 && (
          <SearchableSelect
            options={mdfOptions}
            value={value}
            onChange={handleSelectChange}
            placeholder={`Màu MDF & MELAMIN (${mdfOptions.length} màu)...`}
            prefixToRemove="MDF & MELAMIN - "
            isSelected={isMDFSelected && !customMode}
            label="MDF & MELAMIN"
          />
        )}
        <button
          onClick={() => handleSelectChange('__custom__')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border shadow-sm ${
            customMode
              ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500/20'
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
          }`}
        >
          Khác...
        </button>
      </div>
      <AnimatePresence>
        {customMode && (
          <motion.input
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập vật liệu/cấu hình của bạn..."
            className="block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            autoFocus
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryItem({ label, value, onClick }: { label: string, value: string | number, onClick?: () => void }) {
  // Extract the Vietnamese part before the parenthesis if exists for cleaner display
  let displayValue = value ? String(value).split('(')[0].trim() : '...';
  displayValue = displayValue.replace('Màu Cơ Bản - ', '');
  
  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200/60 text-xs ${onClick ? 'cursor-pointer hover:bg-zinc-100 hover:border-zinc-300 transition-all' : ''}`}
    >
      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{label}:</span>
      <span className="font-bold text-zinc-800">{displayValue}</span>
    </div>
  );
}

export default App;
