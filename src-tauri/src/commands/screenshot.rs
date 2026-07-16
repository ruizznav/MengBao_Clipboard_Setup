use std::{fs::File, path::PathBuf};

use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits,
    GetDeviceCaps, GetDC, GetWindowDC, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER,
    BI_RGB, DIB_RGB_COLORS, HORZRES, SRCCOPY, VERTRES,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetDesktopWindow, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
    SM_YVIRTUALSCREEN, GetSystemMetrics,
};

pub const SCREENSHOT_WINDOW_LABEL: &str = "screenshot";
pub const SCREENSHOT_FILE: &str = "mengbao_screenshot.png";

/// 截取整个虚拟屏幕，保存为 PNG 文件（GDI BitBlt + image crate PNG 编码）
fn capture_screen() -> Result<String, String> {
    unsafe {
        let screen_left = GetSystemMetrics(SM_XVIRTUALSCREEN);
        let screen_top = GetSystemMetrics(SM_YVIRTUALSCREEN);
        let screen_width = GetSystemMetrics(SM_CXVIRTUALSCREEN);
        let screen_height = GetSystemMetrics(SM_CYVIRTUALSCREEN);

        eprintln!(
            "[screenshot] virtual screen: {}x{} @ ({},{})",
            screen_width, screen_height, screen_left, screen_top
        );

        if screen_width <= 0 || screen_height <= 0 {
            return Err(format!("获取屏幕尺寸失败: {}x{}", screen_width, screen_height));
        }

        // 方案 A：使用 GetDesktopWindow + GetWindowDC（比 GetDC(None) 更可靠）
        let h_wnd = GetDesktopWindow();
        let h_dc = GetWindowDC(h_wnd);
        if h_dc.is_invalid() {
            // fallback 到 GetDC(None)
            eprintln!("[screenshot] GetWindowDC 失败，回退到 GetDC");
            let h_dc2 = GetDC(None);
            if h_dc2.is_invalid() {
                return Err("获取屏幕 DC 失败（两种方式都失败）".into());
            }
            do_capture(h_dc2, screen_width, screen_height, screen_left, screen_top)
        } else {
            do_capture(h_dc, screen_width, screen_height, screen_left, screen_top)
        }
    }
}

fn do_capture(
    h_dc: windows::Win32::Graphics::Gdi::HDC,
    screen_width: i32,
    screen_height: i32,
    screen_left: i32,
    screen_top: i32,
) -> Result<String, String> {
    unsafe {
        let h_mem_dc = CreateCompatibleDC(h_dc);
        if h_mem_dc.is_invalid() {
            ReleaseDC(None, h_dc);
            return Err("CreateCompatibleDC 失败".into());
        }

        let h_bitmap = CreateCompatibleBitmap(h_dc, screen_width, screen_height);

        // 验证 bitmap 是否创建成功（兼容位图可能因过大而失败）
        if h_bitmap.is_invalid() {
            eprintln!(
                "[screenshot] CreateCompatibleBitmap({}x{}) 可能失败，尝试单显示器",
                screen_width, screen_height
            );
            // fallback: 只截主显示器
            let primary_w = GetDeviceCaps(h_dc, HORZRES);
            let primary_h = GetDeviceCaps(h_dc, VERTRES);
            let h_bmp2 = CreateCompatibleBitmap(h_dc, primary_w, primary_h);
            if h_bmp2.is_invalid() {
                let _ = DeleteDC(h_mem_dc);
                ReleaseDC(None, h_dc);
                return Err(format!("CreateCompatibleBitmap 失败 (虚拟屏{}x{}, 主屏{}x{})",
                    screen_width, screen_height, primary_w, primary_h));
            }
            // 用新的 bitmap 和主屏尺寸重新做
            let _ = DeleteObject(h_bitmap);
            // 注意：这里简化为只截左上角主屏区域
            let result = do_capture_single(h_dc, h_mem_dc, h_bmp2, primary_w, primary_h, 0, 0);
            let _ = DeleteDC(h_mem_dc);
            ReleaseDC(None, h_dc);
            return result;
        }

        let old_bitmap = SelectObject(h_mem_dc, h_bitmap);

        // 执行 BitBlt（核心截图操作）
        let bitblt_result = BitBlt(
            h_mem_dc,
            0,
            0,
            screen_width,
            screen_height,
            h_dc,
            screen_left,
            screen_top,
            SRCCOPY,
        );
        eprintln!("[screenshot] BitBlt result: {:?}", bitblt_result);

        // 用正高度（bottom-up，标准 BMP 格式），更可靠
        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = screen_width;
        bmi.bmiHeader.biHeight = screen_height; // 正数 = bottom-up
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 24; // 24bpp RGB（无 padding 的像素格式）
        bmi.bmiHeader.biCompression = BI_RGB.0;

        let row_size = ((screen_width as u32 * 3 + 3) & !3) as usize; // 每行 4 字节对齐
        let buf_size = row_size * (screen_height as usize);
        let mut buf: Vec<u8> = vec![0u8; buf_size];

        let dibits_result = GetDIBits(
            h_mem_dc,
            h_bitmap,
            0,
            screen_height as u32,
            Some(buf.as_mut_ptr() as *mut core::ffi::c_void),
            &mut bmi,
            DIB_RGB_COLORS,
        );
        eprintln!("[screenshot] GetDIBits: 扫描了 {} 行", dibits_result);

        // 检查数据：采样几个位置看是否全黑
        let mid_idx = (buf_size / 2) as isize;
        let sample_r = if buf.len() > (mid_idx + 2) as usize { buf[mid_idx as usize + 2] } else { 0 };
        let sample_g = if buf.len() > (mid_idx + 1) as usize { buf[mid_idx as usize + 1] } else { 0 };
        let sample_b = if buf.len() > mid_idx as usize { buf[mid_idx as usize] } else { 0 };
        eprintln!("[screenshot] 中间像素 RGB=({},{},{}) 大小={}bytes", sample_r, sample_g, sample_b, buf.len());

        // 清理 GDI 资源（先清理 DC，bitmap 数据已在 buf 中）
        SelectObject(h_mem_dc, old_bitmap);
        let _ = DeleteObject(h_bitmap);
        let _ = DeleteDC(h_mem_dc);
        ReleaseDC(None, h_dc);

        // 用 image crate 编码为 PNG（BGRA→RGBA 翻转 + 行对齐处理）
        let path: PathBuf = std::env::temp_dir().join(SCREENSHOT_FILE);
        write_png(&path, &buf, screen_width, screen_height, row_size)?;

        eprintln!("[screenshot] PNG 已保存到: {} ({}bytes)", path.display(), buf.len());
        Ok(path.to_string_lossy().to_string())
    }
}

fn do_capture_single(
    h_dc: windows::Win32::Graphics::Gdi::HDC,
    h_mem_dc: windows::Win32::Graphics::Gdi::HDC,
    h_bitmap: windows::Win32::Graphics::Gdi::HBITMAP,
    width: i32,
    height: i32,
    left: i32,
    top: i32,
) -> Result<String, String> {
    unsafe {
        let old_bitmap = SelectObject(h_mem_dc, h_bitmap);
        let _ = BitBlt(h_mem_dc, 0, 0, width, height, h_dc, left, top, SRCCOPY);

        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = width;
        bmi.bmiHeader.biHeight = height;
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 24;
        bmi.bmiHeader.biCompression = BI_RGB.0;

        let row_size = ((width as u32 * 3 + 3) & !3) as usize;
        let buf_size = row_size * (height as usize);
        let mut buf: Vec<u8> = vec![0u8; buf_size];

        let _ = GetDIBits(
            h_mem_dc, h_bitmap, 0, height as u32,
            Some(buf.as_mut_ptr() as *mut core::ffi::c_void),
            &mut bmi, DIB_RGB_COLORS,
        );

        SelectObject(h_mem_dc, old_bitmap);
        let _ = DeleteObject(h_bitmap);
        let _ = DeleteDC(h_mem_dc);

        let path: PathBuf = std::env::temp_dir().join(SCREENSHOT_FILE);
        write_png(&path, &buf, width, height, row_size)?;
        Ok(path.to_string_lossy().to_string())
    }
}

/// 将 BGR 像素数据（bottom-up，行对齐）编码为 PNG 文件
fn write_png(path: &PathBuf, bgr_data: &[u8], width: i32, height: i32, row_size: usize) -> Result<(), String> {
    let w = width as u32;
    let h = height as u32;

    // GDI 给的是 bottom-up BGR，需要翻转成 top-down RGBA 给 image crate
    let mut rgba_data = vec![0u8; (w * h * 4) as usize];
    for y in 0..h {
        // bottom-up: BMP 最后一行在文件开头
        let src_row = (h - 1 - y) as usize;
        let dst_row = y as usize;
        for x in 0..w {
            let src_idx = src_row * row_size + (x as usize) * 3;
            let dst_idx = dst_row * (w as usize) * 4 + (x as usize) * 4;
            if src_idx + 2 < bgr_data.len() && dst_idx + 3 < rgba_data.len() {
                rgba_data[dst_idx]     = bgr_data[src_idx + 2]; // R
                rgba_data[dst_idx + 1] = bgr_data[src_idx + 1]; // G
                rgba_data[dst_idx + 2] = bgr_data[src_idx];     // B
                rgba_data[dst_idx + 3] = 255;                   // A
            }
        }
    }

    let img: image::ImageBuffer<image::Rgba<u8>, Vec<u8>> =
        image::ImageBuffer::from_raw(w, h, rgba_data)
            .ok_or_else(|| "创建 ImageBuffer 失败".to_string())?;

    img.save(path)
        .map_err(|e| format!("PNG 保存失败: {}", e))?;

    Ok(())
}

/// 返回截图文件的固定临时路径
#[tauri::command]
pub fn get_screenshot_path() -> Result<String, String> {
    let path: PathBuf = std::env::temp_dir().join(SCREENSHOT_FILE);
    Ok(path.to_string_lossy().to_string())
}

/// 开始截图：
/// 1. 强制清理残留的旧截图窗口（destroy 是异步的，需等待完成）
/// 2. 创建全屏透明截图窗口
/// 3. 隐藏主窗口
/// 4. 截屏
#[tauri::command]
pub async fn start_screenshot(app: AppHandle) -> Result<(), String> {
    // 0. 强制清理残留的旧截图窗口（destroy 异步，需等待释放 + 重试）
    for attempt in 0..5 {
        if let Some(existing) = app.get_webview_window(SCREENSHOT_WINDOW_LABEL) {
            eprintln!("[screenshot] 发现残留截图窗口，第{}次销毁...", attempt + 1);
            let _ = existing.destroy();
            // 同步等待异步销毁完成（Tauri 内部需时间释放 webview 标签）
            std::thread::sleep(std::time::Duration::from_millis(200));
        } else {
            eprintln!("[screenshot] 第{}次检查：无残留窗口", attempt + 1);
            break; // 已干净，无需继续
        }
    }

    // 二次确认：如果仍然存在，报错而不是覆盖崩溃
    if app.get_webview_window(SCREENSHOT_WINDOW_LABEL).is_some() {
        return Err("截图窗口清理失败：旧窗口无法销毁，请重启应用".into());
    }

    // 1. 创建全屏透明截图窗口（transparent：首帧透出桌面，绝不白闪）
    //    visible(true) 立即显示，全屏覆盖主窗口与桌面
    let win = WebviewWindowBuilder::new(
        &app,
        SCREENSHOT_WINDOW_LABEL,
        tauri::WebviewUrl::App("screenshot.html".into()),
    )
    .title("萌宝截图")
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .fullscreen(true)
    .shadow(false)
    .visible(true)
    .build()
    .map_err(|e| format!("创建截图窗口失败: {}", e))?;

    // 2. 隐藏主窗口（已被全屏透明窗覆盖；透明窗透出桌面，屏幕上始终有内容，无桌面间隙闪）
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }

    // 3. 截屏（主窗口此刻已隐藏，截到的图不含主窗口残影）
    match capture_screen() {
        Ok(_p) => Ok(()),
        Err(e) => {
            // 截屏失败，恢复主窗口可见，避免主窗口一直隐藏
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
            }
            Err(e)
        }
    }
}

/// 结束截图
#[tauri::command]
pub async fn finish_screenshot(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(SCREENSHOT_WINDOW_LABEL) {
        let _ = win.destroy();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    Ok(())
}
