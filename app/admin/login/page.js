'use client';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../lib/fierbase'; // Import db
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        // Check if user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // Create user document if missing
          await setDoc(userRef, {
            email: currentUser.email,
            name: currentUser.displayName || 'New User',
            role: 'employee', // Default role
            createdAt: new Date().toISOString()
          });
        }

        // Redirect after handling user document
        router.push('/admin');
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      
      // No need to redirect here, useEffect will handle it
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      console.error('Login error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      {!user ? (
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-center">Admin Login</h2>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full p-3 border border-gray-300 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full p-3 border border-gray-300 rounded"
          />
          <button 
            type="submit" 
            className="w-full bg-amber-500 hover:bg-amber-600 text-white p-3 rounded font-semibold"
          >
            Login
          </button>
        </form>
      ) : (
        <div className="flex justify-center items-center h-screen">
          <p className="text-xl">Redirecting...</p>
        </div>
      )}
    </div>
  );
}