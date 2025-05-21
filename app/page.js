'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/fierbase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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
    const id = uuidv4();
    const newChart = {
      name: `Flowchart ${charts.length + 1}`,
      nodes: [],
      edges: []
    };
    try {
      await setDoc(doc(db, 'flowcharts', id), newChart);
      router.push(`/flowcharts/${id}`);
    } catch (error) {
      console.error("Error creating chart:", error);
    }
  };

  const renameChart = async (id, newName) => {
    try {
      await updateDoc(doc(db, 'flowcharts', id), { name: newName });
    } catch (error) {
      console.error("Error renaming chart:", error);
    }
  };

  const duplicateChart = async (id) => {
    try {
      const originalDoc = await getDoc(doc(db, 'flowcharts', id));
      if (!originalDoc.exists()) return;
      
      const originalData = originalDoc.data();
      const newId = uuidv4();
      await setDoc(doc(db, 'flowcharts', newId), {
        ...originalData,
        name: `${originalData.name} Copy`
      });
    } catch (error) {
      console.error("Error duplicating chart:", error);
    }
  };

  const deleteChart = async (id) => {
    try {
      await deleteDoc(doc(db, 'flowcharts', id));
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
              onClick={() => router.push(`/flowcharts/${chart.id}`)}
            >
              📊 {chart.name}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => {
                  const newName = prompt('Rename Flowchart:', chart.name);
                  if (newName) renameChart(chart.id, newName);
                }}
                className="text-yellow-400"
              >
                Rename the chart
              </button>
              <button
                onClick={() => duplicateChart(chart.id)}
                className="text-green-400"
              >
                Duplicate this 
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this flowchart?')) deleteChart(chart.id);
                }}
                className="text-red-400"
              >
                Delete this
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}