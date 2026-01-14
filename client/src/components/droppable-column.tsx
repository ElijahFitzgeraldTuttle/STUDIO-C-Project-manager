import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableColumnProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export function DroppableColumn({ id, children, className, style }: DroppableColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(className, isOver && "ring-2 ring-indigo-400 ring-offset-2")}
            style={style}
        >
            {children}
        </div>
    );
}
