import './QueueList.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Trash2, GripVertical } from 'lucide-react';
import { reorderQueue, deletePrintJob } from '../../services/api';

export function QueueList({ queue }) {
  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderQueue(items);
  };

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="queue-list">
        {(provided) => (
          <div
            className="queue-container"
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {queue.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`queue-item ${snapshot.isDragging ? 'dragging' : ''}`}
                  >
                    <div className="drag-handle" {...provided.dragHandleProps}>
                      <GripVertical size={18} />
                    </div>
                    
                    <span className="item-index">{index + 1}</span>

                    {/* IMATGE DE PREVISUALITZACIÓ */}
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="item-thumbnail" 
                      />
                    )}

                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p className="item-filename">
                        <code>{item.filename}</code> • {item.duration_seconds}s
                      </p>
                    </div>

                    <button
                      className="delete-btn"
                      onClick={() => deletePrintJob(item.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
