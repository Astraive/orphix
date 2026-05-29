import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="mb-3 h-12 w-12 opacity-30" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs opacity-60">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
