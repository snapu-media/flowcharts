'use client';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../lib/fierbase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

const statusColors = {
  todo: '#808080',
  progress: '#FFA500',
  completed: '#008000',
  aborted: '#FF0000',
  bug: '#800080',
};

const statusOptions = Object.keys(statusColors);
const sampleUsers = ['Alice', 'Bob', 'Charlie'];

const TaskDialog = ({ node, isOpen, onClose, onSave, onDelete }) => {
  const [label, setLabel] = useState(node?.data?.label || '');
  const [status, setStatus] = useState(node?.data?.status || 'todo');
  const [assignedTo, setAssignedTo] = useState(node?.data?.assignedTo || []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg min-w-[400px]">
        <h2 className="text-xl mb-4">Edit Task</h2>
        
        <div className="mb-4">
          <label className="block mb-2">Task Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">Status</label>
          <select
            className="w-full p-2 border rounded"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2">Assign to</label>
          <select
            multiple
            className="w-full p-2 border rounded"
            value={assignedTo}
            onChange={(e) => setAssignedTo([...e.target.selectedOptions].map(opt => opt.value))}
          >
            {sampleUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-between mt-6">
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={onDelete}
          >
            Delete Task
          </button>
          <div>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded mr-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => onSave({ label, status, assignedTo })}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FlowchartPage() {
 const { id } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'flowcharts', id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      }
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    const saveData = async () => {
      try {
        await updateDoc(doc(db, 'flowcharts', id), { nodes, edges });
      } catch (error) {
        console.error('Error saving flowchart:', error);
      }
    };
    saveData();
  }, [nodes, edges, id]);

  


  const onConnect = (params) => {
    params.markerEnd = { type: MarkerType.ArrowClosed };
    setEdges((eds) => addEdge(params, eds));
  };

  const addNode = () => {
    const newNode = {
      id: uuidv4(),
      data: { 
        label: 'New Task', 
        status: 'todo', 
        assignedTo: [] 
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      style: { 
        background: statusColors['todo'], 
        color: 'white', 
        padding: 10 
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeDoubleClick = (event, node) => {
    setSelectedNode(node);
    setDialogOpen(true);
  };

  const handleSave = ({ label, status, assignedTo }) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? {
              ...n,
              data: { ...n.data, label, status, assignedTo },
              style: { ...n.style, background: statusColors[status] },
            }
          : n
      )
    );
    setDialogOpen(false);
  };

  const handleDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter(
      (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
    ));
    setDialogOpen(false);
  };

  const statusCount = nodes.reduce((acc, n) => {
    const s = n.data.status;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const total = nodes.length || 1;

  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-0 left-0 z-10 p-4 flex gap-4 bg-gray-900 w-full">
        <button onClick={addNode} className="bg-blue-600 px-4 py-1 rounded">
          + Add Task
        </button>
        <div className="flex-1 bg-gray-700 h-8 rounded overflow-hidden">
          {Object.entries(statusCount).map(([status, count]) => (
            <div
              key={status}
              className="inline-block h-full"
              style={{
                width: `${(count / total) * 100}%`,
                background: statusColors[status],
              }}
              title={`${status}: ${((count / total) * 100).toFixed(0)}%`}
            />
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <MiniMap />
        <Background />
        <Controls className="right-0" position="top-right" />
      </ReactFlow>

      <TaskDialog
        node={selectedNode}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}                                                                                                                                         