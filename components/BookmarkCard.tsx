import React from 'react';
import { ExternalLink, Tag, Trash2, Edit } from 'lucide-react';
import { Bookmark } from '../types';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
}

const getDomain = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'URL';
  }
};

const getFallbackColor = (id: string) => {
    // Vibrant, professional colors inspired by modern UI trends
    const colors = [
        '#0d9488', // teal-600
        '#0284c7', // sky-600
        '#4f46e5', // indigo-600
        '#7c3aed', // violet-600
        '#db2777', // pink-600
        '#e11d48', // rose-600
        '#ea580c', // orange-600
        '#16a34a', // green-600
        '#0891b2', // cyan-600
        '#c026d3', // fuchsia-600
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onEdit, onDelete }) => {
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl dark:hover:shadow-black/30 transition-all duration-300 overflow-hidden flex flex-col h-full transform hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700">
        {bookmark.imageUrl ? (
            <img 
              src={bookmark.imageUrl} 
              alt={bookmark.title} 
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out" 
            />
        ) : (
            <div 
                className="w-full h-full flex items-center justify-center p-6 text-center select-none"
                style={{ backgroundColor: getFallbackColor(bookmark.id) }}
            >
               <h3 className="text-white font-bold text-2xl sm:text-3xl tracking-tight leading-none drop-shadow-sm break-all">
                   {getDomain(bookmark.url)}
               </h3>
            </div>
        )}
        
        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
          <a 
            href={bookmark.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 bg-white hover:bg-gray-50 rounded-full text-gray-900 shadow-lg transition hover:scale-110"
            title="Open Link"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={20} />
          </a>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(bookmark); }}
            className="p-3 bg-white hover:bg-gray-50 rounded-full text-blue-600 shadow-lg transition hover:scale-110"
            title="Edit"
          >
            <Edit size={20} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bookmark.id); }}
            className="p-3 bg-white hover:bg-gray-50 rounded-full text-red-600 shadow-lg transition hover:scale-110"
            title="Delete"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 line-clamp-1" title={bookmark.title}>
            {bookmark.title}
        </h3>
        <a 
            href={bookmark.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-gray-400 dark:text-gray-500 mb-3 truncate hover:text-indigo-500 dark:hover:text-indigo-400 block transition-colors"
            onClick={(e) => e.stopPropagation()}
        >
            {bookmark.url}
        </a>
        
        {bookmark.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 flex-1 leading-relaxed">
            {bookmark.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-auto">
          {bookmark.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full border border-gray-200 dark:border-gray-600">
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};