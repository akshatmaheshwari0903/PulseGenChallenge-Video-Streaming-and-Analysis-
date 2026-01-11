import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { subscribeToVideo, onVideoProgress, onVideoComplete } = useSocket();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    category: '',
    tags: ''
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchVideo();
    fetchCategories();
  }, [id]);

  useEffect(() => {
    if (video && (video.status === 'processing' || video.status === 'uploading')) {
      subscribeToVideo(video._id);
      
      const unsubscribeProgress = onVideoProgress((data) => {
        if (data.videoId === video._id) {
          setProcessingProgress(data.progress);
          if (data.status !== video.status) {
            fetchVideo(); // Refresh video data
          }
        }
      });

      const unsubscribeComplete = onVideoComplete((data) => {
        if (data.videoId === video._id) {
          fetchVideo(); // Refresh video data
        }
      });

      return () => {
        unsubscribeProgress?.();
        unsubscribeComplete?.();
      };
    }
  }, [video?._id, video?.status, subscribeToVideo, onVideoProgress, onVideoComplete]);

  const fetchVideo = async () => {
    try {
      const response = await api.get(`/api/videos/${id}`);
      setVideo(response.data.data.video);
      setEditData({
        title: response.data.data.video.title,
        description: response.data.data.video.description || '',
        category: response.data.data.video.category || '',
        tags: response.data.data.video.tags?.join(', ') || ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch video:', error);
      setError('Video not found');
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/api/videos/${id}`, editData);
      setIsEditing(false);
      fetchVideo();
    } catch (error) {
      console.error('Failed to update video:', error);
      alert('Failed to update video');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await api.delete(`/api/videos/${id}`);
      navigate('/videos');
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Video not found'}
        </div>
        <Link to="/videos" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          ← Back to Video Library
        </Link>
      </div>
    );
  }

  const canEdit = (user?.role === 'editor' || user?.role === 'admin') && 
                  (user?.role === 'admin' || video.uploadedBy._id === user?._id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/videos" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Video Library
      </Link>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Video Player */}
        <div className="aspect-video bg-black">
          {video.status === 'completed' || video.status === 'flagged' ? (
            <ReactPlayer
              url={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/videos/${id}/stream?token=${encodeURIComponent(token || localStorage.getItem('token') || '')}`}
              controls
              width="100%"
              height="100%"
              playing={false}
              config={{
                file: {
                  attributes: {
                    crossOrigin: 'anonymous'
                  },
                  forceHLS: false,
                  forceDASH: false
                }
              }}
            />
          ) : video.status === 'processing' || video.status === 'uploading' ? (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
                <p className="text-lg font-semibold">Processing Video...</p>
                <p className="text-sm mt-2">{Math.round(processingProgress || video.processingProgress || 0)}%</p>
                <div className="w-64 bg-gray-700 rounded-full h-2 mt-4 mx-auto">
                  <div
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: `${processingProgress || video.processingProgress || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>Video processing failed</p>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  className="text-2xl font-bold text-gray-900 w-full border border-gray-300 rounded-md px-3 py-2"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
              )}
            </div>
            {canEdit && !isEditing && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
            {isEditing && (
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    fetchVideo();
                  }}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex items-center space-x-2 mb-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              video.status === 'completed' ? 'bg-green-100 text-green-800' :
              video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
              video.status === 'flagged' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {video.status}
            </span>
            {video.sensitivityStatus && (
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                video.sensitivityStatus === 'flagged' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {video.sensitivityStatus}
              </span>
            )}
          </div>

          {/* Video Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-600">Size:</span>
              <span className="ml-2 font-medium">{formatFileSize(video.fileSize)}</span>
            </div>
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="ml-2 font-medium">{formatDuration(video.duration)}</span>
            </div>
            <div>
              <span className="text-gray-600">Uploaded:</span>
              <span className="ml-2 font-medium">{new Date(video.uploadedAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Category:</span>
              <span className="ml-2 font-medium">{video.category || 'Uncategorized'}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            {isEditing ? (
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            ) : (
              <p className="text-gray-600">{video.description || 'No description provided'}</p>
            )}
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {video.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded By */}
          <div className="text-sm text-gray-600 mb-4">
            Uploaded by: <span className="font-medium">{video.uploadedBy?.username || 'Unknown'}</span>
          </div>

          {/* Content Analysis Results */}
          {video.sensitivityAnalysis && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Analysis Results</h3>
              
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Analysis Status:</span>
                    <span className={`ml-2 font-medium ${
                      video.sensitivityAnalysis.status === 'flagged' ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {video.sensitivityAnalysis.status === 'flagged' ? '⚠️ Flagged' : '✓ Safe'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Confidence:</span>
                    <span className="ml-2 font-medium">
                      {(video.sensitivityAnalysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {video.sensitivityAnalysis.frameAnalysis && (
                    <>
                      <div>
                        <span className="text-gray-600">Frames Analyzed:</span>
                        <span className="ml-2 font-medium">
                          {video.sensitivityAnalysis.frameAnalysis.totalFrames || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Flagged Frames:</span>
                        <span className="ml-2 font-medium text-red-700">
                          {(video.sensitivityAnalysis.frameAnalysis.explicitFrames || 0) + 
                           (video.sensitivityAnalysis.frameAnalysis.violentFrames || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Reasons */}
                {video.sensitivityAnalysis.reasons && video.sensitivityAnalysis.reasons.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Reasons:</span>
                    <ul className="mt-1 list-disc list-inside text-sm text-gray-600">
                      {video.sensitivityAnalysis.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Frame-by-Frame Results */}
              {video.sensitivityAnalysis.frameAnalysis && 
               video.sensitivityAnalysis.frameAnalysis.frameResults && 
               video.sensitivityAnalysis.frameAnalysis.frameResults.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Frame-by-Frame Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {video.sensitivityAnalysis.frameAnalysis.frameResults
                      .sort((a, b) => a.frameNumber - b.frameNumber)
                      .map((result) => (
                        <div
                          key={result.frameNumber}
                          className={`p-3 rounded-lg border ${
                            result.isExplicit || result.isViolent
                              ? 'bg-red-50 border-red-200'
                              : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              Frame {result.frameNumber}
                            </span>
                            <span className="text-xs">
                              {result.isExplicit ? '⚠️ Explicit' : 
                               result.isViolent ? '⚠️ Violent' : 
                               '✓ Safe'}
                            </span>
                          </div>
                          
                          {result.details && (
                            <div className="space-y-1 text-xs">
                              {result.details.nudity !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Nudity:</span>
                                  <span className={`font-medium ${
                                    result.details.nudity > 0.5 ? 'text-red-700' : 'text-gray-700'
                                  }`}>
                                    {(result.details.nudity * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              {result.details.offensive !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Offensive:</span>
                                  <span className={`font-medium ${
                                    result.details.offensive > 0.5 ? 'text-red-700' : 'text-gray-700'
                                  }`}>
                                    {(result.details.offensive * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              {result.details.weapon !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Weapon:</span>
                                  <span className={`font-medium ${
                                    result.details.weapon > 0.5 ? 'text-red-700' : 'text-gray-700'
                                  }`}>
                                    {(result.details.weapon * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-gray-500">
                            Confidence: {(result.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Analysis Timestamp */}
              {video.sensitivityAnalysis.timestamp && (
                <div className="mt-4 text-xs text-gray-500">
                  Analyzed: {new Date(video.sensitivityAnalysis.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
