/**
 * 萌宝截图 - 完整标注版
 * 功能：全屏截图 + 选区 + 标注（矩形/椭圆/箭头/画笔/文字/马赛克）+ 撤销重做 + 复制/保存
 */
import { useMount } from "ahooks";
import { invoke } from "@tauri-apps/api/core";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { writeImage } from "tauri-plugin-clipboard-x-api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Tool = "select" | "rect" | "ellipse" | "arrow" | "pen" | "text" | "mosaic";

type Shape =
  | { type: "rect"; x: number; y: number; w: number; h: number; color: string; width: number }
  | { type: "ellipse"; x: number; y: number; w: number; h: number; color: string; width: number }
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: "pen"; points: { x: number; y: number }[]; color: string; width: number }
  | { type: "text"; x: number; y: number; text: string; color: string; size: number }
  | { type: "mosaic"; x: number; y: number; w: number; h: number };

// ---- 工具按钮 ----
const ToolBtn = ({ label, onClick, active, primary, disabled }: {
  label: string; onClick?: () => void; active?: boolean; primary?: boolean; disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "6px 14px",
      borderRadius: 5,
      border: active ? "2px solid #1677ff" : "1px solid #555",
      background: primary ? "#1677ff" : active ? "#e6f4ff" : "rgba(30,30,30,0.85)",
      color: primary || active ? "#fff" : "#ddd",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: 13,
      fontWeight: active ? "bold" : "normal",
      opacity: disabled ? 0.4 : 1,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

// ---- 箭头绘制辅助 ----
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number) {
  const headLen = Math.max(12, width * 3);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const x3 = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const y3 = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const x4 = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const y4 = y2 - headLen * Math.sin(angle + Math.PI / 6);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

// ---- 马赛克 ----
function applyMosaic(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  if (!img) return;
  const blockSize = 10;
  const sx = Math.round((x / (ctx.canvas?.width ?? img.width)) * img.width);
  const sy = Math.round((y / (ctx.canvas?.height ?? img.height)) * img.height);
  const sw = Math.round((w / (ctx.canvas?.width ?? img.width)) * img.width);
  const sh = Math.round((h / (ctx.canvas?.height ?? img.height)) * img.height);
  // 创建临时 canvas 取原图像素
  const tc = document.createElement("canvas");
  tc.width = sw;
  tc.height = sh;
  const tx = tc.getContext("2d");
  if (!tx) return;
  tx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const data = tx.getImageData(0, 0, sw, sh).data;

  for (let by = 0; by < sh; by += blockSize) {
    for (let bx = 0; bx < sw; bx += blockSize) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let py = by; py < Math.min(by + blockSize, sh); py++) {
        for (let px = bx; px < Math.min(bx + blockSize, sw); px++) {
          const idx = (py * sw + px) * 4;
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
          count++;
        }
      }
      ctx.fillStyle = `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`;
      // 映射回 canvas 坐标
      const cx = x + (bx / sw) * w;
      const cy = y + (by / sh) * h;
      const cw = (Math.min(bx + blockSize, sw) - bx) / sw * w;
      const ch = (Math.min(by + blockSize, sh) - by) / sh * h;
      ctx.fillRect(cx, cy, cw, ch);
    }
  }
}

// ---- 控制点位置 ----
function handlePoints(s: Rect) {
  const { x, y, w, h } = s;
  return [
    { x: x, y: y }, { x: x + w / 2, y: y }, { x: x + w, y: y },
    { x: x, y: y + h / 2 }, { x: x + w, y: y + h / 2 },
    { x: x, y: y + h }, { x: x + w / 2, y: y + h }, { x: x + w, y: y + h },
  ];
}

const Screenshot = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgRef = useRef<HTMLImageElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const annoRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);
  const [selRef, setSelRef] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [selecting, setSelecting] = useState(false);
  const [startPt, setStartPt] = useState({ x: 0, y: 0 });
  const currentShapeRef = useRef<Shape | null>(null);
  const selRectRef = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const draggedRef = useRef(false);

  // 绘制单个 shape 到指定 context
  const paintShape = useCallback((ctx: CanvasRenderingContext2D, s: Shape) => {
    ctx.save();
    ctx.strokeStyle = "color" in s ? s.color : "#ff0000";
    ctx.lineWidth = "width" in s ? (s as { width: number }).width : strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (s.type) {
      case "rect":
        ctx.strokeRect(s.x, s.y, s.w, s.h);
        break;
      case "ellipse":
        ctx.beginPath();
        ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.max(1, Math.abs(s.w / 2)), Math.max(1, Math.abs(s.h / 2)), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "arrow":
        drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, (s as { width?: number }).width ?? strokeWidth);
        break;
      case "pen": {
        const pts = s.points;
        if (pts.length > 0) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
        break;
      }
      case "text":
        ctx.fillStyle = s.color; ctx.font = `${s.size}px sans-serif`; ctx.textBaseline = "top"; ctx.fillText(s.text, s.x, s.y);
        break;
      case "mosaic":
        applyMosaic(ctx, imgRef.current, s.x, s.y, s.w, s.h);
        break;
    }
    ctx.restore();
  }, [color, strokeWidth]);

  // 重绘离屏标注图层
  const redrawAnno = useCallback(() => {
    const a = annoRef.current;
    if (!a) return;
    const ax = a.getContext("2d");
    if (!ax) return;
    ax.clearRect(0, 0, a.width, a.height);
    shapes.forEach((s) => paintShape(ax, s));
  }, [shapes, paintShape]);

  useEffect(() => { redrawAnno(); draw(); }, [shapes, redrawAnno]);

  // 主绘制
  const draw = useCallback(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);

    const s = selRectRef.current;
    if (s && s.w > 0 && s.h > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fill("evenodd");
      ctx.setLineDash([6, 4]); ctx.strokeStyle = "#1677ff"; ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.restore();
    }

    if (annoRef.current) ctx.drawImage(annoRef.current, 0, 0, W, H);
    if (currentShapeRef.current) paintShape(ctx, currentShapeRef.current);

    if (tool === "select" && s && s.w > 0 && s.h > 0) {
      ctx.fillStyle = "#1677ff";
      handlePoints(s).forEach(p => ctx.fillRect(p.x - 4, p.y - 4, 8, 8));
    }
  }, [paintShape, tool]);

  // 加载截图
  useMount(() => {
    (async () => {
      try {
        const path: string = await invoke("get_screenshot_path");
        const buf = await readFile(path);
        if (buf.byteLength === 0) { setError("截图文件为空"); setLoading(false); return; }

        const blob = new Blob([buf as BlobPart], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          imgRef.current = img;
          const c = canvasRef.current;
          if (c) { c.width = img.naturalWidth; c.height = img.naturalHeight; }
          const a = document.createElement("canvas");
          a.width = img.naturalWidth; a.height = img.naturalHeight;
          annoRef.current = a;
          if (bgImgRef.current) bgImgRef.current.src = url;
          setLoading(false);
          draw();
        };
        img.onerror = () => { setError("图片解码失败"); setLoading(false); };
        img.src = url;
      } catch (e) {
        setError("加载失败：" + (e instanceof Error ? e.message : String(e)));
        setLoading(false);
      }
    })();
  });

  // Esc 关闭
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // 鼠标坐标转换
  const toCanvas = (e: ReactMouseEvent): { x: number; y: number } => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };

  // 提交当前 shape
  const commitShape = (sh: Shape) => { setShapes(prev => [...prev, sh]); setRedoStack([]); };

  // 判断空 shape
  const isEmptyShape = (sh: Shape): boolean => {
    switch (sh.type) {
      case "rect": case "ellipse": case "mosaic": return sh.w <= 0 || sh.h <= 0;
      case "arrow": return Math.abs(sh.x2 - sh.x1) < 2 && Math.abs(sh.y2 - sh.y1) < 2;
      case "pen": return sh.points.length < 2;
      case "text": return !sh.text;
      default: return false;
    }
  };

  // --- 鼠标事件 ---
  const onDown = (e: ReactMouseEvent) => {
    const p = toCanvas(e);
    setStartPt(p);
    setSelecting(true);

    if (tool === "select") {
      // 只记录起点，暂不清空已有选区——避免双击的 mousedown 破坏选区
      // 真正的新选区在 onMove 拖动时才建立
      draggedRef.current = false;
    } else if (tool === "pen") {
      currentShapeRef.current = { type: "pen", points: [p], color, width: strokeWidth };
    } else if (tool === "text") {
      const txt = prompt("请输入文字：");
      if (txt) commitShape({ type: "text", x: p.x, y: p.y, text: txt, color, size: 16 + strokeWidth * 4 });
      setSelecting(false);
    } else if (tool === "mosaic") {
      currentShapeRef.current = { type: "mosaic", x: p.x, y: p.y, w: 0, h: 0 };
    } else {
      // rect / ellipse / arrow
      currentShapeRef.current = { type: tool, x: p.x, y: p.y,
        ...(tool === "arrow" ? { x1: p.x, y1: p.y, x2: p.x, y2: p.y } : { w: 0, h: 0 }),
        color, width: strokeWidth };
    }
  };

  const onMove = (e: ReactMouseEvent) => {
    if (!selecting) return;
    const p = toCanvas(e);

    if (tool === "select") {
      draggedRef.current = true;
      selRectRef.current = { x: startPt.x, y: startPt.y, w: p.x - startPt.x, h: p.y - startPt.y };
      setSelRef(selRectRef.current);
      draw();
      return;
    }
    const s = currentShapeRef.current;
    if (!s) return;

    if (tool === "pen") {
      (s as { points: {x:number;y:number}[] }).points.push(p);
    } else if (tool === "rect" || tool === "ellipse" || tool === "mosaic") {
      s.w = p.x - startPt.x; s.h = p.y - startPt.y;
    } else if (tool === "arrow") {
      (s as {x2:number;y2:number}).x2 = p.x; (s as {x2:number;y2:number}).y2 = p.y;
    }
    draw();
  };

  const onUp = () => {
    setSelecting(false);
    if (currentShapeRef.current && !isEmptyShape(currentShapeRef.current)) {
      commitShape(currentShapeRef.current);
    }
    currentShapeRef.current = null;
  };

  // 撤销/重做
  const undo = () => {
    setShapes(prev => { if (prev.length > 0) { setRedoStack(rs => [...rs, prev]); return prev.slice(0, -1); } return prev; });
  };
  const redo = () => {
    setRedoStack(prev => { if (prev.length > 0) { const top = prev[prev.length - 1]; setShapes(top); return prev.slice(0, -1); } return prev; });
  };

  // 导出选区（从原图 + 标注层干净合成，不含选区遮罩/控制点）
  const exportSelected = async (): Promise<Blob | null> => {
    const img = imgRef.current;
    const c = canvasRef.current;
    if (!img || !c) return null;

    const s = selRectRef.current;
    // 归一化选区，支持从任意方向拖动（右下→左上时 w/h 为负）
    const nx = s.w < 0 ? s.x + s.w : s.x;
    const ny = s.h < 0 ? s.y + s.h : s.y;
    const nw = Math.abs(s.w);
    const nh = Math.abs(s.h);

    // canvas.width 已设为原图 naturalWidth，selRect 坐标即原图像素坐标（1:1）
    if (nw < 1 || nh < 1) {
      // 无有效选区 → 导出整张（原图 + 标注）
      const fc = document.createElement("canvas");
      fc.width = c.width;
      fc.height = c.height;
      const fx = fc.getContext("2d");
      if (!fx) return null;
      fx.drawImage(img, 0, 0, c.width, c.height);
      if (annoRef.current) fx.drawImage(annoRef.current, 0, 0, c.width, c.height);
      return new Promise<Blob | null>((r) => fc.toBlob(r, "image/png"));
    }

    const ec = document.createElement("canvas");
    ec.width = Math.round(nw);
    ec.height = Math.round(nh);
    const ex = ec.getContext("2d");
    if (!ex) return null;
    // 从原图裁剪选区（干净，无遮罩/控制点）
    ex.drawImage(img, Math.round(nx), Math.round(ny), Math.round(nw), Math.round(nh), 0, 0, ec.width, ec.height);
    // 叠加选区内的标注
    if (annoRef.current) {
      ex.drawImage(annoRef.current, Math.round(nx), Math.round(ny), Math.round(nw), Math.round(nh), 0, 0, ec.width, ec.height);
    }
    return new Promise<Blob | null>((r) => ec.toBlob(r, "image/png"));
  };

  // 复制到剪贴板（双击选区触发）
  const copy = async () => {
    try {
      const blob = await exportSelected();
      if (!blob) return;
      // 用截图目录的绝对路径写临时文件，避免 Tauri 下相对路径位置不确定
      const srcPath: string = await invoke("get_screenshot_path");
      const outPath = srcPath.replace(/\.png$/i, "_out.png");
      await writeFile(outPath, new Uint8Array(await blob.arrayBuffer()));
      await writeImage(outPath);
      // 复制成功后关闭截图窗口
      await invoke("finish_screenshot");
    } catch (e) { setError("复制失败：" + String(e)); }
  };

  // 保存到文件
  const saveToFile = async () => {
    try {
      const blob = await exportSelected();
      if (!blob) return;
      const path = await save({ defaultPath: "screenshot.png" });
      if (!path) return;
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    } catch (e) { setError("保存失败：" + String(e)); }
  };

  const cancel = () => { invoke("finish_screenshot"); };

  const palette = ["#ff0000", "#ffd400", "#00d000", "#1677ff", "#ffffff", "#000000"];

  const centerBox: React.CSSProperties = { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 100 };

  const toolbarStyle: React.CSSProperties = {
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 8,
    background: "rgba(20,20,20,0.9)", backdropFilter: "blur(10px)", zIndex: 50,
  };
  const divider: React.CSSProperties = { width: 1, height: 24, background: "#444", margin: "0 6px" };

  return (
    <div style={{ position: "fixed", inset: 0, margin: 0, padding: 0, background: "#000" }}>
      {/* 底层原图 */}
      <img ref={bgImgRef as unknown as React.RefObject<HTMLImageElement>} alt="bg"
        style={{ position: "absolute", inset: 0, width: "100vw", height: "100vh", objectFit: "contain", pointerEvents: "none" }} />
      {/* 主 canvas */}
      <canvas ref={canvasRef} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onDoubleClick={copy}
        style={{ position: "absolute", inset: 0, width: "100vw", height: "100vh", display: "block", cursor: "crosshair" }} />

      {/* 加载中 */}
      {loading && !error && (<div style={{ ...centerBox, fontSize: 24, color: "#1890ff", background: "rgba(0,0,0,0.9)", padding: "32px 48px", borderRadius: 8 }}>
        ⏳ 正在加载截图...<br /><span style={{ fontSize: 14, color: "#888", marginTop: 8, display: "block" }}>按 Esc 可关闭</span>
      </div>)}

      {/* 错误 */}
      {error && (<div style={{ ...centerBox, fontSize: 16, color: "#ff4d4f", background: "rgba(0,0,0,0.95)", padding: "24px", borderRadius: 8, maxWidth: "80vw" }}>
        ❌ {error}<br />
        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center" }}>
          <ToolBtn label="关闭 (Esc)" onClick={cancel} />
          <ToolBtn label="重试" onClick={() => window.location.reload()} primary />
        </div>
      </div>)}

      {/* 工具栏 */}
      {!loading && !error && (<div style={toolbarStyle}>
        <ToolBtn label="选择" active={tool==="select"} onClick={()=>setTool("select")} />
        <ToolBtn label="矩形" active={tool==="rect"} onClick={()=>setTool("rect")} />
        <ToolBtn label="椭圆" active={tool==="ellipse"} onClick={()=>setTool("ellipse")} />
        <ToolBtn label="箭头" active={tool==="arrow"} onClick={()=>setTool("arrow")} />
        <ToolBtn label="画笔" active={tool==="pen"} onClick={()=>setTool("pen")} />
        <ToolBtn label="文字" active={tool==="text"} onClick={()=>setTool("text")} />
        <ToolBtn label="马赛克" active={tool==="mosaic"} onClick={()=>setTool("mosaic")} />
        <span style={divider} />
        <ToolBtn label="撤销" onClick={undo} disabled={shapes.length===0} />
        <ToolBtn label="重做" onClick={redo} disabled={redoStack.length===0} />
        <span style={divider} />
        {palette.map(c => <button key={c} onClick={()=>setColor(c)} style={{
          width: 22, height: 22, borderRadius: "50%",
          border: color===c?"2px solid #fff":"1px solid #666", background: c, cursor: "pointer"
        }} />)}
        <span style={divider} />
        {[2, 4, 8].map(w => <button key={w} onClick={()=>setStrokeWidth(w)} style={{
          padding: "2px 8px", borderRadius: 4, border: strokeWidth===w?"2px solid #1677ff":"1px solid #555",
          background: strokeWidth===w?"#1677ff":"transparent", color: strokeWidth===w?"#fff":"#ccc", cursor: "pointer", fontSize: 12,
        }}>{w}</button>)}
        <span style={divider} />
        <ToolBtn label="复制" onClick={copy} primary />
        <ToolBtn label="保存" onClick={saveToFile} />
        <ToolBtn label="取消 (Esc)" onClick={cancel} />
      </div>)}
    </div>
  );
};

export default Screenshot;
