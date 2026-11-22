export default function Loader({ fullPage = false, label = "Loading..." }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3 text-choco/70">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
      <span className="text-sm">{label}</span>
    </div>
  );

  if (fullPage) {
    return <div className="flex min-h-[70vh] items-center justify-center">{spinner}</div>;
  }
  return <div className="flex justify-center py-16">{spinner}</div>;
}
