import React, { useState, useEffect, useRef } from 'react'
import LycorisSpecimen from '@/components/ui/lycoris-specimen'
import {
  predictFlower,
  checkBackendHealth,
  PredictionResponse,
  HealthResponse,
} from '@/services/predictionService'
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Cpu,
  Layers,
  Database,
  Info,
  Menu,
  X,
  Check,
  ChevronRight,
} from 'lucide-react'

// Sample flowers for quick one-click testing
const SAMPLE_FLOWERS = [
  {
    name: 'Tiger Lily',
    url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=600&q=80',
    description: 'Vibrant orange spotted lily',
  },
  {
    name: 'Sunflower',
    url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=600&q=80',
    description: 'Bright golden Helianthus',
  },
  {
    name: 'Rose',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    description: 'Deep crimson garden rose',
  },
  {
    name: 'Water Lily',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    description: 'Aquatic Nymphaea blossom',
  },
]

export default function App() {
  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Backend status
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  // Upload and prediction states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictionStep, setPredictionStep] = useState<string>('')
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null)
  const [predictionError, setPredictionError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Health check on load
  const performHealthCheck = async () => {
    setIsCheckingHealth(true)
    try {
      const data = await checkBackendHealth()
      setBackendHealth(data)
      setBackendError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setBackendError(msg)
      setBackendHealth(null)
    } finally {
      setIsCheckingHealth(false)
    }
  }

  useEffect(() => {
    performHealthCheck()
    const timer = setInterval(performHealthCheck, 30000)
    return () => clearInterval(timer)
  }, [])

  // File validation
  const validateAndSetFile = (file: File) => {
    setPredictionError(null)
    setPredictionResult(null)

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const validExts = ['jpg', 'jpeg', 'png', 'webp']

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setPredictionError(
        `Invalid file format "${file.name}". Please upload a JPG, JPEG, PNG, or WEBP image.`
      )
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setPredictionError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`
      )
      return
    }

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  // Clear selected file
  const handleReset = () => {
    setSelectedFile(null)
    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setPredictionResult(null)
    setPredictionError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Load sample image
  const handleSelectSample = async (sample: typeof SAMPLE_FLOWERS[0]) => {
    try {
      setPredictionError(null)
      setIsPredicting(true)
      setPredictionStep('Fetching sample flower image...')

      const response = await fetch(sample.url)
      const blob = await response.blob()
      const filename = `${sample.name.toLowerCase().replace(/\s+/g, '_')}.jpg`
      const file = new File([blob], filename, { type: 'image/jpeg' })

      validateAndSetFile(file)
      setIsPredicting(false)
      setPredictionStep('')
    } catch {
      setIsPredicting(false)
      setPredictionStep('')
      setPredictionError('Failed to fetch sample image. Please try uploading your own image.')
    }
  }

  // Run flower identification
  const handleIdentify = async () => {
    if (!selectedFile) return

    setIsPredicting(true)
    setPredictionError(null)
    setPredictionResult(null)

    try {
      setPredictionStep('01 · Preprocessing image to 224×224 RGB...')
      await new Promise((r) => setTimeout(r, 250))

      setPredictionStep('02 · Running EfficientNetB0 neural inference...')
      const result = await predictFlower(selectedFile)

      setPredictionStep('03 · Mapping Oxford Flowers 102 taxonomy...')
      await new Promise((r) => setTimeout(r, 200))

      setPredictionResult(result)

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setPredictionError(msg)
    } finally {
      setIsPredicting(false)
      setPredictionStep('')
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#b6b095] selection:bg-[#e3131b] selection:text-white flex flex-col font-sans">
      {/* =========================================================================
          SECTION A: NAVIGATION
      ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-[#222222]/80 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Wordmark */}
          <a href="#home" className="flex items-center gap-3 group text-decoration-none">
            {/* Custom Lily Mark */}
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg width="34" height="34" viewBox="0 0 40 40" className="transition-transform duration-500 group-hover:rotate-45">
                {[0, 60, 120, 180, 240, 300].map((a) => (
                  <path
                    key={a}
                    d="M20 20 C 22 12, 30 8, 33 12 C 35 15, 31 17, 29 14"
                    fill="none"
                    stroke="#b6b095"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    transform={`rotate(${a} 20 20)`}
                  />
                ))}
                <circle cx="20" cy="20" r="2.8" fill="#e3131b" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display tracking-[0.18em] text-xl font-normal text-[#b6b095] uppercase">
                Bloom<span className="text-[#e3131b]">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#807a68] -mt-1 font-sans">
                Oxford Flowers 102
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] uppercase font-sans">
            <a href="#home" className="text-[#b6b095] hover:text-[#e3131b] transition-colors py-1">
              Home
            </a>
            <a href="#identify" className="text-[#b6b095] hover:text-[#e3131b] transition-colors py-1">
              Identify
            </a>
            <a href="#how-it-works" className="text-[#b6b095] hover:text-[#e3131b] transition-colors py-1">
              How It Works
            </a>
            <a href="#about" className="text-[#b6b095] hover:text-[#e3131b] transition-colors py-1">
              About
            </a>

            {/* Backend Health Status Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] tracking-wider border ${
                backendHealth?.model_loaded
                  ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-400'
                  : 'border-amber-900/60 bg-amber-950/20 text-amber-400'
              }`}
              title={
                backendHealth?.model_loaded
                  ? 'FastAPI Backend Online & Model Loaded'
                  : backendError || 'Connecting to backend...'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth?.model_loaded ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span>{backendHealth?.model_loaded ? 'Model Ready' : 'Backend Connecting'}</span>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#b6b095] hover:text-white p-2 rounded focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0a] border-b border-[#222222] px-6 py-4 flex flex-col gap-4 text-xs uppercase tracking-widest">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#b6b095] hover:text-[#e3131b] py-2"
            >
              Home
            </a>
            <a
              href="#identify"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#b6b095] hover:text-[#e3131b] py-2"
            >
              Identify
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#b6b095] hover:text-[#e3131b] py-2"
            >
              How It Works
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#b6b095] hover:text-[#e3131b] py-2"
            >
              About
            </a>

            <div className="pt-2 border-t border-[#1f1f1f] flex items-center justify-between text-[11px]">
              <span className="text-[#807a68]">Backend API:</span>
              <span className={backendHealth?.model_loaded ? 'text-emerald-400' : 'text-amber-400'}>
                {backendHealth?.model_loaded ? 'Online' : 'Checking status...'}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          SECTION B: MAIN VISUAL SECTION (LYCORIS SPECIMEN)
      ========================================================================= */}
      <section id="home" className="relative w-full overflow-hidden">
        <LycorisSpecimen
          name="BloomAI"
          studio="BloomAI"
          year="2026"
          description="An AI-powered flower identification experience built upon the Oxford Flowers 102 dataset. Featuring deep convolutional transfer learning with EfficientNetB0."
          specs={[
            "Oxford Flowers 102 Dataset",
            "EfficientNetB0 Architecture",
            "102 Botanical Classes",
            "Transfer Learning Model",
            "Top-5 Species Predictions",
          ]}
          tagline={[
            { text: "Discover" },
            { text: "nature,", small: true },
            { text: "one bloom" },
            { text: "at a time", small: true },
          ]}
          multilingual="Flōr·a·Spē·ci·es"
          ligatureWord="Botanical"
          links={[
            { label: "IDENTIFY A FLOWER", href: "#identify" },
            { label: "ABOUT BLOOMAI", href: "#about" },
          ]}
        />
      </section>

      {/* =========================================================================
          SECTION C: FLOWER IDENTIFICATION INTERFACE
      ========================================================================= */}
      <section id="identify" className="relative py-28 px-6 bg-[#080808] border-t border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-14">
            <span className="text-xs uppercase tracking-[0.3em] text-[#e3131b] font-medium block mb-3">
              Neural Vision Inference
            </span>
            <h2 className="font-display text-4xl sm:text-5xl text-[#eae6d6] tracking-wide mb-4">
              Identify Your Bloom
            </h2>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#807a68] leading-relaxed">
              Upload a clear photograph of any flower. Our EfficientNetB0 deep neural network
              analyzes fine-grained botanical features to predict the exact species among 102 classes.
            </p>
          </div>

          {/* Quick Sample Selector */}
          <div className="mb-10 bg-[#0d0d0d] p-4 rounded-xl border border-[#222222]/80">
            <div className="flex items-center gap-2 mb-3 text-xs tracking-wider uppercase text-[#807a68]">
              <Sparkles size={14} className="text-[#e3131b]" />
              <span>Or test immediately with a curated flower sample:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SAMPLE_FLOWERS.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => handleSelectSample(sample)}
                  disabled={isPredicting}
                  className="group relative flex items-center gap-3 p-2 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] border border-[#262626] hover:border-[#e3131b]/60 transition-all text-left"
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-12 h-12 rounded object-cover filter grayscale group-hover:grayscale-0 transition-all"
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-[#eae6d6] truncate group-hover:text-[#e3131b] transition-colors">
                      {sample.name}
                    </p>
                    <p className="text-[10px] text-[#807a68] truncate">{sample.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Upload Area */}
          <div className="bg-[#0e0e0e] rounded-2xl border border-[#222222] p-8 md:p-12 shadow-2xl relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="flower-upload"
            />

            {!previewUrl ? (
              // Empty state — Drag and Drop Box
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                  isDragging
                    ? 'border-[#e3131b] bg-[#e3131b]/5 shadow-[0_0_30px_rgba(227,19,27,0.15)]'
                    : 'border-[#2a2a2a] hover:border-[#e3131b]/60 hover:bg-[#121212]'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#161616] flex items-center justify-center text-[#e3131b] border border-[#262626] transition-transform duration-300 hover:scale-105">
                  <Upload size={28} />
                </div>
                <div>
                  <h3 className="font-display text-xl text-[#eae6d6] mb-1">
                    Drop your flower photo here
                  </h3>
                  <p className="text-xs text-[#807a68]">
                    or <span className="text-[#e3131b] underline underline-offset-4">browse from your computer</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#807a68] bg-[#141414] px-4 py-1.5 rounded-full border border-[#222222]">
                  <span>Supports JPG, JPEG, PNG, WEBP</span>
                  <span>•</span>
                  <span>Up to 10 MB</span>
                </div>
              </div>
            ) : (
              // Image Selected Preview & Action Bar
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-8 bg-[#141414] p-6 rounded-xl border border-[#262626]">
                  {/* Image Preview Box */}
                  <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-lg overflow-hidden border border-[#333333] shadow-md flex-shrink-0 bg-black">
                    <img
                      src={previewUrl}
                      alt="Uploaded flower preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] tracking-widest text-[#eae6d6] uppercase">
                      224 × 224 Target
                    </div>
                  </div>

                  {/* File Metadata & Actions */}
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#e3131b] font-semibold">
                        Ready for Classification
                      </span>
                      <h4 className="text-lg font-medium text-[#eae6d6] truncate max-w-md">
                        {selectedFile?.name || 'Selected specimen image'}
                      </h4>
                      <p className="text-xs text-[#807a68] mt-1">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Local file'} •{' '}
                        {selectedFile?.type || 'Image'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                      <button
                        onClick={handleIdentify}
                        disabled={isPredicting}
                        className="px-6 py-3 rounded-lg bg-[#e3131b] hover:bg-[#c20f16] text-white text-xs uppercase tracking-widest font-medium transition-all shadow-[0_0_20px_rgba(227,19,27,0.3)] disabled:opacity-50 flex items-center gap-2 group cursor-pointer"
                      >
                        {isPredicting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Classifying Bloom...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>Identify Flower</span>
                            <ArrowRight
                              size={14}
                              className="group-hover:translate-x-1 transition-transform"
                            />
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleReset}
                        disabled={isPredicting}
                        className="px-4 py-3 rounded-lg bg-[#1e1e1e] hover:bg-[#282828] text-[#b6b095] hover:text-white text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        Choose Another
                      </button>
                    </div>
                  </div>
                </div>

                {/* Processing Feedback */}
                {isPredicting && (
                  <div className="p-6 rounded-xl bg-[#121212] border border-[#2a2a2a] text-center space-y-3">
                    <div className="flex items-center justify-center gap-3 text-sm text-[#eae6d6]">
                      <RefreshCw size={18} className="animate-spin text-[#e3131b]" />
                      <span>{predictionStep || 'Analyzing botanical specimen...'}</span>
                    </div>
                    <div className="w-full bg-[#1e1e1e] h-1.5 rounded-full overflow-hidden max-w-md mx-auto">
                      <div className="h-full bg-[#e3131b] rounded-full animate-pulse w-3/4 transition-all duration-500" />
                    </div>
                    <p className="text-[11px] text-[#807a68]">
                      TensorFlow / Keras model evaluating 102 species softmax distribution
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error Message Display */}
            {predictionError && (
              <div className="mt-6 p-4 rounded-xl bg-red-950/30 border border-red-900/60 flex items-start gap-3 text-red-300 text-xs leading-relaxed">
                <AlertCircle size={18} className="flex-shrink-0 text-[#e3131b] mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-red-200">Prediction Notice</p>
                  <p>{predictionError}</p>
                  {predictionError.includes('FastAPI') && (
                    <p className="text-[11px] text-[#807a68] pt-1">
                      Tip: Start backend with{' '}
                      <code className="text-red-400 bg-black/40 px-1 py-0.5 rounded">
                        uvicorn main:app --reload
                      </code>{' '}
                      inside the <code className="text-red-400">backend/</code> directory.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D: PREDICTION RESULTS
      ========================================================================= */}
      {predictionResult && (
        <section ref={resultsRef} className="py-24 px-6 bg-[#060606] border-t border-[#1a1a1a]">
          <div className="max-w-5xl mx-auto space-y-10">
            {/* Header */}
            <div className="text-center">
              <span className="text-xs uppercase tracking-[0.3em] text-[#e3131b] font-medium block mb-2">
                Classification Report
              </span>
              <h3 className="font-display text-3xl sm:text-4xl text-[#eae6d6]">
                Identified Specimen
              </h3>
            </div>

            {/* Top Prediction Highlight Card */}
            <div className="bg-gradient-to-b from-[#131313] to-[#0a0a0a] rounded-2xl border border-[#2a2a2a] p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#e3131b]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Image side */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-[280px] aspect-square rounded-xl overflow-hidden border-2 border-[#e3131b]/40 shadow-[0_0_30px_rgba(227,19,27,0.2)]">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Classified bloom"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-center">
                      <span className="text-[11px] text-[#eae6d6] tracking-wider uppercase font-medium">
                        Specimen Image
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Prediction Details */}
                <div className="md:col-span-7 space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#e3131b]/15 text-[#e3131b] border border-[#e3131b]/30 mb-3">
                      <CheckCircle2 size={13} />
                      <span>Primary Classification</span>
                    </div>

                    <h4 className="font-display text-4xl sm:text-5xl text-[#eae6d6] capitalize tracking-wide">
                      {predictionResult.predicted_class}
                    </h4>

                    <div className="flex items-baseline gap-3 mt-3">
                      <span className="text-3xl font-light text-[#e3131b] tracking-tight">
                        {(predictionResult.confidence * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs uppercase tracking-widest text-[#807a68]">
                        Model Confidence
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#807a68] leading-relaxed">
                    Evaluated by the EfficientNetB0 neural architecture across all 102 Oxford Flower
                    categories. The confidence represents the highest normalized softmax probability.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-lg bg-[#1c1c1c] hover:bg-[#282828] text-[#eae6d6] text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2"
                    >
                      <RefreshCw size={13} />
                      <span>Identify Another Flower</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Top-5 Predictions Breakdown */}
              <div className="mt-12 pt-10 border-t border-[#222222]">
                <h5 className="text-xs uppercase tracking-[0.25em] text-[#807a68] mb-6 font-semibold flex items-center gap-2">
                  <Layers size={14} className="text-[#e3131b]" />
                  <span>Top-5 Candidate Species & Confidence Distribution</span>
                </h5>

                <div className="space-y-4">
                  {predictionResult.top_predictions.map((item, index) => {
                    const percentage = (item.confidence * 100).toFixed(1)
                    return (
                      <div
                        key={item.label}
                        className="bg-[#121212] p-4 rounded-xl border border-[#222222] hover:border-[#333333] transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] text-[#e3131b] font-semibold">
                              0{index + 1}
                            </span>
                            <span className="font-medium text-[#eae6d6] capitalize text-sm">
                              {item.label}
                            </span>
                          </div>
                          <span className="font-mono text-xs text-[#b6b095] font-medium">
                            {percentage}%
                          </span>
                        </div>

                        {/* Confidence Progress Bar */}
                        <div className="w-full bg-[#1a1a1a] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              index === 0
                                ? 'bg-[#e3131b]'
                                : index === 1
                                ? 'bg-[#c20f16]/80'
                                : 'bg-[#807a68]/70'
                            }`}
                            style={{ width: `${Math.max(item.confidence * 100, 1)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION E: HOW IT WORKS
      ========================================================================= */}
      <section id="how-it-works" className="py-28 px-6 bg-[#070707] border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-[#e3131b] font-medium block mb-2">
              Pipeline
            </span>
            <h2 className="font-display text-4xl text-[#eae6d6] tracking-wide">
              How It Works
            </h2>
            <p className="text-xs text-[#807a68] uppercase tracking-widest mt-2">
              Three seamless steps from photograph to botanical taxonomy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-[#0e0e0e] p-8 rounded-2xl border border-[#202020] hover:border-[#e3131b]/50 transition-all group flex flex-col justify-between">
              <div>
                <span className="font-display text-5xl text-[#e3131b] opacity-80 block mb-6">
                  01
                </span>
                <h3 className="font-display text-xl text-[#eae6d6] tracking-wide mb-3 uppercase">
                  Upload
                </h3>
                <p className="text-xs text-[#807a68] leading-relaxed">
                  Upload a clear image of a flower from your device in JPG, JPEG, PNG, or WEBP
                  format. Drag-and-drop or file selection is fully supported.
                </p>
              </div>
              <div className="pt-6 border-t border-[#1a1a1a] mt-6 flex items-center text-[10px] tracking-widest uppercase text-[#807a68]">
                <span>Step 1 · Input Ingestion</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0e0e0e] p-8 rounded-2xl border border-[#202020] hover:border-[#e3131b]/50 transition-all group flex flex-col justify-between">
              <div>
                <span className="font-display text-5xl text-[#e3131b] opacity-80 block mb-6">
                  02
                </span>
                <h3 className="font-display text-xl text-[#eae6d6] tracking-wide mb-3 uppercase">
                  Analyse
                </h3>
                <p className="text-xs text-[#807a68] leading-relaxed">
                  Our trained deep learning model analyses the image. The image is preprocessed to
                  224 × 224 pixels and forwarded through convolutional layers to extract botanical
                  feature embeddings.
                </p>
              </div>
              <div className="pt-6 border-t border-[#1a1a1a] mt-6 flex items-center text-[10px] tracking-widest uppercase text-[#807a68]">
                <span>Step 2 · EfficientNetB0 Inference</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0e0e0e] p-8 rounded-2xl border border-[#202020] hover:border-[#e3131b]/50 transition-all group flex flex-col justify-between">
              <div>
                <span className="font-display text-5xl text-[#e3131b] opacity-80 block mb-6">
                  03
                </span>
                <h3 className="font-display text-xl text-[#eae6d6] tracking-wide mb-3 uppercase">
                  Discover
                </h3>
                <p className="text-xs text-[#807a68] leading-relaxed">
                  Explore the predicted species and confidence scores. Review the top-five most
                  probable botanical classifications accompanied by statistical confidence bars.
                </p>
              </div>
              <div className="pt-6 border-t border-[#1a1a1a] mt-6 flex items-center text-[10px] tracking-widest uppercase text-[#807a68]">
                <span>Step 3 · Botanical Verification</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION F: ABOUT BLOOMAI & MODEL EVALUATION
      ========================================================================= */}
      <section id="about" className="py-28 px-6 bg-[#050505] border-t border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-[#e3131b] font-medium block mb-2">
              Architecture & Research
            </span>
            <h2 className="font-display text-4xl text-[#eae6d6] tracking-wide">
              About BloomAI
            </h2>
            <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#807a68] leading-relaxed mt-3">
              BloomAI is an AI-powered flower species classification system designed to bridge
              botanical study with state-of-the-art computer vision.
            </p>
          </div>

          {/* Architecture Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0d0d0d] p-6 rounded-xl border border-[#1f1f1f] space-y-3">
              <Database size={24} className="text-[#e3131b]" />
              <h4 className="font-display text-lg text-[#eae6d6]">Oxford Flowers 102</h4>
              <p className="text-xs text-[#807a68] leading-relaxed">
                Trained on the rigorous Oxford 102 Category Flower Dataset encompassing fine-grained
                visual categories commonly found in the United Kingdom and global habitats.
              </p>
            </div>

            <div className="bg-[#0d0d0d] p-6 rounded-xl border border-[#1f1f1f] space-y-3">
              <Cpu size={24} className="text-[#e3131b]" />
              <h4 className="font-display text-lg text-[#eae6d6]">EfficientNetB0</h4>
              <p className="text-xs text-[#807a68] leading-relaxed">
                Utilizes compound coefficient scaling to balance network depth, width, and
                resolution, providing remarkable accuracy with high computational efficiency.
              </p>
            </div>

            <div className="bg-[#0d0d0d] p-6 rounded-xl border border-[#1f1f1f] space-y-3">
              <Layers size={24} className="text-[#e3131b]" />
              <h4 className="font-display text-lg text-[#eae6d6]">Transfer Learning</h4>
              <p className="text-xs text-[#807a68] leading-relaxed">
                Leverages pretrained feature representations, fine-tuning higher-level layers with
                global average pooling, dropout regularization, and a 102-unit softmax classifier.
              </p>
            </div>

            <div className="bg-[#0d0d0d] p-6 rounded-xl border border-[#1f1f1f] space-y-3">
              <Sparkles size={24} className="text-[#e3131b]" />
              <h4 className="font-display text-lg text-[#eae6d6]">TensorFlow & Keras</h4>
              <p className="text-xs text-[#807a68] leading-relaxed">
                Built and trained end-to-end using TensorFlow/Keras and served via a high-performance
                FastAPI asynchronous backend with PIL preprocessing.
              </p>
            </div>
          </div>

          {/* Measured Evaluation Results */}
          <div className="bg-[#0c0c0c] p-8 md:p-12 rounded-2xl border border-[#222222] space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f1f1f] pb-6">
              <div>
                <h3 className="font-display text-2xl text-[#eae6d6]">
                  Model Evaluation Benchmarks
                </h3>
                <p className="text-xs text-[#807a68] mt-1">
                  Measured evaluation results on the unseen test split of Oxford Flowers 102
                </p>
              </div>
              <span className="px-3 py-1 bg-[#1a1a1a] text-[#b6b095] text-[11px] rounded-full border border-[#262626] uppercase tracking-wider self-start sm:self-auto">
                Verified Test Results
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {/* Metric 1 */}
              <div className="p-6 rounded-xl bg-[#141414] border border-[#262626]">
                <span className="text-xs uppercase tracking-widest text-[#807a68] block mb-2">
                  Test Accuracy
                </span>
                <span className="font-display text-4xl sm:text-5xl text-[#eae6d6] block mb-2">
                  79.15%
                </span>
                <p className="text-[11px] text-[#807a68]">
                  Exact single-guess species classification rate across 102 challenging classes
                </p>
              </div>

              {/* Metric 2 */}
              <div className="p-6 rounded-xl bg-[#141414] border border-[#e3131b]/30 shadow-[0_0_20px_rgba(227,19,27,0.08)]">
                <span className="text-xs uppercase tracking-widest text-[#e3131b] block mb-2">
                  Top-5 Accuracy
                </span>
                <span className="font-display text-4xl sm:text-5xl text-[#e3131b] block mb-2">
                  93.40%
                </span>
                <p className="text-[11px] text-[#807a68]">
                  Probability that the correct species is within the model's top 5 ranked outputs
                </p>
              </div>

              {/* Metric 3 */}
              <div className="p-6 rounded-xl bg-[#141414] border border-[#262626]">
                <span className="text-xs uppercase tracking-widest text-[#807a68] block mb-2">
                  Macro F1-Score
                </span>
                <span className="font-display text-4xl sm:text-5xl text-[#eae6d6] block mb-2">
                  ~77.90%
                </span>
                <p className="text-[11px] text-[#807a68]">
                  Harmonic mean of precision and recall averaged unweighted across all classes
                </p>
              </div>
            </div>

            {/* Note alert */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex items-start gap-3 text-xs text-[#807a68]">
              <Info size={16} className="text-[#b6b095] flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-[#eae6d6]">Evaluation Context:</strong> The metrics above
                reflect measured performance on the standardized benchmark dataset. Real-world
                field accuracy may vary based on illumination, leaf occlusion, framing angles, and
                botanical specimen maturity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION G: FOOTER
      ========================================================================= */}
      <footer className="mt-auto bg-[#030303] border-t border-[#1a1a1a] py-14 px-6 text-[#807a68]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-xs">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 40 40">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <path
                  key={a}
                  d="M20 20 C 22 12, 30 8, 33 12 C 35 15, 31 17, 29 14"
                  fill="none"
                  stroke="#b6b095"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  transform={`rotate(${a} 20 20)`}
                />
              ))}
              <circle cx="20" cy="20" r="2.8" fill="#e3131b" />
            </svg>
            <div>
              <span className="font-display text-sm tracking-wider text-[#eae6d6] uppercase">
                BloomAI
              </span>
              <p className="text-[10px] text-[#807a68]">AI-Powered Flower Identification</p>
            </div>
          </div>

          {/* Technology Credits */}
          <div className="text-center md:text-right space-y-1 text-[11px]">
            <p>
              Built with <span className="text-[#b6b095]">React</span> •{' '}
              <span className="text-[#b6b095]">Vite</span> •{' '}
              <span className="text-[#b6b095]">FastAPI</span> •{' '}
              <span className="text-[#b6b095]">TensorFlow / Keras</span> •{' '}
              <span className="text-[#b6b095]">WebGL</span>
            </p>
            <p>© 2026 BloomAI. Botanical Species Classification.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
