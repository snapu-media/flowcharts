'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '../lib/fierbase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot,getDoc, query, where } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const [charts, setCharts] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'flowcharts'), (snapshot) => {
      const chartsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setCharts(chartsData);
    });
    return () => unsubscribe();
  }, []);

  const createNew = async () => {
    const name = prompt('Enter flowchart name (URL-friendly):');
    if (!name) return;

    try {
      // Create document with name as ID
      await setDoc(doc(db, 'flowcharts', name), {
        name,
        nodes: [],
        edges: [],
        createdAt: new Date()
      });
      router.push(`/flowcharts/${name}`);
    } catch (error) {
      console.error("Error creating chart:", error);
      alert('Name must be unique and URL-friendly!');
    }
  };

  const renameChart = async (oldName, newName) => {
    if (!newName) return;
    
    try {
      // Get existing document
      const docRef = doc(db, 'flowcharts', oldName);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return;

      // Create new document with updated name
      await setDoc(doc(db, 'flowcharts', newName), {
        ...docSnap.data(),
        name: newName
      });
      
      // Delete old document
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error renaming chart:", error);
      alert('Name must be unique and URL-friendly!');
    }
  };

  const duplicateChart = async (originalName) => {
    try {
      const docSnap = await getDoc(doc(db, 'flowcharts', originalName));
      if (!docSnap.exists()) return;
      
      const newName = `${originalName}-copy`;
      await setDoc(doc(db, 'flowcharts', newName), {
        ...docSnap.data(),
        name: newName,
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Error duplicating chart:", error);
    }
  };

  const deleteChart = async (name) => {
    try {
      await deleteDoc(doc(db, 'flowcharts', name));
    } catch (error) {
      console.error("Error deleting chart:", error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Flowchart Dashboard</h1>
      <button onClick={createNew} className="bg-blue-600 px-4 py-2 rounded mb-4">
        ➕ Create New Flowchart
      </button>
      <div className="space-y-2">
        {charts.map((chart) => (
          <div
            key={chart.id}
            className="bg-gray-800 p-4 rounded flex justify-between items-center"
          >
            <div
              className="cursor-pointer"
              onClick={() => router.push(`/flowcharts/${chart.name}`)}
            >
              📊 {chart.name}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => {
                  const newName = prompt('Rename Flowchart:', chart.name);
                  if (newName) renameChart(chart.name, newName);
                }}
                className="text-yellow-400"
              >
                Rename
              </button>
              <button
                onClick={() => duplicateChart(chart.name)}
                className="text-green-400"
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this flowchart?')) deleteChart(chart.name);
                }}
                className="text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}