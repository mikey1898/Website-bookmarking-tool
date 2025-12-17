import { Bookmark, Folder } from './types';
import jsPDF from 'jspdf';

// --- i18n ---

export const translations = {
  en: {
    appName: "ZenBookmarks",
    allBookmarks: "All Bookmarks",
    newFolder: "New Folder",
    renameFolder: "Rename Folder",
    folderName: "Folder Name",
    addBookmark: "Add Bookmark",
    editBookmark: "Edit Bookmark",
    title: "Title",
    url: "URL",
    description: "Description",
    tags: "Tags (comma separated)",
    coverImage: "Cover Image (4:3)",
    change: "Change",
    cancel: "Cancel",
    save: "Save",
    create: "Create",
    update: "Update",
    delete: "Delete",
    searchPlaceholder: "Search bookmarks...",
    noBookmarks: "No bookmarks found here.",
    noFolders: "No folders created yet.\nClick + to start.",
    confirmDeleteTitle: "Are you sure?",
    confirmDeleteFolder: "This will permanently delete this folder and all bookmarks inside it.",
    confirmDeleteBookmark: "This will permanently delete this bookmark.",
    importSuccess: (bCount: number, fCount: number) => `Imported ${bCount} bookmarks and ${fCount} folders.`,
    noCompatible: "No compatible bookmarks found.",
    exportHtml: "HTML File",
    exportTxt: "TXT File",
    exportPdf: "PDF File",
    exportTitle: "Export Bookmarks",
    exportNote: "Select a format to export your bookmarks.",
    universalFormat: "Universal format",
    simpleList: "Simple list",
    visualDoc: "Document format",
    cropImage: "Crop Image",
    confirmCrop: "Confirm Crop",
    zoomDrag: "Scroll to Zoom, Drag to Move",
    import: "Import",
    export: "Export",
    theme: "Theme",
    language: "Language"
  },
  zh: {
    appName: "Zen收藏夹",
    allBookmarks: "所有收藏",
    newFolder: "新建文件夹",
    renameFolder: "重命名文件夹",
    folderName: "文件夹名称",
    addBookmark: "添加网址",
    editBookmark: "编辑网址",
    title: "标题",
    url: "网址链接",
    description: "简介",
    tags: "标签 (用逗号分隔)",
    coverImage: "封面图片 (4:3)",
    change: "更换",
    cancel: "取消",
    save: "保存",
    create: "创建",
    update: "更新",
    delete: "删除",
    searchPlaceholder: "搜索收藏...",
    noBookmarks: "此处暂时没有收藏。",
    noFolders: "暂无文件夹。\n点击 + 开始创建。",
    confirmDeleteTitle: "确认删除？",
    confirmDeleteFolder: "此操作将永久删除该文件夹及其包含的所有内容。",
    confirmDeleteBookmark: "此操作将永久删除该收藏。",
    importSuccess: (bCount: number, fCount: number) => `成功导入 ${bCount} 个收藏和 ${fCount} 个文件夹。`,
    noCompatible: "未发现兼容的收藏数据。",
    exportHtml: "HTML 文件",
    exportTxt: "TXT 文件",
    exportPdf: "PDF 文件",
    exportTitle: "导出收藏",
    exportNote: "选择一种格式导出您的收藏夹。",
    universalFormat: "通用格式",
    simpleList: "简单列表",
    visualDoc: "文档格式",
    cropImage: "裁剪图片",
    confirmCrop: "确认裁剪",
    zoomDrag: "滚动缩放，拖拽移动",
    import: "导入",
    export: "导入",
    theme: "主题",
    language: "语言"
  }
};

export type Language = keyof typeof translations;

// --- ID Helper ---
export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// --- Image Helpers ---

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const cropImage = (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2d context'));

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      resolve(canvas.toDataURL('image/jpeg'));
    };
    image.onerror = reject;
  });
};

// --- Export Helpers ---

export const downloadFile = (content: string, filename: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const exportToTxt = (bookmarks: Bookmark[]) => {
  const content = bookmarks
    .map((b) => `Title: ${b.title}\nURL: ${b.url}\nTags: ${b.tags.join(', ')}\nDescription: ${b.description}\n------------------`)
    .join('\n\n');
  downloadFile(content, 'bookmarks.txt', 'text/plain');
};

export const exportToPdf = (bookmarks: Bookmark[]) => {
  const doc = new jsPDF();
  let y = 15;
  const lineHeight = 6;
  const margin = 15;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - (margin * 2);

  // Use a Monospace/Courier font to match the "TXT" look requested
  doc.setFont("courier", "normal");
  doc.setFontSize(10);

  // Helper to check page break
  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - margin) {
      doc.addPage();
      y = 15;
    }
  };

  bookmarks.forEach(b => {
    // We need to simulate the TXT output exactly:
    // Title: ...
    // URL: ...
    // Tags: ...
    // Description: ...
    // ------------------

    const textBlock = [
        `Title: ${b.title}`,
        `URL: ${b.url}`,
        `Tags: ${b.tags.join(', ')}`,
        `Description: ${b.description}`,
        `------------------`
    ];

    textBlock.forEach(line => {
        // Split text to fit width
        const lines = doc.splitTextToSize(line, contentWidth);
        checkPageBreak(lines.length * lineHeight);
        doc.text(lines, margin, y);
        y += (lineHeight * lines.length);
    });

    y += lineHeight; // Extra spacing between items
  });

  doc.save("bookmarks.pdf");
};

export const exportToHtml = (folders: Folder[], bookmarks: Bookmark[]) => {
  // Simple Netscape Bookmark File Generation
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;

  // Helper to recursive build tree
  const buildTree = (parentId: string | null, level: number) => {
    let output = '';
    const indent = '    '.repeat(level);

    // Items in this folder
    const folderBookmarks = bookmarks.filter((b) => b.folderId === parentId);
    folderBookmarks.forEach((b) => {
      output += `${indent}<DT><A HREF="${b.url}" ADD_DATE="${Math.floor(b.createdAt / 1000)}" TAGS="${b.tags.join(',')}">${b.title}</A>\n`;
      if(b.description) output += `${indent}<DD>${b.description}\n`;
    });

    // Subfolders
    const subFolders = folders.filter((f) => f.parentId === parentId);
    subFolders.forEach((f) => {
      output += `${indent}<DT><H3 ADD_DATE="${Date.now()}" LAST_MODIFIED="${Date.now()}">${f.name}</H3>\n`;
      output += `${indent}<DL><p>\n`;
      output += buildTree(f.id, level + 1);
      output += `${indent}</DL><p>\n`;
    });

    return output;
  };

  html += buildTree(null, 0);
  html += '</DL><p>';

  downloadFile(html, 'bookmarks.html', 'text/html');
};

// --- Import Helpers ---

export const parseNetscapeHtml = (htmlContent: string): { folders: Folder[]; bookmarks: Bookmark[] } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const newFolders: Folder[] = [];
  const newBookmarks: Bookmark[] = [];

  const traverse = (element: Element, parentId: string | null) => {
    const children = Array.from(element.children);
    
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        
        if (node.tagName === 'DT') {
            const h3 = node.querySelector('h3');
            const a = node.querySelector('a');
            
            if (h3) {
                // It's a folder
                const folderId = generateId();
                newFolders.push({
                    id: folderId,
                    parentId: parentId,
                    name: h3.textContent || 'Untitled Folder',
                    collapsed: false
                });
                
                let nextDl = node.querySelector('dl');
                if (!nextDl && node.nextElementSibling?.tagName === 'DD') {
                     nextDl = node.nextElementSibling.querySelector('dl');
                }
                
                if (nextDl) traverse(nextDl, folderId);
            } else if (a) {
                // It's a bookmark
                newBookmarks.push({
                    id: generateId(),
                    folderId: parentId,
                    title: a.textContent || 'Untitled',
                    url: a.getAttribute('href') || '#',
                    tags: a.getAttribute('tags')?.split(',') || [],
                    description: '', 
                    imageUrl: '', // Set empty to use the new color fallback UI
                    createdAt: Date.now()
                });
            }
        } else if (node.tagName === 'DL') {
            traverse(node, parentId);
        }
    }
  };

  const rootDl = doc.querySelector('dl');
  if (rootDl) {
    traverse(rootDl, null);
  }

  return { folders: newFolders, bookmarks: newBookmarks };
};