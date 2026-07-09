"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";

function textoAHtml(texto: string): string {
  return texto
    .split("\n")
    .map((linea) => `<p>${linea.length ? linea : "<br/>"}</p>`)
    .join("");
}

export function TiptapEditor({
  contenidoInicial,
  onChangeTexto,
  editable = true,
}: {
  contenidoInicial: string;
  onChangeTexto?: (texto: string) => void;
  editable?: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: textoAHtml(contenidoInicial),
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChangeTexto?.(editor.getText({ blockSeparator: "\n" }));
    },
  });

  return (
    <div className="flex flex-col rounded-md border border-border">
      {editable && (
        <div className="flex items-center gap-1 border-b border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label="Negrita"
          >
            <Bold className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label="Cursiva"
          >
            <Italic className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            aria-label="Lista"
          >
            <List className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            aria-label="Lista numerada"
          >
            <ListOrdered className="size-4" />
          </Button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="font-document min-h-72 max-w-none overflow-y-auto p-4 text-sm [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
