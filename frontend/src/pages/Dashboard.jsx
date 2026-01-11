import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, videosRes] = await Promise.all([
        api.get('/api/users/stats'),
        api.get('/api/videos?limit=5&sortBy=uploadedAt&sortOrder=desc')
      ]);

      setStats(statsRes.data.data.stats);
      setRecentVideos(videosRes.data.data.videos);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Videos',
      value: stats?.totalVideos || 0,
      color: 'bg-blue-500',
      icon: '📹'
    },
    {
      title: 'Completed',
      value: stats?.completedVideos || 0,
      color: 'bg-green-500',
      icon: '✅'
    },
    {
      title: 'Flagged',
      value: stats?.flaggedVideos || 0,
      color: 'bg-yellow-500',
      icon: '⚠️'
    },
    {
      title: 'Processing',
      value: stats?.processingVideos || 0,
      color: 'bg-purple-500',
      icon: '⚙️'
    }
  ];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      flagged: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      uploading: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.uploading;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user?.username}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-full p-3 text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Storage Info */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage</h2>
          <p className="text-2xl font-bold text-gray-900">
            {formatFileSize(stats.totalSize)}
          </p>
        </div>
      )}

      {/* Recent Videos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Videos</h2>
          <Link
            to="/videos"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {recentVideos.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No videos uploaded yet.</p>
              {(user?.role === 'editor' || user?.role === 'admin') && (
                <Link
                  to="/upload"
                  className="mt-4 inline-block text-primary-600 hover:text-primary-700"
                >
                  Upload your first video →
                </Link>
              )}
            </div>
          ) : (
            recentVideos.map((video) => (
              <Link
                key={video._id}
                to={`/video/${video._id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{video.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(video.uploadedAt).toLocaleDateString()} • {formatFileSize(video.fileSize)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(video.status)}`}>
                      {video.status}
                    </span>
                    {video.sensitivityStatus && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        video.sensitivityStatus === 'flagged' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {video.sensitivityStatus}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
