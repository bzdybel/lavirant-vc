interface FailureReasonProps {
  text: string;
}

export function FailureReason({ text }: FailureReasonProps) {
  return (
    <div className="flex items-start text-left p-4 bg-[#0f2433]/60 rounded-xl border border-white/5">
      <div className="w-2 h-2 rounded-full bg-red-400 mt-2 mr-3 flex-shrink-0" />
      <p className="text-white/80">{text}</p>
    </div>
  );
}
