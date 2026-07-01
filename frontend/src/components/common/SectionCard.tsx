import { type ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, description, children, className = "" }: SectionCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 ${className}`}>
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {description ? <p className="text-sm text-gray-400 mb-5">{description}</p> : null}
      {children}
    </div>
  );
}
