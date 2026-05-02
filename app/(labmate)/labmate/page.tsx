'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home, FileText, Users, BookOpen, Trash2, HelpCircle, Settings,
  ChevronRight, ChevronDown, Upload, Bold, Italic, Underline,
  Undo2, Redo2, List, ListOrdered, Code, Plus, PanelLeftClose,
  PanelLeftOpen, ChevronLeft, Bell, Copy, Printer, Maximize2, Minimize2,
  X, Send, Share2, FileDown, Minus, Square, MousePointer, Loader2, MessageSquare, Type,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRealtimeCollab, type ChatMsg, type CursorPos, type OnlineUser } from '@/hooks/useRealtimeCollab';
import { useProjectData } from '@/hooks/useProjectData';

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
type ToolMode  = 'select' | 'draw';
type DrawTool  = 'rect' | 'line' | 'double-line' | 'text';
type ResizeHandle = 'TL' | 'TR' | 'BL' | 'BR' | 'P1' | 'P2';

interface Shape {
  id: string; type: string;
  x1: number; y1: number; x2: number; y2: number;
  strokeWidth: number; color: string;
  text?: string;
}
interface DrawState    { x1: number; y1: number; x2: number; y2: number; }
interface InteractState {
  mode: 'drag' | 'resize'; id: string; handle?: ResizeHandle;
  startX: number; startY: number;
  ox1: number; oy1: number; ox2: number; oy2: number;
}

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const A4_W = 794;
const A4_H = 1123;
const SHAPE_COLORS  = ['#1e293b','#4f46e5','#dc2626','#16a34a','#d97706','#0891b2'];
const FONT_OPTIONS  = ['Poppins','Georgia','Arial','Times New Roman','Courier New','Verdana'];
const LIB_FILES = [
  { id: 1, name: 'Observation Table.pdf', ext: 'PDF', bg: 'bg-red-500',    size: '245 KB', date: '2 days ago' },
  { id: 2, name: 'Exp5_Procedure.docx',   ext: 'DOC', bg: 'bg-blue-500',   size: '128 KB', date: '3 days ago' },
  { id: 3, name: 'Sample Data.xlsx',      ext: 'XLS', bg: 'bg-green-500',  size: '89 KB',  date: '1 week ago' },
  { id: 4, name: 'Diagram.png',           ext: 'IMG', bg: 'bg-purple-500', size: '1.2 MB', date: '1 week ago' },
];

/* ═══════════════════════════════════════════
   SVG SHAPE RENDERERS
═══════════════════════════════════════════ */
function renderShapeEl(
  s: Shape, selected: boolean,
  onShapeDown: (e: React.MouseEvent, id: string) => void,
  onHandleDown: (e: React.MouseEvent, id: string, h: ResizeHandle) => void,
  onTextChange?: (id: string, text: string) => void
): React.ReactNode {
  const sel = '#4f46e5';
  const vis = { stroke: s.color, strokeWidth: s.strokeWidth, fill: 'none', strokeLinecap: 'round' as const };

  if (s.type === 'rect') {
    const x = Math.min(s.x1,s.x2), y = Math.min(s.y1,s.y2);
    const w = Math.abs(s.x2-s.x1),  h = Math.abs(s.y2-s.y1);
    if (w < 3 || h < 3) return null;
    const handles: { cx:number; cy:number; h:ResizeHandle; cur:string }[] = [
      {cx:x,   cy:y,   h:'TL', cur:'nw-resize'},
      {cx:x+w, cy:y,   h:'TR', cur:'ne-resize'},
      {cx:x,   cy:y+h, h:'BL', cur:'sw-resize'},
      {cx:x+w, cy:y+h, h:'BR', cur:'se-resize'},
    ];
    return (
      <g key={s.id}>
        <rect x={x} y={y} width={w} height={h} fill="transparent" stroke="transparent"
          strokeWidth={Math.max(12,s.strokeWidth)}
          style={{cursor:'move',pointerEvents:'all'}}
          onMouseDown={e => onShapeDown(e,s.id)} />
        <rect x={x} y={y} width={w} height={h} {...vis} style={{pointerEvents:'none'}} />
        {selected && (
          <>
            <rect x={x-2} y={y-2} width={w+4} height={h+4}
              fill="none" stroke={sel} strokeWidth={1.5} strokeDasharray="6 3"
              style={{pointerEvents:'none'}} />
            {handles.map(hnd => (
              <circle key={hnd.h} cx={hnd.cx} cy={hnd.cy} r={6}
                fill="white" stroke={sel} strokeWidth={1.5}
                style={{cursor:hnd.cur,pointerEvents:'all'}}
                onMouseDown={e => { e.stopPropagation(); onHandleDown(e,s.id,hnd.h); }} />
            ))}
          </>
        )}
      </g>
    );
  }

  if (s.type === 'line') {
    return (
      <g key={s.id}>
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="transparent" strokeWidth={Math.max(14,s.strokeWidth*2)} strokeLinecap="round"
          style={{cursor:'move',pointerEvents:'all'}}
          onMouseDown={e => onShapeDown(e,s.id)} />
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...vis} style={{pointerEvents:'none'}} />
        {selected && (['P1','P2'] as ResizeHandle[]).map(h => {
          const cx = h==='P1' ? s.x1 : s.x2;
          const cy = h==='P1' ? s.y1 : s.y2;
          return <circle key={h} cx={cx} cy={cy} r={6} fill="white" stroke={sel} strokeWidth={1.5}
            style={{cursor:'grab',pointerEvents:'all'}}
            onMouseDown={e => { e.stopPropagation(); onHandleDown(e,s.id,h); }} />;
        })}
      </g>
    );
  }

  if (s.type === 'double-line') {
    const dx=s.x2-s.x1, dy=s.y2-s.y1;
    const len=Math.sqrt(dx*dx+dy*dy)||1;
    const gap=Math.max(6,s.strokeWidth*2.8);
    const nx=(-dy/len)*gap/2, ny=(dx/len)*gap/2;
    return (
      <g key={s.id}>
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="transparent" strokeWidth={Math.max(18,s.strokeWidth*2+gap)} strokeLinecap="round"
          style={{cursor:'move',pointerEvents:'all'}}
          onMouseDown={e => onShapeDown(e,s.id)} />
        <line x1={s.x1+nx} y1={s.y1+ny} x2={s.x2+nx} y2={s.y2+ny} {...vis} style={{pointerEvents:'none'}} />
        <line x1={s.x1-nx} y1={s.y1-ny} x2={s.x2-nx} y2={s.y2-ny} {...vis} style={{pointerEvents:'none'}} />
        {selected && (['P1','P2'] as ResizeHandle[]).map(h => {
          const cx = h==='P1' ? s.x1 : s.x2;
          const cy = h==='P1' ? s.y1 : s.y2;
          return <circle key={h} cx={cx} cy={cy} r={6} fill="white" stroke={sel} strokeWidth={1.5}
            style={{cursor:'grab',pointerEvents:'all'}}
            onMouseDown={e => { e.stopPropagation(); onHandleDown(e,s.id,h); }} />;
        })}
      </g>
    );
  }

  if (s.type === 'text') {
    const x = Math.min(s.x1, s.x2);
    const y = Math.min(s.y1, s.y2);
    const w = Math.max(120, Math.abs(s.x2 - s.x1));
    const h = Math.max(40, Math.abs(s.y2 - s.y1));
    const fontSize = Math.max(12, s.strokeWidth * 6);
    return (
      <g key={s.id}>
        <rect x={x-6} y={y-6} width={w+12} height={h+12} fill="transparent" stroke="transparent"
          style={{cursor:'move',pointerEvents:'all'}}
          onMouseDown={e => onShapeDown(e,s.id)} />
        <foreignObject x={x} y={y} width={w} height={h} style={{pointerEvents: selected ? 'all' : 'none'}}>
          {selected ? (
            <textarea 
              value={s.text || ''} 
              onChange={e => onTextChange?.(s.id, e.target.value)}
              onMouseDown={e => e.stopPropagation()} 
              placeholder="Type text..."
              style={{
                width:'100%', height:'100%', resize:'none', background:'transparent',
                border:`1.5px dashed ${sel}`, outline:'none', color:s.color, fontSize:`${fontSize}px`,
                padding:4, margin:0, fontFamily:'inherit', lineHeight: 1.4
              }}
              autoFocus
            />
          ) : (
            <div style={{
              width:'100%', height:'100%', wordWrap:'break-word', color:s.color, 
              fontSize:`${fontSize}px`, padding:4, fontFamily:'inherit', whiteSpace:'pre-wrap', lineHeight: 1.4
            }}>
              {s.text}
            </div>
          )}
        </foreignObject>
        {selected && (
          <circle cx={x+w} cy={y+h} r={6} fill="white" stroke={sel} strokeWidth={1.5}
            style={{cursor:'se-resize',pointerEvents:'all'}}
            onMouseDown={e => { e.stopPropagation(); onHandleDown(e,s.id,'BR'); }} />
        )}
      </g>
    );
  }
  return null;
}

function renderPreviewEl(d: DrawState, type: DrawTool, sw: number, color: string): React.ReactNode {
  const p = { stroke: color, strokeWidth: sw, fill: 'none', opacity: 0.65, strokeDasharray: '6 4', strokeLinecap: 'round' as const, style: { pointerEvents: 'none' as const } };
  if (type === 'rect' || type === 'text')
    return <rect x={Math.min(d.x1,d.x2)} y={Math.min(d.y1,d.y2)} width={Math.abs(d.x2-d.x1)} height={Math.abs(d.y2-d.y1)} {...p} />;
  if (type === 'line')
    return <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} {...p} />;
  if (type === 'double-line') {
    const dx=d.x2-d.x1, dy=d.y2-d.y1;
    const len=Math.sqrt(dx*dx+dy*dy)||1;
    const gap=Math.max(6,sw*2.8);
    const nx=(-dy/len)*gap/2, ny=(dx/len)*gap/2;
    return (
      <g opacity={0.65}>
        <line x1={d.x1+nx} y1={d.y1+ny} x2={d.x2+nx} y2={d.y2+ny} stroke={color} strokeWidth={sw} fill="none" strokeDasharray="6 4" strokeLinecap="round" style={{pointerEvents:'none'}} />
        <line x1={d.x1-nx} y1={d.y1-ny} x2={d.x2-nx} y2={d.y2-ny} stroke={color} strokeWidth={sw} fill="none" strokeDasharray="6 4" strokeLinecap="round" style={{pointerEvents:'none'}} />
      </g>
    );
  }
  return null;
}

function shapeToSvgString(s: Shape): string {
  const a = `stroke="${s.color}" stroke-width="${s.strokeWidth}" fill="none" stroke-linecap="round"`;
  if (s.type === 'rect') {
    const x=Math.min(s.x1,s.x2), y=Math.min(s.y1,s.y2);
    return `<rect x="${x}" y="${y}" width="${Math.abs(s.x2-s.x1)}" height="${Math.abs(s.y2-s.y1)}" ${a}/>`;
  }
  if (s.type === 'line') return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" ${a}/>`;
  if (s.type === 'double-line') {
    const dx=s.x2-s.x1, dy=s.y2-s.y1;
    const len=Math.sqrt(dx*dx+dy*dy)||1;
    const gap=Math.max(6,s.strokeWidth*2.8);
    const nx=(-dy/len)*gap/2, ny=(dx/len)*gap/2;
    return `<line x1="${s.x1+nx}" y1="${s.y1+ny}" x2="${s.x2+nx}" y2="${s.y2+ny}" ${a}/>
            <line x1="${s.x1-nx}" y1="${s.y1-ny}" x2="${s.x2-nx}" y2="${s.y2-ny}" ${a}/>`;
  }
  return '';
}

/* ═══════════════════════════════════════════
   CURSOR BADGE
═══════════════════════════════════════════ */
function CursorBadge({ name, color, pos }: { name: string; color: string; pos: CursorPos }) {
  return (
    <span className="pointer-events-none absolute z-30 flex items-center gap-1 transition-all duration-700 ease-in-out"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
      <span className="h-4 w-0.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}>{name}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════
   A4 CANVAS  (fixed 794×1123 — one page)
═══════════════════════════════════════════ */
interface A4CanvasProps {
  pageNum: number; totalPages: number;
  text: string; onTextChange: (h: string) => void;
  shapes: Shape[]; onShapesChange: (fn: (prev: Shape[]) => Shape[]) => void;
  toolMode: ToolMode; drawTool: DrawTool | null;
  onDrawComplete: () => void;
  strokeWidth: number; shapeColor: string;
  editorFont: string; editorFontSize: number;
  onEdit: () => void;
  onlineUsers: OnlineUser[];
  currentUserId: string | null;
}

function A4Canvas(props: A4CanvasProps) {
  const { shapes, onShapesChange, toolMode, drawTool, onDrawComplete,
          strokeWidth, shapeColor, editorFont, editorFontSize,
          onEdit, onlineUsers, currentUserId, pageNum, totalPages } = props;

  const editorRef = useRef<HTMLDivElement>(null);
  const svgRef    = useRef<SVGSVGElement>(null);
  const shapesRef = useRef(shapes);
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing,    setDrawing]    = useState<DrawState | null>(null);
  const [interact,   setInteract]   = useState<InteractState | null>(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = props.text;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setSelectedId(null); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const el = document.activeElement as HTMLElement;
        if (el?.tagName === 'INPUT' || el?.isContentEditable) return;
        onShapesChange(prev => prev.filter(s => s.id !== selectedId));
        setSelectedId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, onShapesChange]);

  useEffect(() => {
    if (!interact) return;
    function onMove(e: MouseEvent) {
      if (!svgRef.current) return;
      const r  = svgRef.current.getBoundingClientRect();
      const dx = (e.clientX - r.left) - interact!.startX;
      const dy = (e.clientY - r.top)  - interact!.startY;
      onShapesChange(prev => prev.map(s => {
        if (s.id !== interact!.id) return s;
        if (interact!.mode === 'drag')
          return { ...s, x1:interact!.ox1+dx, y1:interact!.oy1+dy, x2:interact!.ox2+dx, y2:interact!.oy2+dy };
        const ns = { ...s };
        switch (interact!.handle) {
          case 'TL': ns.x1=interact!.ox1+dx; ns.y1=interact!.oy1+dy; break;
          case 'TR': ns.x2=interact!.ox2+dx; ns.y1=interact!.oy1+dy; break;
          case 'BL': ns.x1=interact!.ox1+dx; ns.y2=interact!.oy2+dy; break;
          case 'BR': ns.x2=interact!.ox2+dx; ns.y2=interact!.oy2+dy; break;
          case 'P1': ns.x1=interact!.ox1+dx; ns.y1=interact!.oy1+dy; break;
          case 'P2': ns.x2=interact!.ox2+dx; ns.y2=interact!.oy2+dy; break;
        }
        return ns;
      }));
    }
    function onUp() { setInteract(null); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [interact, onShapesChange]);

  function svgCoords(e: React.MouseEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onSvgDown(e: React.MouseEvent<SVGSVGElement>) {
    if (toolMode !== 'draw') { setSelectedId(null); return; }
    const { x, y } = svgCoords(e);
    setDrawing({ x1:x, y1:y, x2:x, y2:y });
  }
  function onSvgMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawing) return;
    const { x, y } = svgCoords(e);
    setDrawing(d => d ? { ...d, x2:x, y2:y } : null);
  }
  function onSvgUp() {
    if (drawing && drawTool && toolMode === 'draw') {
      const { x1,y1,x2,y2 } = drawing;
      if (Math.abs(x2-x1) > 5 || Math.abs(y2-y1) > 5) {
        const s: Shape = { id:`${Date.now()}-${Math.random()}`, type:drawTool, x1, y1, x2, y2, strokeWidth, color:shapeColor };
        onShapesChange(prev => [...prev, s]);
        onEdit();
      }
      onDrawComplete(); // auto-revert to select every time
    }
    setDrawing(null);
  }

  function onShapeDown(e: React.MouseEvent, id: string) {
    if (toolMode === 'draw') return;
    e.stopPropagation();
    setSelectedId(id);
    const s = shapesRef.current.find(sh => sh.id === id)!;
    const r = svgRef.current!.getBoundingClientRect();
    setInteract({ mode:'drag', id, startX:e.clientX-r.left, startY:e.clientY-r.top, ox1:s.x1, oy1:s.y1, ox2:s.x2, oy2:s.y2 });
  }
  function onHandleDown(e: React.MouseEvent, id: string, handle: ResizeHandle) {
    e.stopPropagation();
    const s = shapesRef.current.find(sh => sh.id === id)!;
    const r = svgRef.current!.getBoundingClientRect();
    setInteract({ mode:'resize', handle, id, startX:e.clientX-r.left, startY:e.clientY-r.top, ox1:s.x1, oy1:s.y1, ox2:s.x2, oy2:s.y2 });
  }

  function handleShapeTextChange(id: string, text: string) {
    onShapesChange(prev => prev.map(s => s.id === id ? { ...s, text } : s));
    onEdit();
  }

  return (
    <div className="relative bg-white shadow-[0_4px_32px_rgba(0,0,0,0.12)] mx-auto flex-shrink-0"
      style={{ width:A4_W, minHeight:A4_H }}>

      {/* page number watermark */}
      <div className="pointer-events-none absolute bottom-3 right-4 text-[10px] text-slate-200 select-none">
        {pageNum} / {totalPages}
      </div>

      {/* remote cursors */}
      <div className="pointer-events-none absolute inset-0 z-30">
        {onlineUsers.filter(u => u.id !== currentUserId).map(u => (
          <CursorBadge key={u.id} name={u.displayName} color={u.color} pos={u.cursor} />
        ))}
      </div>

      {/* text editor — always interactive in select mode */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Click here and start typing…"
        onInput={e => { props.onTextChange(e.currentTarget.innerHTML); onEdit(); }}
        onMouseDown={() => { if (selectedId) setSelectedId(null); }}
        className="labmate-editor absolute inset-0 outline-none text-slate-800"
        style={{
          padding: '48px 56px',
          fontFamily: `${editorFont}, sans-serif`,
          fontSize: `${editorFontSize}pt`,
          lineHeight: 1.85,
          zIndex: 10,
          minHeight: A4_H,
          pointerEvents: toolMode === 'draw' ? 'none' : 'auto',
        }}
      />

      {/* SVG shape overlay */}
      <svg
        ref={svgRef}
        width={A4_W} height={A4_H}
        style={{ position:'absolute', top:0, left:0, zIndex:20,
                 cursor: toolMode === 'draw' ? 'crosshair' : 'default',
                 overflow:'visible', pointerEvents: 'none' }}
        onMouseDown={onSvgDown}
        onMouseMove={onSvgMove}
        onMouseUp={onSvgUp}
        onMouseLeave={onSvgUp}
      >
        {/* capture overlay — only active while drawing */}
        {toolMode === 'draw' && (
          <rect x="0" y="0" width={A4_W} height={A4_H}
            fill="transparent" style={{ pointerEvents:'all' }} />
        )}
        {shapes.map(s => renderShapeEl(s, s.id === selectedId, onShapeDown, onHandleDown, handleShapeTextChange))}
        {drawing && drawTool && renderPreviewEl(drawing, drawTool, strokeWidth, shapeColor)}
      </svg>

      {/* delete hint */}
      {selectedId && toolMode !== 'draw' && (
        <div className="absolute right-4 top-4 z-40">
          <button
            onClick={() => { onShapesChange(prev => prev.filter(s => s.id !== selectedId)); setSelectedId(null); }}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 shadow-md hover:bg-red-50 transition-colors">
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TOOLBAR
═══════════════════════════════════════════ */
interface ToolbarProps {
  onFormat: (cmd: string, val?: string) => void;
  toolMode: ToolMode; drawTool: DrawTool | null;
  onSelectTool: () => void;
  onDrawTool:   (t: DrawTool) => void;
  strokeWidth: number; onStrokeChange: (w: number) => void;
  shapeColor: string;  onColorChange:  (c: string) => void;
  editorFont: string;      onFontChange:     (f: string) => void;
  editorFontSize: number;  onFontSizeChange: (s: number) => void;
}

function Toolbar({ onFormat, toolMode, drawTool, onSelectTool, onDrawTool,
                   strokeWidth, onStrokeChange, shapeColor, onColorChange,
                   editorFont, onFontChange, editorFontSize, onFontSizeChange }: ToolbarProps) {

  const DoubleLineIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="1" y1="4"  x2="13" y2="4" />
      <line x1="1" y1="10" x2="13" y2="10" />
    </svg>
  );

  function fmtBtn(title: string, cmd: string, node: React.ReactNode, val?: string) {
    return (
      <button key={title} title={title}
        onMouseDown={e => { e.preventDefault(); onFormat(cmd, val); }}
        className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
        {node}
      </button>
    );
  }
  function sep() { return <div className="mx-1 h-5 w-px bg-slate-200" />; }

  function toolBtn(active: boolean, onClick: () => void, title: string, icon: React.ReactNode) {
    return (
      <button title={title} onMouseDown={e => { e.preventDefault(); onClick(); }}
        className={`rounded-md p-1.5 transition-colors ${active
          ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-300'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
        {icon}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/95 backdrop-blur px-3 py-1.5 shadow-sm">
      {fmtBtn('Undo', 'undo', <Undo2 size={14} />)}
      {fmtBtn('Redo', 'redo', <Redo2 size={14} />)}
      {sep()}

      {/* font family */}
      <select value={editorFont} onChange={e => onFontChange(e.target.value)}
        className="cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-xs text-slate-600 outline-none hover:bg-slate-100 transition-colors">
        {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
      </select>
      {sep()}

      {/* font size */}
      <button onMouseDown={e => { e.preventDefault(); onFontSizeChange(Math.max(8, editorFontSize-1)); }}
        className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><Minus size={12} /></button>
      <span className="min-w-[28px] text-center text-xs font-medium text-slate-600">{editorFontSize}</span>
      <button onMouseDown={e => { e.preventDefault(); onFontSizeChange(Math.min(36, editorFontSize+1)); }}
        className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><Plus size={12} /></button>
      {sep()}

      {/* text formatting */}
      {fmtBtn('Bold',          'bold',                <Bold size={14} />)}
      {fmtBtn('Italic',        'italic',              <Italic size={14} />)}
      {fmtBtn('Underline',     'underline',           <Underline size={14} />)}
      {sep()}
      {fmtBtn('H1', 'formatBlock', <span className="text-[11px] font-bold">H1</span>, 'h1')}
      {fmtBtn('H2', 'formatBlock', <span className="text-[11px] font-bold">H2</span>, 'h2')}
      {fmtBtn('H3', 'formatBlock', <span className="text-[11px] font-bold">H3</span>, 'h3')}
      {sep()}
      {fmtBtn('Bullet list',   'insertUnorderedList', <List size={14} />)}
      {fmtBtn('Numbered list', 'insertOrderedList',   <ListOrdered size={14} />)}
      {sep()}
      {fmtBtn('Code block',    'formatBlock',         <Code size={14} />, 'pre')}

      {/* ── shapes ── */}
      {sep()}
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Shapes</span>
      {toolBtn(toolMode==='select',            onSelectTool,                       'Select (V)',       <MousePointer size={13} />)}
      {toolBtn(toolMode==='draw'&&drawTool==='text',        () => onDrawTool('text'),        'Text Box (T)',     <Type size={13} />)}
      {toolBtn(toolMode==='draw'&&drawTool==='rect',        () => onDrawTool('rect'),        'Rectangle (R)',    <Square size={13} />)}
      {toolBtn(toolMode==='draw'&&drawTool==='line',        () => onDrawTool('line'),        'Line (L)',         <Minus size={13} />)}
      {toolBtn(toolMode==='draw'&&drawTool==='double-line', () => onDrawTool('double-line'), 'Double line (D)', <DoubleLineIcon />)}

      {/* ── thickness ── */}
      {sep()}
      <span className="text-[10px] text-slate-400">Thickness</span>
      <input type="range" min={1} max={12} step={1} value={strokeWidth}
        onChange={e => onStrokeChange(Number(e.target.value))}
        className="w-20 accent-indigo-500 cursor-pointer" />
      <span className="min-w-[22px] text-center text-[10px] font-medium text-slate-500">{strokeWidth}px</span>

      {/* ── color ── */}
      {sep()}
      <span className="text-[10px] text-slate-400">Color</span>
      {SHAPE_COLORS.map(c => (
        <button key={c} onMouseDown={e => { e.preventDefault(); onColorChange(c); }} title={c}
          className={`h-5 w-5 rounded-full border-2 transition-all hover:scale-110
            ${shapeColor===c ? 'border-indigo-400 scale-110 shadow-sm' : 'border-transparent'}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TOP BAR
═══════════════════════════════════════════ */
interface TopBarProps {
  saveStatus: 'saved'|'saving';
  onShare: () => void;
  onExport: (label: string) => void;
  exportOpen: boolean; setExportOpen: (v: boolean) => void;
  showSidebar: boolean;     onToggleSidebar:    () => void;
  showRightPanel: boolean;  onToggleRightPanel: () => void;
  focusMode: boolean;       onToggleFocus:      () => void;
  onlineUsers: OnlineUser[];
  currentUserInitials: string;
}

function TopBar({ saveStatus, onShare, onExport, exportOpen, setExportOpen,
                  showSidebar, onToggleSidebar, showRightPanel, onToggleRightPanel,
                  focusMode, onToggleFocus, onlineUsers, currentUserInitials }: TopBarProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [setExportOpen]);

  const iconBtn = (onClick: () => void, title: string, active: boolean, icon: React.ReactNode) => (
    <button onClick={onClick} title={title}
      className={`rounded-lg p-1.5 text-sm transition-colors ${active
        ? 'bg-indigo-100 text-indigo-600'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}>
      {icon}
    </button>
  );

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1.5">
        {iconBtn(onToggleSidebar, `${showSidebar?'Hide':'Show'} sidebar (Tab)`, showSidebar,
          showSidebar ? <PanelLeftClose size={16}/> : <PanelLeftOpen size={16}/>)}
        <div className="mx-1 h-4 w-px bg-slate-200" />
        <span className="text-sm font-semibold text-slate-800">Lab Record</span>
        <span className={`ml-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium
          ${saveStatus==='saved' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${saveStatus==='saved' ? 'bg-green-400' : 'animate-pulse bg-amber-400'}`} />
          {saveStatus==='saved' ? 'Saved' : 'Saving…'}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* online avatars */}
        <div className="flex items-center mr-1">
          {onlineUsers.map((u, i) => (
            <div key={u.id} title={u.displayName}
              className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm first:ml-0"
              style={{ backgroundColor: u.color, zIndex: 10-i }}>{u.initials}</div>
          ))}
        </div>

        {/* focus mode */}
        {iconBtn(onToggleFocus, `${focusMode?'Exit':'Enter'} focus mode (F)`, focusMode,
          focusMode ? <Minimize2 size={15}/> : <Maximize2 size={15}/>)}

        {/* chat toggle */}
        {iconBtn(onToggleRightPanel, `${showRightPanel?'Hide':'Show'} chat (C)`, showRightPanel,
          <MessageSquare size={15}/>)}

        <div className="mx-1 h-4 w-px bg-slate-200" />

        <button onClick={onShare}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700">
          <Share2 size={12}/> Invite
        </button>

        <div ref={exportRef} className="relative">
          <button onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
            <FileDown size={13}/> Export <ChevronDown size={11}/>
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-100 bg-white shadow-xl">
              {[['Export as PDF','pdf'],['Export as DOCX','docx'],['Print','print']].map(([label,val]) => (
                <button key={val} onClick={() => { setExportOpen(false); onExport(label); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl">
                  {val==='pdf'?<FileDown size={14}/>:val==='docx'?<FileText size={14}/>:<Printer size={14}/>}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Bell size={15}/></button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">{currentUserInitials}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE THUMBNAILS
═══════════════════════════════════════════ */
function PageThumbnails({ current, total, onSelect, onAdd }: {
  current: number; total: number; onSelect: (n: number) => void; onAdd: () => void;
}) {
  return (
    <div className="flex w-[72px] flex-shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-slate-200 bg-slate-50 py-4">
      {Array.from({length: total}, (_,i) => i+1).map(n => (
        <button key={n} onClick={() => onSelect(n)}
          className={`flex h-16 w-14 flex-col items-center justify-center rounded-xl border-2 shadow-sm transition-all
            ${n===current ? 'border-indigo-500 bg-white text-indigo-600 shadow-indigo-100' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}>
          <span className="mb-0.5 text-[9px] text-slate-400">Page</span>
          <span className="text-lg font-bold">{n}</span>
        </button>
      ))}
      <button onClick={onAdd}
        className="flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-400 transition-colors hover:border-indigo-400 hover:text-indigo-500">
        <Plus size={13}/><span className="text-[9px]">Add</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEFT SIDEBAR
═══════════════════════════════════════════ */
function LeftSidebar({ show, selectedFile, onSelectFile }: {
  show: boolean; selectedFile: number|null; onSelectFile: (id: number) => void;
}) {
  const [labOpen,  setLabOpen]  = useState(true);
  const [dbmsOpen, setDbmsOpen] = useState(true);
  const [hovered,  setHovered]  = useState<number|null>(null);

  const navItems = [
    { icon: <Home size={15}/>,     label: 'Home' },
    { icon: <FileText size={15}/>, label: 'My Records', active: true },
    { icon: <Users size={15}/>,    label: 'Shared with me' },
    { icon: <BookOpen size={15}/>, label: 'Templates' },
    { icon: <Trash2 size={15}/>,   label: 'Trash' },
  ];

  return (
    <aside
      className="flex h-full flex-shrink-0 flex-col overflow-hidden bg-[#0f1729] transition-all duration-300 ease-in-out"
      style={{ width: show ? 252 : 0 }}>
      <div style={{ width: 252, minWidth: 252 }} className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">L</div>
          <div>
            <div className="text-sm font-bold text-white">LabMate</div>
            <div className="text-[10px] text-[#8892b0]">Student Workspace</div>
          </div>
        </div>

        <nav className="px-3 pt-2">
          {navItems.map(item => (
            <button key={item.label}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors
                ${item.active ? 'bg-indigo-600 text-white' : 'text-[#8892b0] hover:bg-white/5 hover:text-white'}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        <div className="mt-2 flex-1 overflow-y-auto px-3">
          <button onClick={() => setLabOpen(o=>!o)}
            className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8892b0] hover:text-white">
            {labOpen ? <ChevronDown size={11}/> : <ChevronRight size={11}/>} Computer Science
          </button>
          {labOpen && (
            <div className="ml-3">
              <button onClick={() => setDbmsOpen(o=>!o)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-[#8892b0] hover:text-white">
                {dbmsOpen ? <ChevronDown size={10}/> : <ChevronRight size={10}/>} DBMS Lab
              </button>
              {dbmsOpen && ['Exp 1','Exp 2','Exp 3','Exp 4','Exp 5'].map((exp, i) => (
                <div key={exp}
                  className={`ml-4 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors
                    ${i===4 ? 'bg-indigo-600/20 font-medium text-indigo-300' : 'text-[#8892b0] hover:text-white'}`}>
                  <FileText size={9}/>{exp}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8892b0]">Files</span>
              <button className="rounded p-0.5 text-[#8892b0] hover:bg-white/10 hover:text-white"><Upload size={11}/></button>
            </div>
            {LIB_FILES.map(f => (
              <div key={f.id} className="relative"
                onMouseEnter={() => setHovered(f.id)} onMouseLeave={() => setHovered(null)}>
                <button onClick={() => onSelectFile(f.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors
                    ${selectedFile===f.id ? 'bg-white/10 text-white' : 'text-[#8892b0] hover:bg-white/5 hover:text-white'}`}>
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[8px] font-bold text-white ${f.bg}`}>{f.ext}</span>
                  <span className="truncate text-xs">{f.name}</span>
                </button>
                {hovered===f.id && (
                  <div className="absolute left-full top-0 z-50 ml-2 w-44 rounded-lg bg-[#1a2744] p-3 shadow-xl">
                    <p className="truncate text-xs font-medium text-white">{f.name}</p>
                    <p className="mt-1 text-[10px] text-[#8892b0]">Size: {f.size}</p>
                    <p className="text-[10px] text-[#8892b0]">Uploaded: {f.date}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-around border-t border-white/10 px-4 py-2.5">
          {[<HelpCircle size={15} key="help"/>, <Settings size={15} key="settings"/>].map((icon, i) => (
            <button key={i} className="rounded-lg p-2 text-[#8892b0] hover:bg-white/10 hover:text-white transition-colors">
              {icon}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PANEL
═══════════════════════════════════════════ */
function RightPanel({ show, activeTab, setActiveTab, messages, chatInput, setChatInput,
                      onlineUsers, currentUserId, onSendMessage }: {
  show: boolean;
  activeTab: 'collaboration'|'comments'; setActiveTab: (t: 'collaboration'|'comments') => void;
  messages: ChatMsg[];
  chatInput: string; setChatInput: (v: string) => void;
  onlineUsers: OnlineUser[]; currentUserId: string|null;
  onSendMessage: () => void;
}) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages.length]);

  return (
    <aside
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white transition-all duration-300 ease-in-out"
      style={{ width: show ? 300 : 0 }}>
      <div style={{ width: 300, minWidth: 300 }} className="flex h-full flex-col">
        <div className="flex border-b border-slate-100">
          {(['collaboration','comments'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors
                ${activeTab===tab ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab==='collaboration' ? 'Live' : 'Comments'}
            </button>
          ))}
        </div>

        {activeTab==='collaboration' ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* online users */}
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-700">Online ({onlineUsers.length})</span>
              </div>
              {onlineUsers.map(u => (
                <div key={u.id} className="mb-2 flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: u.color }}>{u.initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {u.displayName}{u.id===currentUserId && <span className="ml-1 font-normal text-slate-400">(You)</span>}
                    </p>
                    <p className="text-[10px]" style={{ color: u.color }}>{u.action}</p>
                  </div>
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: u.color }} />
                </div>
              ))}
              {onlineUsers.length===0 && <p className="text-xs text-slate-400">Connecting…</p>}
            </div>

            {/* chat */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-2">
                <span className="text-xs font-semibold text-slate-600">Chat</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {messages.map(m => (
                  <div key={m.id}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-slate-800">{m.author}</span>
                      <span className="text-[10px] text-slate-400">{m.time}</span>
                    </div>
                    <div className="rounded-xl rounded-tl-none bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">{m.text}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors focus-within:border-indigo-300 focus-within:bg-white">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),onSendMessage())}
                    placeholder="Message…"
                    className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" />
                  <button onClick={onSendMessage} className="text-indigo-500 hover:text-indigo-700 transition-colors"><Send size={13}/></button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-slate-400">No comments yet</p>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════
   SHARE MODAL
═══════════════════════════════════════════ */
function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2500);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[460px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-800">Invite collaborators</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl bg-indigo-50 px-4 py-3">
            <p className="text-xs font-semibold text-indigo-700">Share this link</p>
            <p className="mt-1 text-xs text-indigo-600 leading-relaxed">Anyone who opens this URL joins your live session with real-time cursors, text sync, and chat.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="flex-1 truncate font-mono text-xs text-slate-600">{shareUrl}</span>
            <button onClick={copyLink}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                ${copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              <Copy size={12}/>{copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            {[['🟢','Live cursors & presence'],['✏️','Real-time text sync'],['🎨','Font & shape sync'],['💬','Shared chat']].map(([e,t])=>(
              <div key={t as string} className="flex items-center gap-2"><span>{e}</span><span>{t}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-sm text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
      {message}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════ */
export default function LabMateApp() {
  const currentUser = useCurrentUser();
  const { projectId, pageTexts, pageShapes, totalPages, chatMessages, loading,
          savePage, saveChat, setPageTexts, setPageShapes, setTotalPages, setChatMessages,
  } = useProjectData(currentUser?.id ?? null, currentUser?.displayName ?? null);

  /* ── Editor state ── */
  const [currentPage,    setCurrentPage]    = useState(1);
  const [toolMode,       setToolMode]       = useState<ToolMode>('select');
  const [drawTool,       setDrawTool]       = useState<DrawTool | null>(null);
  const [strokeWidth,    setStrokeWidth]    = useState(2);
  const [shapeColor,     setShapeColor]     = useState('#1e293b');
  const [editorFont,     setEditorFont]     = useState('Poppins');
  const [editorFontSize, setEditorFontSize] = useState(12);

  /* ── UI state ── */
  const [showSidebar,    setShowSidebar]    = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [focusMode,      setFocusMode]      = useState(false);
  const [saveStatus,     setSaveStatus]     = useState<'saved'|'saving'>('saved');
  const [shareOpen,      setShareOpen]      = useState(false);
  const [exportOpen,     setExportOpen]     = useState(false);
  const [activeTab,      setActiveTab]      = useState<'collaboration'|'comments'>('collaboration');
  const [toastMsg,       setToastMsg]       = useState<string|null>(null);
  const [chatInput,      setChatInput]      = useState('');
  const [selectedFile,   setSelectedFile]   = useState<number|null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  /* ── Collab ── */
  const { onlineUsers, broadcastTextEdit, broadcastShapeEdit, broadcastChatMsg,
          broadcastFontChange, updatePresence,
  } = useRealtimeCollab(projectId, currentUser, {
    onRemoteTextEdit:  (page, html)   => setPageTexts(prev => ({ ...prev, [page]: html })),
    onRemoteShapeEdit: (page, shapes) => setPageShapes(prev => ({ ...prev, [page]: shapes as Shape[] })),
    onRemoteChatMsg:   (msg)          => setChatMessages(prev => [...prev, msg]),
    onRemoteFontChange:(font, size)   => { setEditorFont(font); setEditorFontSize(size); },
  });

  /* ── Cursor tracking ── */
  const lastCursorTs = useRef(0);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const now = Date.now();
      if (now - lastCursorTs.current < 300) return;
      lastCursorTs.current = now;
      const el = document.querySelector('.labmate-editor');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width)  * 100;
      const y = ((e.clientY - r.top)  / r.height) * 100;
      if (x>=0&&x<=100&&y>=0&&y<=100)
        updatePresence({ x, y }, `Page ${currentPage}`);
    }
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [currentPage, updatePresence]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement;
      if (el?.tagName==='INPUT'||el?.tagName==='TEXTAREA'||el?.isContentEditable) return;
      if (e.key==='f'||e.key==='F') setFocusMode(v => !v);
      if (e.key==='c'||e.key==='C') setShowRightPanel(v => !v);
      if (e.key==='Tab') { e.preventDefault(); setShowSidebar(v => !v); }
      if (e.key==='v'||e.key==='V') { setToolMode('select'); setDrawTool(null); }
      if (e.key==='t'||e.key==='T') { setToolMode('draw'); setDrawTool('text'); }
      if (e.key==='r'||e.key==='R') { setToolMode('draw'); setDrawTool('rect'); }
      if (e.key==='l'||e.key==='L') { setToolMode('draw'); setDrawTool('line'); }
      if (e.key==='d'||e.key==='D') { setToolMode('draw'); setDrawTool('double-line'); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Focus mode overrides panel visibility ── */
  const effectiveSidebar    = focusMode ? false : showSidebar;
  const effectiveRightPanel = focusMode ? false : showRightPanel;

  /* ── Save helpers ── */
  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => setSaveStatus('saved'), 1800);
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  /* ── Page data mutations ── */
  function updatePageShapes(page: number, fn: (prev: Shape[]) => Shape[]) {
    setPageShapes(prev => {
      const updated = fn(prev[page] ?? []);
      broadcastShapeEdit(page, updated);
      savePage(page, pageTexts[page] ?? '', updated);
      triggerSave();
      return { ...prev, [page]: updated };
    });
  }
  function updatePageText(page: number, html: string) {
    setPageTexts(prev => ({ ...prev, [page]: html }));
    broadcastTextEdit(page, html);
    savePage(page, html, pageShapes[page] ?? []);
    triggerSave();
  }
  function addPage() {
    const next = totalPages + 1;
    setTotalPages(next);
    setCurrentPage(next);
  }

  /* ── Tool handlers ── */
  function handleSelectTool() { setToolMode('select'); setDrawTool(null); }
  function handleDrawTool(t: DrawTool) { setToolMode('draw'); setDrawTool(t); }
  function handleDrawComplete() { setToolMode('select'); setDrawTool(null); }

  /* ── Font handlers ── */
  function handleFontChange(font: string) {
    setEditorFont(font);
    broadcastFontChange(font, editorFontSize);
  }
  function handleFontSizeChange(size: number) {
    setEditorFontSize(size);
    broadcastFontChange(editorFont, size);
  }

  /* ── Formatting ── */
  function handleFormat(cmd: string, val?: string) {
    if (cmd === 'createLink') {
      const url = window.prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(cmd, false, val);
    }
  }

  /* ── PDF export ── */
  async function exportPDF() {
    showToast('Preparing PDF…');
    try {
      const pages = Array.from({length: totalPages}, (_,i) => i+1);
      const pagesHtml = pages.map(p => {
        const svgShapes = (pageShapes[p] ?? []).map(shapeToSvgString).join('');
        return `
          <div style="width:${A4_W}px;min-height:${A4_H}px;background:white;position:relative;page-break-after:always;box-sizing:border-box;">
            <div style="position:absolute;inset:0;padding:48px 56px;font-family:${editorFont},sans-serif;font-size:${editorFontSize}pt;line-height:1.85;color:#1e293b;z-index:1">
              ${pageTexts[p] ?? ''}
            </div>
            <svg width="${A4_W}" height="${A4_H}" style="position:absolute;top:0;left:0;z-index:2;overflow:visible;">
              ${svgShapes}
            </svg>
            <div style="position:absolute;bottom:12px;right:16px;font-size:9px;color:#e2e8f0;z-index:3">${p}/${totalPages}</div>
          </div>`;
      }).join('');

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;background:white;';
      wrapper.innerHTML = pagesHtml;
      document.body.appendChild(wrapper);

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 0,
        filename: 'lab-record.pdf',
        image: { type:'jpeg', quality:0.98 },
        html2canvas: { scale:2, useCORS:true, width:A4_W, backgroundColor:'#ffffff' },
        jsPDF: { unit:'px', format:[A4_W, A4_H], orientation:'portrait' },
      }).from(wrapper).save();

      document.body.removeChild(wrapper);
      showToast('PDF downloaded ✓');
    } catch {
      showToast('Export failed — try Print instead');
    }
  }

  /* ── DOCX export ── */
  function exportDOCX() {
    const pages = Array.from({length: totalPages}, (_,i) => i+1);
    const body  = pages.map(p =>
      `<div style="width:${A4_W}px;min-height:${A4_H}px;padding:48px 56px;background:white;page-break-after:always;">
        <h4 style="color:#94a3b8;font-size:10pt;margin:0 0 8px">Page ${p}</h4>
        ${pageTexts[p] ?? ''}
      </div>`
    ).join('');
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset="utf-8"><title>Lab Record</title>
      <style>body{font-family:${editorFont},Calibri,sans-serif;font-size:${editorFontSize}pt}</style></head>
      <body>${body}</body></html>`;
    const blob = new Blob(['﻿', html], { type:'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download='LabRecord.doc';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('DOCX downloaded ✓');
  }

  function handleExport(label: string) {
    if (label==='Print')          { window.print(); return; }
    if (label==='Export as PDF')  { exportPDF(); return; }
    if (label==='Export as DOCX') { exportDOCX(); }
  }

  /* ── Chat ── */
  function handleSendMessage() {
    if (!chatInput.trim() || !currentUser) return;
    const now = new Date();
    const msg: ChatMsg = {
      id: `${Date.now()}-${Math.random()}`,
      authorId: currentUser.id,
      author: currentUser.displayName,
      time: now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
      text: chatInput.trim(),
      reactions: 0,
    };
    setChatMessages(prev => [...prev, msg]);
    broadcastChatMsg(msg);
    saveChat(msg);
    setChatInput('');
  }

  /* ── Loading ── */
  if (loading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1729]" style={{fontFamily:'Poppins,sans-serif'}}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400">Loading LabMate…</p>
        </div>
      </div>
    );
  }

  const currentUserInitials = currentUser.initials || 'U';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .labmate-editor:empty::before {
          content: attr(data-placeholder);
          color: #cbd5e1;
          font-style: italic;
          pointer-events: none;
        }
        @media print {
          body > *:not(#print-area) { display: none !important; }
        }
      `}</style>

      <div className="flex h-screen flex-col overflow-hidden bg-slate-100" style={{fontFamily:'Poppins,sans-serif'}}>
        {/* Top bar — always visible */}
        <TopBar
          saveStatus={saveStatus}
          onShare={() => setShareOpen(true)}
          onExport={handleExport}
          exportOpen={exportOpen}
          setExportOpen={setExportOpen}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(v=>!v)}
          showRightPanel={showRightPanel}
          onToggleRightPanel={() => setShowRightPanel(v=>!v)}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode(v=>!v)}
          onlineUsers={onlineUsers}
          currentUserInitials={currentUserInitials}
        />

        {/* Toolbar — always visible */}
        <Toolbar
          onFormat={handleFormat}
          toolMode={toolMode}
          drawTool={drawTool}
          onSelectTool={handleSelectTool}
          onDrawTool={handleDrawTool}
          strokeWidth={strokeWidth}
          onStrokeChange={setStrokeWidth}
          shapeColor={shapeColor}
          onColorChange={setShapeColor}
          editorFont={editorFont}
          onFontChange={handleFontChange}
          editorFontSize={editorFontSize}
          onFontSizeChange={handleFontSizeChange}
        />

        {/* Main three-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — slides */}
          <LeftSidebar show={effectiveSidebar} selectedFile={selectedFile} onSelectFile={setSelectedFile} />

          {/* Center — page thumbnails + canvas */}
          <div className="flex flex-1 overflow-hidden">
            {!focusMode && (
              <PageThumbnails
                current={currentPage}
                total={totalPages}
                onSelect={setCurrentPage}
                onAdd={addPage}
              />
            )}

            {/* scrollable canvas area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
              {/* A4 canvas — key forces remount on page switch */}
              <A4Canvas
                key={currentPage}
                pageNum={currentPage}
                totalPages={totalPages}
                text={pageTexts[currentPage] ?? ''}
                onTextChange={html => updatePageText(currentPage, html)}
                shapes={pageShapes[currentPage] ?? []}
                onShapesChange={fn => updatePageShapes(currentPage, fn)}
                toolMode={toolMode}
                drawTool={drawTool}
                onDrawComplete={handleDrawComplete}
                strokeWidth={strokeWidth}
                shapeColor={shapeColor}
                editorFont={editorFont}
                editorFontSize={editorFontSize}
                onEdit={triggerSave}
                onlineUsers={onlineUsers}
                currentUserId={currentUser.id}
              />

              {/* page navigation */}
              <div className="mx-auto mt-4 flex items-center justify-between" style={{maxWidth:A4_W}}>
                <button onClick={() => setCurrentPage(Math.max(1,currentPage-1))} disabled={currentPage===1}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white hover:shadow-sm disabled:opacity-30">
                  <ChevronLeft size={13}/> Prev
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={addPage}
                    className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50">
                    <Plus size={11}/> Add page
                  </button>
                  <span className="text-xs text-slate-400">{currentPage} / {totalPages}</span>
                </div>
                <button onClick={() => setCurrentPage(Math.min(totalPages,currentPage+1))} disabled={currentPage===totalPages}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white hover:shadow-sm disabled:opacity-30">
                  Next <ChevronRight size={13}/>
                </button>
              </div>
            </div>
          </div>

          {/* Right panel — slides */}
          <RightPanel
            show={effectiveRightPanel}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            messages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onlineUsers={onlineUsers}
            currentUserId={currentUser.id}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      {/* Focus mode hint */}
      {focusMode && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-slate-900/80 backdrop-blur px-4 py-2 text-xs text-slate-300 shadow-xl">
          Focus mode — press <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[10px]">F</kbd> to exit
        </div>
      )}

      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}
      {toastMsg  && <Toast message={toastMsg} />}
    </>
  );
}
