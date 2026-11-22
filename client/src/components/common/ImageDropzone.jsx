import { useEffect, useRef, useState } from "react";
import { FiImage, FiUploadCloud } from "react-icons/fi";

export default function ImageDropzone({ file, onChange, currentImage = "", accept = "image/jpeg,image/png,image/webp", label = "Choose an image", hint = "JPG, PNG or WebP" }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const choose = (next) => {
    const image = next?.[0];
    if (image) { setPreview(URL.createObjectURL(image)); onChange(image); }
  };

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}
      className={`group relative flex min-h-36 cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border border-dashed p-4 transition-colors ${dragging ? "border-brand bg-brand/10" : "hover:border-brand/60"}`}
      style={{ borderColor: dragging ? "var(--color-brand)" : "var(--line-strong)", background: "var(--surface-2)" }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }}
      aria-label={file ? `Replace image, selected ${file.name}` : label}
    >
      {file && preview || currentImage ? <img src={file && preview ? preview : currentImage} alt={file ? "Selected upload preview" : "Current image"} className="h-24 w-24 shrink-0 rounded-xl object-cover" /> : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">{dragging ? <FiUploadCloud size={27} /> : <FiImage size={25} />}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{file?.name || label}</span>
        <span className="mt-1 block text-xs" style={{ color: "var(--muted)" }}>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · click to replace` : `Drag and drop here, or click to browse · ${hint}`}</span>
      </span>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(event) => choose(event.target.files)} />
    </div>
  );
}
