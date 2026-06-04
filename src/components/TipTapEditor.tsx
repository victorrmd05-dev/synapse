import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Heading1, Heading2, Heading3, Bold, Italic, List } from 'lucide-react';
import { marked } from 'marked';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  const processContent = (rawContent: string) => {
    if (!rawContent) return '';
    
    // Se já for HTML (gerado pelo TipTap ou salvo antes), retorna como está
    if (rawContent.includes('<p>') || rawContent.includes('<h1>') || rawContent.includes('<ul>') || rawContent.includes('<li>')) {
      return rawContent;
    }
    
    // Se for texto/markdown (como vem da IA), converte para HTML corretamente
    try {
      return marked.parse(rawContent, { breaks: true, async: false }) as string;
    } catch (e) {
      console.error("Erro ao converter markdown:", e);
      return rawContent.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: processContent(content),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'w-full bg-transparent text-white focus:outline-none focus:ring-0 font-inter leading-relaxed text-sm',
      },
    },
  });

  // Sync content if it changes externally (e.g. active item changed)
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const processed = processContent(content);
      if (processed !== editor.getHTML()) {
        editor.commands.setContent(processed);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F0F13] border border-surface-elevated rounded-lg overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-surface-elevated bg-surface shrink-0">
        <button 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-surface-elevated text-white' : 'text-secondary hover:text-white hover:bg-surface-elevated'}`}
          title="Título H1"
        ><Heading1 size={16} /></button>
        <button 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-surface-elevated text-white' : 'text-secondary hover:text-white hover:bg-surface-elevated'}`}
          title="Subtítulo H2"
        ><Heading2 size={16} /></button>
        <button 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-surface-elevated text-white' : 'text-secondary hover:text-white hover:bg-surface-elevated'}`}
          title="Subtítulo H3"
        ><Heading3 size={16} /></button>
        <div className="w-px h-4 bg-surface-elevated mx-1"></div>
        <button 
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-surface-elevated text-white' : 'text-secondary hover:text-white hover:bg-surface-elevated'}`}
          title="Negrito"
        ><Bold size={16} /></button>
        <button 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-surface-elevated text-white' : 'text-secondary hover:text-white hover:bg-surface-elevated'}`}
          title="Itálico"
        ><Italic size={16} /></button>
        <div className="w-px h-4 bg-surface-elevated mx-1"></div>
        <button 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-surface-elevated text-white' : 'text-secondary hover:text-white hover:bg-surface-elevated'}`}
          title="Lista"
        ><List size={16} /></button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
