import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";
import { TaskCard } from "@/components/task-card";
import type { Task } from "@/lib/types";

interface DraggableTaskProps {
    task: Task;
    unreadCount: number;
    onUpdate: (task: Task) => void;
    onDelete: (taskId: number) => void;
    repelMode?: boolean;
    mousePixelPosition?: { x: number; y: number };
    trackingFields?: string[];
    trackingLabels?: Record<string, string>;
    isUpdating?: boolean;
}

export function DraggableTask({
    task,
    unreadCount,
    onUpdate,
    onDelete,
    repelMode,
    mousePixelPosition,
    trackingFields,
    trackingLabels,
    isUpdating,
}: DraggableTaskProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id.toString() });

    const [cardElement, setCardElement] = useState<HTMLDivElement | null>(null);
    const [repelTransform, setRepelTransform] = useState({ x: 0, y: 0 });

    // Calculate repel effect
    useEffect(() => {
        if (!repelMode || !mousePixelPosition || !cardElement) {
            setRepelTransform({ x: 0, y: 0 });
            return;
        }

        const rect = cardElement.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;

        const deltaX = cardCenterX - mousePixelPosition.x;
        const deltaY = cardCenterY - mousePixelPosition.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const repelRadius = 300;
        if (distance < repelRadius) {
            const repelStrength = (1 - distance / repelRadius) * 150;
            const angle = Math.atan2(deltaY, deltaX);
            setRepelTransform({
                x: Math.cos(angle) * repelStrength,
                y: Math.sin(angle) * repelStrength,
            });
        } else {
            setRepelTransform({ x: 0, y: 0 });
        }
    }, [repelMode, mousePixelPosition, cardElement]);

    const dragTransform = CSS.Transform.toString(transform);

    let finalTransform = dragTransform || undefined;

    if (repelMode && !isDragging) {
        finalTransform = `translate(${repelTransform.x}px, ${repelTransform.y}px)`;
    }

    const style: React.CSSProperties = {
        transform: finalTransform,
        transition: isDragging ? transition : repelMode ? 'transform 0.05s ease-out' : 'transform 0.1s ease-out',
        opacity: isDragging ? 0.5 : 1,
        pointerEvents: repelMode ? 'none' : 'auto',
    };

    return (
        <div ref={(node) => { setNodeRef(node); setCardElement(node); }} style={style} {...attributes}>
            <TaskCard
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                unreadCount={unreadCount}
                dragHandleProps={listeners}
                trackingFields={trackingFields}
                trackingLabels={trackingLabels}
                isUpdating={isUpdating}
            />
        </div>
    );
}
