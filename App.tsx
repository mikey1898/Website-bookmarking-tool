import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { BookmarkCard } from './components/BookmarkCard';
import { Modal } from './components/Modal';
import { SimpleCropper } from './components/SimpleCropper';
import { Bookmark, Folder } from './types';
import { exportToHtml, exportToTxt, exportToPdf, parseNetscapeHtml, readFileAsDataURL, translations, Language, generateId } from './utils';
import { Plus, Upload, Download, Search, Menu, LayoutGrid, FileText, Image as ImageIcon, Moon, Sun, Languages, AlertTriangle, Globe } from 'lucide-react';

type Theme = 'light' | 'dark';

// Helper type to allow tags to be a string during editing (for the input field)
type EditingBookmarkState = Partial<Omit<Bookmark, 'tags'>> & { tags?: string | string[] };

const App: React.FC = () => {
  // --- State ---
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('zb_folders');
    return saved ? JSON.parse(saved) : [];
  });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem('zb_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true); // Mobile toggle
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('zb_theme') as Theme) || 'light');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('zb_lang') as Language) || 'en');

  // Modals
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'folder' | 'bookmark', id: string } | null>(null);

  // Edit/Create State
  const [editingBookmark, setEditingBookmark] = useState<EditingBookmarkState | null>(null);
  const [editingFolder, setEditingFolder] = useState<Partial<Folder> | null>(null);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- Persistence & Effects ---
  useEffect(() => {
    localStorage.setItem('zb_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('zb_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('zb_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('zb_lang', lang);
  }, [lang]);

  const t = translations[lang];

  // --- Actions: Folders ---
  const handleCreateFolder = (parentId: string | null) => {
    setEditingFolder({ parentId, name: '' });
    setFolderModalOpen(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderModalOpen(true);
  };

  const saveFolder = () => {
    if (!editingFolder?.name) return;

    if (editingFolder.id) {
      // Update
      setFolders(folders.map(f => f.id === editingFolder.id ? { ...f, name: editingFolder.name! } : f));
    } else {
      // Create
      const newFolder: Folder = {
        id: generateId(),
        parentId: editingFolder.parentId ?? null,
        name: editingFolder.name,
        collapsed: false
      };
      setFolders([...folders, newFolder]);
    }
    setFolderModalOpen(false);
    setEditingFolder(null);
  };

  const handleDeleteFolder = (id: string) => {
    setDeleteConfirmation({ type: 'folder', id });
  };

  // --- Actions: Bookmarks ---
  const handleAddBookmark = () => {
    setEditingBookmark({
        folderId: selectedFolderId,
        title: '',
        url: '',
        tags: [],
        description: '',
        imageUrl: '' 
    });
    setBookmarkModalOpen(true);
  };

  const handleEditBookmark = (b: Bookmark) => {
    setEditingBookmark(b);
    setBookmarkModalOpen(true);
  };

  const saveBookmark = () => {
    if (!editingBookmark?.title || !editingBookmark?.url) return;
    
    const finalBookmark: Bookmark = {
        id: editingBookmark.id || generateId(),
        folderId: editingBookmark.folderId ?? null,
        title: editingBookmark.title,
        url: editingBookmark.url,
        tags: typeof editingBookmark.tags === 'string' ? (editingBookmark.tags as string).split(',').map(t => t.trim()).filter(Boolean) : (editingBookmark.tags as string[] || []),
        description: editingBookmark.description || '',
        imageUrl: editingBookmark.imageUrl || '',
        createdAt: editingBookmark.createdAt || Date.now()
    };

    if (editingBookmark.id) {
        setBookmarks(bookmarks.map(b => b.id === finalBookmark.id ? finalBookmark : b));
    } else {
        setBookmarks([...bookmarks, finalBookmark]);
    }
    setBookmarkModalOpen(false);
    setEditingBookmark(null);
  };

  const handleDeleteBookmark = (id: string) => {
     setDeleteConfirmation({ type: 'bookmark', id });
  };

  const executeDelete = () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'folder') {
        const idToDelete = deleteConfirmation.id;
        
        // Find all subfolder IDs recursively to ensure clean state
        const allIdsToDelete = new Set<string>();
        const collectIds = (fid: string) => {
            allIdsToDelete.add(fid);
            folders.filter(f => f.parentId === fid).forEach(child => collectIds(child.id));
        };
        collectIds(idToDelete);

        setFolders(folders.filter(f => !allIdsToDelete.has(f.id)));
        setBookmarks(bookmarks.filter(b => !b.folderId || !allIdsToDelete.has(b.folderId)));
        
        // If the selected folder was deleted, reset selection
        if (selectedFolderId && allIdsToDelete.has(selectedFolderId)) {
            setSelectedFolderId(null);
        }
    } else {
        setBookmarks(bookmarks.filter(b => b.id !== deleteConfirmation.id));
    }
    setDeleteConfirmation(null);
  };

  // --- Actions: Images ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const dataUrl = await readFileAsDataURL(file);
      setTempImageSrc(dataUrl);
      setCropModalOpen(true);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setEditingBookmark(prev => ({ ...prev, imageUrl: croppedImage }));
    setCropModalOpen(false);
    setTempImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Actions: Import/Export ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const htmlContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      });
      
      const { folders: newFolders, bookmarks: newBookmarks } = parseNetscapeHtml(htmlContent);
      
      if (newFolders.length === 0 && newBookmarks.length === 0) {
          alert(t.noCompatible);
          return;
      }

      setFolders([...folders, ...newFolders]);
      setBookmarks([...bookmarks, ...newBookmarks]);
      alert(t.importSuccess(newBookmarks.length, newFolders.length));
    }
  };

  // --- Selection Logic ---
  const handleSelectFolder = (id: string | null) => {
    setSelectedFolderId(id);
    setSearchQuery(''); // Clear search on folder select as requested
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // --- Filtering ---
  const filteredBookmarks = useMemo(() => {
    // 1. Global Search (ignore folder selection if searching)
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      return bookmarks.filter(b => 
        b.title.toLowerCase().includes(lowerQ) ||
        b.url.toLowerCase().includes(lowerQ) ||
        b.description.toLowerCase().includes(lowerQ) ||
        b.tags.some(t => t.toLowerCase().includes(lowerQ))
      );
    }

    // 2. Folder Filtering (Recursive)
    if (selectedFolderId) {
       // Find all subfolder IDs recursively
       const allowedFolderIds = new Set<string>([selectedFolderId]);
       
       const collectSubFolders = (parentId: string) => {
           const children = folders.filter(f => f.parentId === parentId);
           children.forEach(child => {
               allowedFolderIds.add(child.id);
               collectSubFolders(child.id);
           });
       };
       collectSubFolders(selectedFolderId);

       return bookmarks.filter(b => b.folderId && allowedFolderIds.has(b.folderId));
    }

    // 3. Show All (if no folder selected and no search)
    return bookmarks;
  }, [bookmarks, folders, selectedFolderId, searchQuery]);

  // Common input styles for forms
  const inputStyle = "w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    // Use h-full and overflow-hidden on the root container, matched with index.html styles
    <div className="flex h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Sidebar Mobile Toggle Overlay */}
      {isSidebarOpen && (
         <div 
           className="fixed inset-0 bg-black/50 z-20 md:hidden"
           onClick={() => setSidebarOpen(false)}
         />
      )}

      {/* Sidebar Wrapper with explicit width to prevent flex issues */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={handleCreateFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
          lang={lang}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-24 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 gap-4 shrink-0 transition-colors duration-300 z-10">
           <div className="flex items-center gap-4 flex-1">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
               <Menu />
             </button>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 hidden sm:block">
               {t.appName}
             </h1>
             <div className="flex-1 max-w-xl relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-800 border focus:border-indigo-500 rounded-full outline-none transition-all"
                />
             </div>
           </div>

           <div className="flex items-center gap-2 sm:gap-3">
             <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 transition" title={t.language}>
                <Languages size={20} />
                <span className="sr-only">Switch Language</span>
                <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-gray-200 dark:bg-gray-700 px-1 rounded">{lang.toUpperCase()}</span>
             </button>

             <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 transition" title={t.theme}>
               {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
             </button>

             <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

             <button onClick={() => setExportModalOpen(true)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 transition" title={t.export}>
               <Upload size={20} className="rotate-180" /> {/* Download Icon visual */}
             </button>

             <label className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 transition cursor-pointer" title={t.import}>
               <Download size={20} className="rotate-180" /> {/* Upload Icon visual */}
               <input type="file" accept=".html" onChange={handleImport} className="hidden" />
             </label>

             <button 
               onClick={handleAddBookmark}
               className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-medium transition shadow-lg shadow-indigo-500/20 active:scale-95"
             >
               <Plus size={20} />
               <span>{t.addBookmark}</span>
             </button>
             {/* Mobile Add Button */}
             <button 
               onClick={handleAddBookmark}
               className="sm:hidden p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg"
             >
               <Plus size={20} />
             </button>
           </div>
        </header>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
           {selectedFolderId && !searchQuery && (
               <div className="mb-6">
                   <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                       {folders.find(f => f.id === selectedFolderId)?.name}
                   </h2>
               </div>
           )}

           {filteredBookmarks.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
               {filteredBookmarks.map(bookmark => (
                 <BookmarkCard 
                   key={bookmark.id} 
                   bookmark={bookmark} 
                   onEdit={handleEditBookmark} 
                   onDelete={handleDeleteBookmark}
                 />
               ))}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 opacity-60">
                <LayoutGrid size={64} className="mb-4 stroke-1" />
                <p className="text-lg font-medium">{searchQuery ? 'No matching results' : t.noBookmarks}</p>
             </div>
           )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Folder Modal */}
      <Modal 
        isOpen={folderModalOpen} 
        onClose={() => setFolderModalOpen(false)} 
        title={editingFolder?.id ? t.renameFolder : t.newFolder}
      >
        <div className="space-y-6">
          <div>
            <label className={labelStyle}>{t.folderName}</label>
            <input 
              autoFocus
              className={inputStyle}
              value={editingFolder?.name || ''} 
              onChange={e => setEditingFolder({ ...editingFolder, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && saveFolder()}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setFolderModalOpen(false)} className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium">
              {t.cancel}
            </button>
            <button onClick={saveFolder} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition font-medium shadow-lg shadow-indigo-500/20">
              {t.save}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bookmark Modal */}
      <Modal 
        isOpen={bookmarkModalOpen} 
        onClose={() => setBookmarkModalOpen(false)} 
        title={editingBookmark?.id ? t.editBookmark : t.addBookmark}
      >
        <div className="space-y-5">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="col-span-1">
                <label className={labelStyle}>{t.coverImage}</label>
                <div 
                    className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {editingBookmark?.imageUrl ? (
                        <img src={editingBookmark.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <ImageIcon size={32} className="mb-2" />
                            <span className="text-xs">{t.change}</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-medium">{t.change}</span>
                    </div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                />
                {editingBookmark?.imageUrl && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setEditingBookmark({...editingBookmark, imageUrl: ''}); }}
                        className="text-xs text-red-500 hover:text-red-600 mt-2 ml-1"
                    >
                        Remove Image
                    </button>
                )}
             </div>

             <div className="col-span-1 space-y-4">
                <div>
                    <label className={labelStyle}>{t.title}</label>
                    <input 
                    className={inputStyle}
                    value={editingBookmark?.title || ''} 
                    onChange={e => setEditingBookmark({ ...editingBookmark, title: e.target.value })}
                    />
                </div>
                <div>
                    <label className={labelStyle}>{t.url}</label>
                    <input 
                    className={inputStyle}
                    value={editingBookmark?.url || ''} 
                    onChange={e => setEditingBookmark({ ...editingBookmark, url: e.target.value })}
                    />
                </div>
             </div>
           </div>

          <div>
            <label className={labelStyle}>{t.description}</label>
            <textarea 
              className={`${inputStyle} h-24 resize-none`}
              value={editingBookmark?.description || ''} 
              onChange={e => setEditingBookmark({ ...editingBookmark, description: e.target.value })}
            />
          </div>

          <div>
            <label className={labelStyle}>{t.tags}</label>
            <input 
              className={inputStyle}
              value={Array.isArray(editingBookmark?.tags) ? editingBookmark?.tags.join(', ') : editingBookmark?.tags || ''} 
              onChange={e => setEditingBookmark({ ...editingBookmark, tags: e.target.value })}
              placeholder="Design, AI, Tools..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setBookmarkModalOpen(false)} className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium">
              {t.cancel}
            </button>
            <button onClick={saveBookmark} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition font-medium shadow-lg shadow-indigo-500/20">
              {editingBookmark?.id ? t.update : t.create}
            </button>
          </div>
        </div>
      </Modal>

      {/* Crop Modal */}
      <Modal 
        isOpen={cropModalOpen} 
        onClose={() => setCropModalOpen(false)} 
        title={t.cropImage}
      >
         {tempImageSrc && (
             <SimpleCropper 
                imageSrc={tempImageSrc} 
                onCropComplete={handleCropComplete} 
                aspectRatio={4/3}
             />
         )}
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} title={t.exportTitle}>
         <div className="grid grid-cols-3 gap-4">
             <button onClick={() => { exportToHtml(folders, bookmarks); setExportModalOpen(false); }} className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group">
                <Globe size={32} className="text-gray-400 group-hover:text-indigo-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{t.exportHtml}</span>
                <span className="text-xs text-gray-400">{t.universalFormat}</span>
             </button>
             <button onClick={() => { exportToTxt(bookmarks); setExportModalOpen(false); }} className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group">
                <FileText size={32} className="text-gray-400 group-hover:text-indigo-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{t.exportTxt}</span>
                <span className="text-xs text-gray-400">{t.simpleList}</span>
             </button>
             <button onClick={() => { exportToPdf(bookmarks); setExportModalOpen(false); }} className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group">
                <FileText size={32} className="text-gray-400 group-hover:text-indigo-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{t.exportPdf}</span>
                <span className="text-xs text-gray-400">{t.visualDoc}</span>
             </button>
         </div>
         <p className="mt-4 text-xs text-center text-gray-400">
             {t.exportNote}
         </p>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteConfirmation} 
        onClose={() => setDeleteConfirmation(null)} 
        title={t.confirmDeleteTitle}
      >
        <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
                {deleteConfirmation?.type === 'folder' ? t.confirmDeleteFolder : t.confirmDeleteBookmark}
            </p>
            <div className="flex gap-3 w-full">
                <button 
                    onClick={() => setDeleteConfirmation(null)} 
                    className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                >
                    {t.cancel}
                </button>
                <button 
                    onClick={executeDelete} 
                    className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition font-medium shadow-lg shadow-red-500/20"
                >
                    {t.delete}
                </button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;