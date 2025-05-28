'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/fierbase';
import { useRouter } from 'next/navigation';

export default function AdminGalleryPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        router.push('/admin/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login'); // Redirect to login page after logging out
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) {
    return <div className="text-center">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen p-6 pt-30 bg-gray-100">
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>

    {/* Admin Navigation Buttons */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  <button
    onClick={() => router.push('/admin/usersadding')}
    className="bg-white p-4 shadow rounded hover:bg-blue-50"
  >
    Users
  </button>

</div>

  </div>
  );
}
