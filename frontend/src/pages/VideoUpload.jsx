import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('uncategorized');
  const [tags, setTags] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  // IMPORTANT: keep this as a PHASE, not a human message (backend sometimes sends "Analyzing frame 3/20...")
  // Valid phases: idle, uploading, processing, analyzing, compressing, finalizing, completed, failed, flagged, error
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [videoId, setVideoId] = useState(null);
  const [analysisDetails, setAnalysisDetails] = useState({
    currentFrame: null,
    totalFrames: null,
    frameResults: [],
    statusMessage: ''
  });
  
  // Use ref to track frame results to prevent React batching issues
  const frameResultsRef = useRef([]);

  // Debug: Log when analysisDetails changes
  useEffect(() => {
    console.log('🔄 Analysis details state changed:', {
      totalFrames: analysisDetails.totalFrames,
      currentFrame: analysisDetails.currentFrame,
      frameResultsCount: analysisDetails.frameResults?.length || 0,
      frameResults: analysisDetails.frameResults,
      status: status
    });
  }, [analysisDetails, status]);
  const navigate = useNavigate();
  const { subscribeToVideo, onVideoProgress, onVideoComplete } = useSocket();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (videoId) {
      subscribeToVideo(videoId);

      // Fallback: polling (Render websockets can disconnect; <10s videos can finish before subscribe/connect)
      // This ensures the UI still advances to completed/flagged/failed even if socket events are missed.
      let pollInterval = null;
      const startPolling = () => {
        if (pollInterval) return;
        pollInterval = setInterval(async () => {
          try {
            const res = await api.get(`/api/videos/${videoId}`);
            const v = res?.data?.data?.video;
            if (!v) return;

            // Keep UI roughly in sync
            if (typeof v.processingProgress === 'number') setProcessingProgress(v.processingProgress);
            if (v.status) setStatus(String(v.status).toLowerCase());

            // When processing is done, stop polling and redirect
            if (['completed', 'flagged', 'failed'].includes(String(v.status).toLowerCase())) {
              clearInterval(pollInterval);
              pollInterval = null;
              if (['completed', 'flagged'].includes(String(v.status).toLowerCase())) {
                navigate(`/video/${videoId}`);
              }
            }
          } catch (e) {
            // ignore poll failures
          }
        }, 2000);
      };

      startPolling();
      
      const unsubscribeProgress = onVideoProgress((data) => {
        if (data.videoId === videoId) {
          setProcessingProgress(data.progress);
          // Normalize status into PHASE so UI conditions don't break when backend sends message-like statuses.
          setStatus((prev) => {
            const raw = data.status;
            if (!raw) {
              return (data.currentFrame || data.totalFrames) ? 'analyzing' : prev;
            }
            const s = String(raw).toLowerCase();
            const known = ['idle', 'uploading', 'processing', 'analyzing', 'compressing', 'finalizing', 'completed', 'failed', 'flagged', 'error'];
            if (known.includes(s)) return s;
            if (s.includes('analyzing frame') || s.includes('extracting frame') || s.includes('extracting frames') || s.includes('analyzing frames')) {
              return 'analyzing';
            }
            if (s.includes('compress')) return 'compressing';
            if (s.includes('final')) return 'finalizing';
            return prev;
          });
          
          // Always update analysis details if we have any frame-related data
          // This includes currentFrame, totalFrames, or frameResult
          const hasFrameData = data.currentFrame !== undefined || 
                              data.totalFrames !== undefined || 
                              data.frameResult !== undefined;
          
          if (hasFrameData) {
            console.log('📥 Received frame data:', { 
              currentFrame: data.currentFrame, 
              totalFrames: data.totalFrames, 
              hasFrameResult: !!data.frameResult,
              frameNumber: data.frameResult?.frameNumber
            });
            
            // CRITICAL FIX: Use functional update to ensure we always have the latest state
            setAnalysisDetails(prev => {
              // Always preserve existing frameResults - NEVER reset to empty array
              // Use ref to get the most up-to-date frame results (prev might be stale due to batching)
              const existingFrameResults = frameResultsRef.current.length > 0 ? frameResultsRef.current : (prev?.frameResults || []);
              
              const updated = {
                currentFrame: data.currentFrame !== undefined ? data.currentFrame : (prev?.currentFrame || null),
                totalFrames: data.totalFrames !== undefined ? data.totalFrames : (prev?.totalFrames || null),
                // Keep the human-readable backend status here (can be "Analyzing frame 3/20...")
                statusMessage: data.status || prev?.statusMessage || 'processing',
                frameResults: existingFrameResults // Start with existing results
              };
              
              // Add or update frame result ONLY if we have one
              if (data.frameResult && data.frameResult.frameNumber) {
                console.log('✅ Adding frame result:', data.frameResult.frameNumber, data.frameResult);
                
                // Remove any existing result for this frame number
                const filtered = existingFrameResults.filter(f => f && f.frameNumber !== data.frameResult.frameNumber);
                
                // Add the new result
                const newResults = [...filtered, data.frameResult].sort((a, b) => (a.frameNumber || 0) - (b.frameNumber || 0));
                
                updated.frameResults = newResults;
                frameResultsRef.current = newResults; // Update ref immediately to prevent batching issues
                console.log('📊 Frame results array updated:', newResults.length, 'frames');
                console.log('Frame numbers:', newResults.map(f => f.frameNumber).join(', '));
              } else {
                // No frameResult in this update - keep existing results
                console.log('⚠️ No frameResult in this update, preserving', existingFrameResults.length, 'existing frames');
                frameResultsRef.current = existingFrameResults; // Keep ref in sync
              }
              
              // Always create new array reference to force re-render
              updated.frameResults = [...updated.frameResults];
              
              console.log('🎯 Final state - frameResults count:', updated.frameResults.length);
              return updated;
            });
          }
        }
      });

      const unsubscribeComplete = onVideoComplete((data) => {
        if (data.videoId === videoId) {
          setProcessingProgress(100);
          setStatus(data.status);
          if (data.status === 'completed' || data.status === 'flagged') {
            setTimeout(() => {
              navigate(`/video/${videoId}`);
            }, 2000);
          }
          // Stop polling once we have a definitive completion
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      });

      return () => {
        unsubscribeProgress?.();
        unsubscribeComplete?.();
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      };
    }
  }, [videoId, subscribeToVideo, onVideoProgress, onVideoComplete, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please select a video file.');
        return;
      }

      // Validate file size (500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('File size exceeds 500MB limit.');
        return;
      }

      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setError('');
    setStatus('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('tags', tags);

    try {
      const response = await api.post('/api/videos/upload', formData, {
        // Don't set Content-Type - Axios will set it automatically with boundary
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      setUploadProgress(100);
      setStatus('processing');
      setVideoId(response.data.data.video._id);
      // Reset analysis details for new upload
      frameResultsRef.current = []; // Reset ref
      setAnalysisDetails({
        currentFrame: null,
        totalFrames: null,
        frameResults: [],
        statusMessage: ''
      });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Upload failed';
      setError(errorMessage);
      setStatus('error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Video</h1>
        <p className="mt-2 text-gray-600">Upload and process your video files</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 8M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="video/*"
                      onChange={handleFileChange}
                      disabled={status === 'uploading' || status === 'processing'}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">MP4, MOV, AVI, WEBM up to 500MB</p>
                {file && (
                  <p className="text-sm text-gray-900 mt-2">
                    Selected: {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {status === 'uploading' && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Processing Progress */}
                  {(['processing', 'analyzing', 'compressing', 'finalizing'].includes(status)) && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {status === 'analyzing' && analysisDetails.currentFrame 
                      ? `Analyzing frame ${analysisDetails.currentFrame}/${analysisDetails.totalFrames || '?'}...`
                      : status === 'compressing'
                      ? 'Compressing video...'
                      : `Processing: ${status}`}
                  </span>
                  <span>{Math.round(processingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Frame-by-Frame Analysis - Show prominently during processing */}
                      {(['processing', 'analyzing', 'compressing', 'finalizing'].includes(status)) && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center">
                      <span className="mr-2 text-2xl">🔍</span>
                      Live Frame-by-Frame Analysis
                    </h3>
                    {(analysisDetails.totalFrames || analysisDetails.frameResults.length > 0) && (
                      <div className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                        {analysisDetails.frameResults.length} / {analysisDetails.totalFrames || '?'} frames
                      </div>
                    )}
                  </div>

                  {/* Current Frame Being Analyzed */}
                  {analysisDetails.currentFrame && analysisDetails.totalFrames && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Currently analyzing: <span className="font-bold text-blue-700">Frame {analysisDetails.currentFrame}</span>
                        </span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(analysisDetails.currentFrame / analysisDetails.totalFrames) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Frame Results Grid - Show immediately when first frame arrives */}
                  {analysisDetails.frameResults && Array.isArray(analysisDetails.frameResults) && analysisDetails.frameResults.length > 0 && (
                    <div key={`frame-results-${analysisDetails.frameResults.length}`} className="mt-4">
                      <div className="text-sm font-semibold text-blue-900 mb-3 flex items-center justify-between">
                        <span>📊 Analysis Results ({analysisDetails.frameResults.length} / {analysisDetails.totalFrames || '?'} frames):</span>
                        <span className="text-xs text-blue-600 animate-pulse font-bold">⚡ LIVE</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                        {analysisDetails.frameResults
                          .filter(r => r && r.frameNumber) // Filter out any invalid results
                          .sort((a, b) => (a.frameNumber || 0) - (b.frameNumber || 0))
                          .map((result) => {
                            // Calculate timestamp based on frame number and interval
                            // For videos < 10s: interval is 2s, for videos >= 10s: interval is 5s
                            const interval = analysisDetails.totalFrames > 1 
                              ? (analysisDetails.totalFrames <= 4 ? 2 : 5) 
                              : 0;
                            const timestamp = ((result.frameNumber - 1) * interval).toFixed(1);
                            return (
                              <div
                                key={result.frameNumber}
                                className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                                  result.isExplicit || result.isViolent
                                    ? 'bg-red-50 border-red-400 text-red-900 shadow-md'
                                    : 'bg-green-50 border-green-400 text-green-900'
                                }`}
                              >
                                {/* Frame Header */}
                                <div className="flex justify-between items-center mb-3">
                                  <div>
                                    <div className="font-bold text-base">Frame {result.frameNumber}</div>
                                    <div className="text-xs opacity-75 mt-1">Time: {timestamp}s</div>
                                  </div>
                                  <div className={`text-lg font-bold px-3 py-1 rounded-full ${
                                      result.error
                                        ? 'bg-yellow-200 text-yellow-900'
                                        : result.isExplicit 
                                      ? 'bg-red-200 text-red-800'
                                      : result.isViolent
                                      ? 'bg-orange-200 text-orange-800'
                                      : 'bg-green-200 text-green-800'
                                  }`}>
                                      {result.error ? '⚠️ ERROR' : result.isExplicit ? '⚠️ EXPLICIT' : result.isViolent ? '⚠️ VIOLENT' : '✓ SAFE'}
                                  </div>
                                </div>
                                
                                  {result.error && (
                                    <div className="mb-2 text-xs text-yellow-900 bg-yellow-100 border border-yellow-300 rounded px-2 py-1">
                                      {String(result.error)}
                                    </div>
                                  )}

                                {/* Detection Scores */}
                                {result.details && (
                                  <div className="space-y-2">
                                    {result.details.nudity !== undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">Nudity:</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full ${
                                                result.details.nudity > 0.5 ? 'bg-red-600' : 'bg-gray-400'
                                              }`}
                                              style={{ width: `${result.details.nudity * 100}%` }}
                                            ></div>
                                          </div>
                                          <span className={`text-xs font-bold min-w-[3rem] text-right ${
                                            result.details.nudity > 0.5 ? 'text-red-700' : 'text-gray-700'
                                          }`}>
                                            {(result.details.nudity * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {result.details.offensive !== undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">Offensive:</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full ${
                                                result.details.offensive > 0.5 ? 'bg-red-600' : 'bg-gray-400'
                                              }`}
                                              style={{ width: `${result.details.offensive * 100}%` }}
                                            ></div>
                                          </div>
                                          <span className={`text-xs font-bold min-w-[3rem] text-right ${
                                            result.details.offensive > 0.5 ? 'text-red-700' : 'text-gray-700'
                                          }`}>
                                            {(result.details.offensive * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {result.details.weapon !== undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">Weapon:</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full ${
                                                result.details.weapon > 0.5 ? 'bg-red-600' : 'bg-gray-400'
                                              }`}
                                              style={{ width: `${result.details.weapon * 100}%` }}
                                            ></div>
                                          </div>
                                          <span className={`text-xs font-bold min-w-[3rem] text-right ${
                                            result.details.weapon > 0.5 ? 'text-red-700' : 'text-gray-700'
                                          }`}>
                                            {(result.details.weapon * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="mt-3 pt-2 border-t border-current border-opacity-20 text-xs opacity-70">
                                  Confidence: {(result.confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Show loading state only if no frames yet */}
                  {(!analysisDetails.frameResults || analysisDetails.frameResults.length === 0) && (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <div className="text-sm text-blue-700 font-medium">
                        {analysisDetails.totalFrames 
                          ? `Extracting ${analysisDetails.totalFrames} frames... Analysis will begin shortly`
                          : 'Preparing content analysis...'}
                      </div>
                      {/* Debug info - always show to help diagnose */}
                      <div className="mt-2 text-xs text-gray-500 space-y-1 p-2 bg-gray-100 rounded border border-gray-300">
                        <div className="font-bold mb-1">🔍 Debug Info:</div>
                        <div>totalFrames: <strong>{String(analysisDetails.totalFrames || 'null')}</strong></div>
                        <div>frameResults count: <strong>{String(analysisDetails.frameResults?.length || 0)}</strong></div>
                        <div>status: <strong>{status}</strong></div>
                        <div>currentFrame: <strong>{String(analysisDetails.currentFrame || 'null')}</strong></div>
                        <div>isArray: <strong>{String(Array.isArray(analysisDetails.frameResults))}</strong></div>
                        {analysisDetails.frameResults && analysisDetails.frameResults.length > 0 ? (
                          <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded">
                            <div className="text-green-800 font-bold">✓ Frame results available!</div>
                            <div className="text-green-700">Frame numbers: {analysisDetails.frameResults.map(f => f?.frameNumber || '?').join(', ')}</div>
                            <div className="text-green-600 text-xs mt-1">Condition: {String(analysisDetails.frameResults && Array.isArray(analysisDetails.frameResults) && analysisDetails.frameResults.length > 0)}</div>
                          </div>
                        ) : (
                          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                            <div className="text-yellow-800">⚠️ No frame results yet</div>
                            <div className="text-yellow-700 text-xs">Waiting for frame analysis...</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary Footer */}
                  {analysisDetails.frameResults.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-blue-300">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-blue-900">Overall Status:</div>
                        <div className="text-sm font-bold">
                          {analysisDetails.frameResults.filter(r => r.isExplicit || r.isViolent).length > 0 ? (
                            <span className="text-red-700">
                              ⚠️ {analysisDetails.frameResults.filter(r => r.isExplicit || r.isViolent).length} of {analysisDetails.frameResults.length} frames flagged
                            </span>
                          ) : (
                            <span className="text-green-700">
                              ✓ {analysisDetails.frameResults.length} frames analyzed - All safe
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={status === 'uploading' || status === 'processing'}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={status === 'uploading' || status === 'processing'}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={status === 'uploading' || status === 'processing'}
            >
              <option value="uncategorized">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              disabled={status === 'uploading' || status === 'processing'}
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={!file || status === 'uploading' || status === 'processing'}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'uploading' ? 'Uploading...' : 
               status === 'processing' ? 'Processing...' : 
               'Upload Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoUpload;
