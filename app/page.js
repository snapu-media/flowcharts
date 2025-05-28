'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '../lib/fierbase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc, query, where } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FlowchartDialog = ({ onClose, onSubmit, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [endDate, setEndDate] = useState(
    initialData?.endDate instanceof Date ? initialData.endDate :
    initialData?.endDate?.toDate() || null
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg ">
        <h2 className="text-xl font-bold mb-4">{initialData ? 'Edit Flowchart' : 'New Flowchart'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <DatePicker
              selected={endDate}
              onChange={setEndDate}
              className="w-full p-2 border rounded"
              dateFormat="dd/MM/yyyy"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit({ name, category, endDate })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  const router = useRouter();
  const [charts, setCharts] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'flowcharts'), (snapshot) => {
      const chartsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          endDate: data.endDate?.toDate()
        };
      });
      setCharts(chartsData);
      setCategories([...new Set(chartsData.map(chart => chart.category))]);
    });
    return () => unsubscribe();
  }, []);

  const filteredCharts = charts.filter(chart => {
    const categoryMatch = selectedCategory === 'all' || chart.category === selectedCategory;
    const dateMatch = dateFilter === 'all' || 
      (dateFilter === 'specific' && chart.endDate?.toDateString() === selectedDate?.toDateString()) ||
      (dateFilter === 'range' && chart.endDate >= startDate && chart.endDate <= endDate);
    return categoryMatch && dateMatch;
  });

  const handleCreateUpdate = async (data) => {
    try {
      const chartData = {
        name: data.name,
        category: data.category,
        endDate: data.endDate,
        nodes: editingChart?.nodes || [],
        edges: editingChart?.edges || [],
        createdAt: editingChart?.createdAt || new Date()
      };

      const docRef = doc(db, 'flowcharts', data.name);
      
      if (editingChart) {
        // Preserve existing createdAt if available
        chartData.createdAt = editingChart.createdAt || new Date();
        await updateDoc(docRef, chartData);
      } else {
        await setDoc(docRef, chartData);
        router.push(`/flowcharts/${data.name}`);
      }
      
      setShowDialog(false);
      setEditingChart(null);
    } catch (error) {
      console.error("Error saving chart:", error);
      alert('Error saving chart. Name must be unique!');
    }
  };

  const editChart = (chart) => {
    setEditingChart(chart);
    setShowDialog(true);
  };

  const deleteChart = async (chartId) => {
    try {
      await deleteDoc(doc(db, 'flowcharts', chartId));
    } catch (error) {
      console.error("Error deleting chart:", error);
      alert('Error deleting flowchart');
    }
  };

  const renameChart = async (oldName, newName) => {
    try {
      const chartRef = doc(db, 'flowcharts', oldName);
      const chartSnap = await getDoc(chartRef);

      if (chartSnap.exists()) {
        const chartData = chartSnap.data();
        await setDoc(doc(db, 'flowcharts', newName), {
          ...chartData,
          name: newName
        });
        await deleteDoc(chartRef);
      }
    } catch (error) {
      console.error("Error renaming chart:", error);
      alert('Error renaming flowchart');
    }
  };

  const duplicateChart = async (chartName) => {
    try {
      const chartRef = doc(db, 'flowcharts', chartName);
      const chartSnap = await getDoc(chartRef);
      const newName = `${chartName}-Copy`;

      if (chartSnap.exists()) {
        const chartData = chartSnap.data();
        await setDoc(doc(db, 'flowcharts', newName), {
          ...chartData,
          name: newName,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error("Error duplicating chart:", error);
      alert('Error duplicating flowchart');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Flowchart Manager</h1>
          <button 
            onClick={() => setShowDialog(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Flowchart
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label>Category:</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All</option>
              {categories.map(cat => (
                <option key={cat || 'uncategorized'} value={cat}>
                  {cat || 'Uncategorized'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label>Date Filter:</label>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All</option>
              <option value="specific">Specific Date</option>
              <option value="range">Date Range</option>
            </select>
          </div>

          {dateFilter === 'specific' && (
            <DatePicker
              selected={selectedDate}
              onChange={setSelectedDate}
              className="p-2 border rounded"
              placeholderText="Select date"
            />
          )}

          {dateFilter === 'range' && (
            <div className="flex gap-2">
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                className="p-2 border rounded"
                placeholderText="Start Date"
              />
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                className="p-2 border rounded"
                placeholderText="End Date"
              />
            </div>
          )}
        </div>

        {/* Charts List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {filteredCharts.map((chart) => (
            <div
              key={chart.id}
              className="group flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center cursor-pointer w-full" onClick={() => router.push(`/flowcharts/${chart.name}`)}>
                <div className="bg-blue-100 p-2 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.4145.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{chart.name}</h3>
                  <div className="text-sm text-gray-500">
                    <span>Category: {chart.category}</span>
                    <span className="mx-2">|</span>
                    <span>End Date: {chart.endDate?.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => editChart(chart)}
                  className="text-gray-500 hover:text-blue-600 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const newName = prompt('Rename Flowchart:', chart.name);
                    if (newName) renameChart(chart.name, newName);
                  }}
                  className="text-gray-500 hover:text-blue-600 transition-colors duration-200 p-2 rounded-lg hover:bg-blue-50"
                  title="Rename"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={() => duplicateChart(chart.name)}
                  className="text-gray-500 hover:text-green-600 transition-colors duration-200 p-2 rounded-lg hover:bg-green-50"
                  title="Duplicate"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this flowchart?')) deleteChart(chart.id);
                  }}
                  className="text-gray-500 hover:text-red-600 transition-colors duration-200 p-2 rounded-lg hover:bg-red-50"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {showDialog && (
          <FlowchartDialog
            onClose={() => {
              setShowDialog(false);
              setEditingChart(null);
            }}
            onSubmit={handleCreateUpdate}
            initialData={editingChart}
          />
        )}

        {charts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-24 h-24 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No flowcharts found. Create your first one!</p>
          </div>
        )}
      </div>
    </main>
  );
}