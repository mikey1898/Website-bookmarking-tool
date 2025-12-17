import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, FolderPlus, FolderOpen, Trash2, Edit2, Plus } from 'lucide-react';
import { Folder as FolderType } from '../types';
import { Language, translations } from '../utils';

interface SidebarProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
  lang: Language;
}

interface FolderItemProps extends SidebarProps {
  folder: FolderType;
  depth: number;
}

const FolderItem: React.FC<FolderItemProps> = ({ 
  folder, depth, folders, selectedFolderId, onSelectFolder, onCreateFolder, onEditFolder, onDeleteFolder, lang 
}) => {
  const [isOpen, setIsOpen] = useState(!folder.collapsed);
  
  const childFolders = folders.filter(f => f.parentId === folder.id);
  const isSelected = selectedFolderId === folder.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="select-none">
      <div 
        className={`
          group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 mb-0.5
          ${isSelected 
            ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelectFolder(folder.id)}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 py-0.5">
          <button 
            onClick={handleToggle}
            className={`p-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 transition ${childFolders.length === 0 ? 'invisible' : ''}`}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {isOpen 
            ? <FolderOpen size={18} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'} /> 
            : <Folder size={18} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'} />
          }
          <span className="truncate text-sm font-medium">{folder.name}</span>
        </div>

        {/* Action Buttons - Always visible on touch, hover on desktop */}
        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCreateFolder(folder.id); }}
              className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              title="Add Subfolder"
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditFolder(folder); }}
              className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title="Rename"
            >
              <Edit2 size={14} />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteFolder(folder.id); }}
              className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
        </div>
      </div>

      {isOpen && childFolders.length > 0 && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          {childFolders.map(child => (
            <FolderItem 
              key={child.id} 
              folder={child} 
              depth={depth + 1} 
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const rootFolders = props.folders.filter(f => f.parentId === null);
  const t = translations[props.lang];

  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full flex flex-col transition-colors duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
        <h2 className="font-bold text-gray-800 dark:text-gray-200 tracking-tight text-xs uppercase opacity-70">Folders</h2>
        <button 
          onClick={() => props.onCreateFolder(null)}
          className="p-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition"
          title={t.newFolder}
        >
          <FolderPlus size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div 
          onClick={() => props.onSelectFolder(null)}
          className={`
             px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-2 flex items-center gap-2
             ${props.selectedFolderId === null 
               ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200' 
               : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
             }
          `}
        >
          <Folder size={18} className={props.selectedFolderId === null ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'} />
          <span className="text-sm font-medium">{t.allBookmarks}</span>
        </div>

        {rootFolders.map(folder => (
          <FolderItem key={folder.id} folder={folder} depth={0} {...props} />
        ))}

        {rootFolders.length === 0 && (
          <div className="text-center text-xs text-gray-400 dark:text-gray-600 mt-10 whitespace-pre-wrap">
            {t.noFolders}
          </div>
        )}
      </div>
    </div>
  );
};