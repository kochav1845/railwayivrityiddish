import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { useSiteContent } from "../contexts/SiteContentContext";

interface EditableTextProps {
  contentKey: string;
  defaultValue: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  dir?: string;
  multiline?: boolean;
}

export default function EditableText({
  contentKey,
  defaultValue,
  as: Tag = "span",
  className = "",
  dir,
  multiline = false,
}: EditableTextProps) {
  const { content, isAdmin, updateContent } = useSiteContent();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const displayValue = content[contentKey] ?? defaultValue;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEditing = () => {
    if (!isAdmin) return;
    setDraft(displayValue);
    setEditing(true);
  };

  const save = async () => {
    await updateContent(contentKey, draft);
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") cancel();
  };

  if (editing) {
    return (
      <div className="inline-flex items-center gap-2 w-full">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            dir={dir}
            rows={3}
            className={`flex-1 bg-white border-2 border-amber-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-y ${className}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            dir={dir}
            className={`flex-1 bg-white border-2 border-amber-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${className}`}
          />
        )}
        <button
          onClick={save}
          className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors shrink-0"
        >
          <Check size={16} />
        </button>
        <button
          onClick={cancel}
          className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <Tag
      dir={dir}
      className={`${className} ${isAdmin ? "cursor-pointer group/edit relative hover:bg-amber-50/50 hover:ring-2 hover:ring-amber-300/50 rounded-lg transition-all duration-150" : ""}`}
      onClick={isAdmin ? startEditing : undefined}
    >
      {displayValue}
      {isAdmin && (
        <span className="invisible group-hover/edit:visible absolute -top-1 -left-1 p-1 bg-amber-500 text-white rounded-md shadow-sm">
          <Pencil size={11} />
        </span>
      )}
    </Tag>
  );
}
