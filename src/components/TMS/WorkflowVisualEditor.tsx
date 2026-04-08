import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Workflow, WorkflowTransition, TaskSettings } from '../../types';
import { X, Save, Settings } from 'lucide-react';

interface Props {
  workflow: Workflow;
  statuses: TaskSettings['statuses'];
  onSave: (workflow: Workflow) => void;
  onClose: () => void;
}

const WorkflowVisualEditor: React.FC<Props> = ({ workflow, statuses, onSave, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  useEffect(() => {
    // Initialize nodes and edges from workflow
    const initialNodes: Node[] = statuses.map((s, i) => ({
      id: s.id,
      position: { x: (i % 3) * 250 + 50, y: Math.floor(i / 3) * 150 + 50 },
      data: { label: s.label },
      style: {
        background: s.color,
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '12px'
      }
    }));

    const initialEdges: Edge[] = [];
    workflow.transitions.forEach(t => {
      t.fromStatus.forEach(from => {
        initialEdges.push({
          id: `e-${from}-${t.toStatus}-${t.id}`,
          source: from,
          target: t.toStatus,
          label: t.name,
          data: { transitionId: t.id, ...t },
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 }
        });
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [workflow, statuses, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    const newTransitionId = `t_${Date.now()}`;
    const newEdge = {
      ...params,
      id: `e-${params.source}-${params.target}-${newTransitionId}`,
      label: 'Новый переход',
      data: {
        transitionId: newTransitionId,
        name: 'Новый переход',
        fromStatus: [params.source],
        toStatus: params.target,
        requirePopup: false,
        requireComment: false,
        requireUpdate: false
      },
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 }
    };
    setEdges((eds) => addEdge(newEdge as any, eds));
    setSelectedEdge(newEdge as Edge);
  }, [setEdges]);

  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
  };

  const handleSave = () => {
    // Reconstruct workflow from edges
    const transitionsMap = new Map<string, WorkflowTransition>();
    
    edges.forEach(edge => {
      const data = edge.data as any;
      if (!data) return;
      
      const tId = data.transitionId;
      if (transitionsMap.has(tId)) {
        const existing = transitionsMap.get(tId)!;
        if (!existing.fromStatus.includes(edge.source)) {
          existing.fromStatus.push(edge.source);
        }
      } else {
        transitionsMap.set(tId, {
          id: tId,
          name: data.name || edge.label,
          fromStatus: [edge.source],
          toStatus: edge.target,
          requirePopup: data.requirePopup,
          requireComment: data.requireComment,
          requireUpdate: data.requireUpdate,
          requiredFields: data.requiredFields || []
        });
      }
    });

    onSave({
      ...workflow,
      transitions: Array.from(transitionsMap.values())
    });
  };

  const updateSelectedEdgeData = (updates: any) => {
    if (!selectedEdge) return;
    setEdges(eds => eds.map(e => {
      if (e.id === selectedEdge.id) {
        const newData = { ...e.data, ...updates };
        return { ...e, data: newData, label: newData.name };
      }
      return e;
    }));
    setSelectedEdge(prev => prev ? { ...prev, data: { ...prev.data, ...updates }, label: updates.name || prev.label } : null);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdge) return;
    setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white dark:bg-zinc-900 w-full h-full max-w-[95vw] max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border-2 border-zinc-100 dark:border-zinc-800">
        <div className="p-3 border-b-2 border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Редактор процесса: {workflow.name}</h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase">Соедините статусы для создания переходов</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeClick={handleEdgeClick}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>

          {selectedEdge && (
            <div className="w-80 border-l-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-black uppercase dark:text-white flex items-center gap-2"><Settings size={16}/> Настройка перехода</h4>
                <button onClick={() => setSelectedEdge(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><X size={16}/></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Название перехода</label>
                  <input 
                    value={(selectedEdge.data as any)?.name || ''}
                    onChange={e => updateSelectedEdgeData({ name: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-xl border-2 border-zinc-100 dark:border-zinc-700 cursor-pointer hover:border-primary transition-all">
                    <input 
                      type="checkbox" 
                      checked={(selectedEdge.data as any)?.requireComment || false}
                      onChange={e => updateSelectedEdgeData({ requireComment: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300">Обязательный комментарий</span>
                  </label>

                  <label className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-xl border-2 border-zinc-100 dark:border-zinc-700 cursor-pointer hover:border-primary transition-all">
                    <input 
                      type="checkbox" 
                      checked={(selectedEdge.data as any)?.requireUpdate || false}
                      onChange={e => updateSelectedEdgeData({ requireUpdate: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300">Запросить апдейт</span>
                  </label>
                </div>

                <button 
                  onClick={deleteSelectedEdge}
                  className="w-full p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-xs font-black uppercase hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  Удалить переход
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black uppercase text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
          <button onClick={handleSave} className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"><Save size={16}/> Сохранить процесс</button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowVisualEditor;
