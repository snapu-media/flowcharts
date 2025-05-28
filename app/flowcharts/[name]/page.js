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
import { useEffect, useState, useMemo } from 'react';
import { useRef} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db,auth } from "../../../lib/fierbase";  
import { doc, onSnapshot, setDoc, updateDoc, getDoc  } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';


// Add user role context (you'll need to implement your auth system)
// const useUserRole = () => {
//   // Replace this with your actual authentication logic
//   const [userRole, setUserRole] = useState('employee'); // 'admin', 'manager', or 'employee'
//   return userRole;
// };

 const useUserRole = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('Logged in user email:', user.email); // Log email to console
        setUserEmail(user.email);
        try {
          // Query users collection where email matches
          const q = query(
            collection(db, 'users'),
            where('email', '==', user.email)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserRole(userDoc.role);
          } else {
            console.error('User document not found');
            setUserRole('employee'); // Default role
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('employee');
        }
      } else {
        setUserRole(null);
        setUserEmail(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { userRole, loading, userEmail };
};


const statusColors = {
  todo: '#808080',
  progress: '#FFA500',
  completed: '#008000',
  aborted: '#FF0000',
  bug: '#800080',
};

const statusOptions = Object.keys(statusColors);
const sampleUsers = ['Alice', 'Bob', 'Charlie'];

const TaskDialog = ({ node, isOpen, onClose, onSave, onDelete, userRole ,users}) => {
 const [label, setLabel] = useState('');
  const [status, setStatus] = useState('todo');
  const [assignedTo, setAssignedTo] = useState([]);

  // Update state when node changes
  useEffect(() => {
    if (node) {
      setLabel(node.data?.label || '');
      setStatus(node.data?.status || 'todo');
      setAssignedTo(node.data?.assignedTo || []);
    }
  }, [node]); // This effect runs whenever the node prop changes

  if (!isOpen || !node) return null; 

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
            disabled={userRole === 'employee'}
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
  disabled={userRole === 'employee'}
>
  {users.map((user) => (
    <option key={user.name} value={user.name}>
      {user.name} ({user.email})
    </option>
  ))}
</select>
        </div>

        <div className="flex justify-between mt-6">
          {userRole !== 'employee' && (
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={onDelete}
            >
              Delete Task
            </button>
          )}
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
  const { name } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { userRole, loading, userEmail  } = useUserRole();
const [users, setUsers] = useState([]);

  // Add useEffect to fetch users
  // Update the useEffect for fetching users
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const usersList = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.name && userData.email) {
          usersList.push({
            name: userData.name,
            email: userData.email
          });
        }
      });
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  fetchUsers();
}, []);


  // Edge types with custom markers
  const edgeTypes = useMemo(
    () => ({
      custom: CustomEdge,
    }),
    []
  );

  useEffect(() => {
    const docRef = doc(db, 'flowcharts', name);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.name !== name) {
          console.warn('Document name mismatch! Fixing...');
          setDoc(docRef, { name }, { merge: true });
        }
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } else {
        setDoc(docRef, { name, nodes: [], edges: [] });
      }
    });
    return () => unsubscribe();
  }, [name]);



  const sendAssignmentEmails = async (assignedNames, taskName) => {
  try {
    // Get email addresses for assigned users
    const userEmails = users
      .filter(user => assignedNames.includes(user.name))
      .map(user => user.email);

    if (userEmails.length === 0) return;

    const response = await fetch('/api/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toEmails: userEmails,
        taskName: taskName,
        flowchartName: name,
        assignedBy: userEmail // Get from useUserRole hook
      }),
    });

    const data = await response.json();
    if (!data.success) {
      console.error('Failed to send emails:', data.error);
    }
  } catch (error) {
    console.error('Error sending emails:', error);
  }
};


  const onConnect = (params) => {
    if (userRole === 'employee') return;
    params.markerEnd = { type: MarkerType.ArrowClosed };
    setEdges((eds) => addEdge(params, eds));
  };

  const addNode = () => {
    if (userRole === 'employee') return;
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

  const saveFlowchart = async () => {
    try {
      await setDoc(doc(db, 'flowcharts', name), {
        name,
        nodes,
        edges,
      }, { merge: true });
      alert('Flowchart saved successfully!');
    } catch (error) {
      console.error('Error saving flowchart:', error);
      alert('Error saving flowchart. Check console for details.');
    }
  };

  const handleNodeDoubleClick = (event, node) => {
    setSelectedNode(node);
    setDialogOpen(true);
  };

  const handleEdgeClick = (event, edge) => {
    if (userRole === 'employee') return;
    setSelectedEdge(edge);
  };

  const deleteSelectedEdge = () => {
    if (selectedEdge) {
      setEdges(eds => eds.filter(e => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  };

 const handleSave = async ({ label, status, assignedTo }) => {
  // Get previous assignments to detect new assignments
  const previousAssignments = selectedNode.data.assignedTo || [];
  const newAssignments = assignedTo.filter(name => !previousAssignments.includes(name));

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
  
  // Send emails only for new assignments
  if (newAssignments.length > 0) {
    await sendAssignmentEmails(newAssignments, label);
  }

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
  <div className="absolute top-0 left-0 z-10 p-4 flex gap-4 bg-gray-900 w-full items-center">
    {/* Add Task and Save Flowchart Buttons */}

      <>
        <button 
          onClick={addNode} 
          className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700 transition-colors"
        >
          + Add Task
        </button>
        <button 
          onClick={saveFlowchart} 
          className="bg-green-600 px-4 py-2 rounded text-white hover:bg-green-700 transition-colors"
        >
          💾 Save Flowchart
        </button>
      </>
        {/* {userRole !== 'employee' && ()} */}
    
    {/* Status Progress Bar */}
   <div className="flex-1 bg-gray-700 h-8 rounded overflow-hidden ml-4 relative">
  {Object.entries(statusCount).map(([status, count]) => {
    const percentage = (count / total) * 100;
    return (
      <div
        key={status}
        className="inline-block h-full relative"
        style={{
          width: `${percentage}%`,
          background: statusColors[status],
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold mix-blend-difference">
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  })}
</div>
  </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={userRole !== 'employee' ? onNodesChange : undefined}
        onEdgesChange={userRole !== 'employee' ? onEdgesChange : undefined}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeClick={handleEdgeClick}
        edgeTypes={edgeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <MiniMap />
        <Background />
        <Controls className="right-0 pt-20" position="top-right" />
      </ReactFlow>

      {selectedEdge && userRole !== 'employee' && (
        <div className="absolute top-20 right-4 bg-white p-4 rounded shadow-lg">
          <button 
            onClick={deleteSelectedEdge}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Delete Connection
          </button>
        </div>
      )}

      <TaskDialog
        node={selectedNode}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        userRole={userRole}
         users={users}
      />
    </div>
  );
}

// Custom edge component for better interaction
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  const edgePath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={style}
    />
  );
};