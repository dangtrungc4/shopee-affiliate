import { useState, useCallback, useRef } from 'react'

const AFFILIATE_ID = '17355830344'
const FB_POST_URL = "https://www.facebook.com/trungnguyen.dev.1803/posts/pfbid0nurMwD5WsuzuarhkEyhySBk6PzThZHCas2mJPoY6c6HKsK2iHc4SPgn1AXaNJ3uql"
const COMMENT_TEMPLATE = `🔥 Deal ngon đây:
👉 {LINK}

#dealhot #review`

// ── helpers ──────────────────────────────────────────────────────────────────
// ── helpers ──────────────────────────────────────────────────────────────────
function parseShopeeLink(input) {
  if (!input?.trim()) return null
  const urlStr = input.trim()

  // 1. Tìm IDs (shopid.itemid)
  const patterns = [
    /i\.(\d+)\.(\d+)/,
    /product\/(\d+)\/(\d+)/,
    /\/(\d+)\/(\d+)/
  ]

  for (const pattern of patterns) {
    const match = urlStr.match(pattern)
    if (match) {
      return { 
        shopid: match[1], 
        itemid: match[2],
        isShort: false 
      }
    }
  }

  // 2. Kiểm tra link rút gọn s.shopee.vn
  const shortMatch = urlStr.match(/s\.shopee\.vn\/([A-Za-z0-9_-]+)/)
  if (shortMatch) {
    return { origUrl: `https://s.shopee.vn/${shortMatch[1]}`, isShort: true }
  }

  return null
}

function buildAffiliateLink(shopid, itemid) {
  // Luôn đưa về định dạng /opaanlp/shopid/itemid để khớp hoàn toàn với cuongtws.vn
  const origin_link = `https://shopee.vn/opaanlp/${shopid}/${itemid}`
  const encoded = encodeURIComponent(origin_link)
  // Giữ nguyên AFFILIATE_ID cũ và không thêm sub_id theo yêu cầu người dùng
  return `https://s.shopee.vn/an_redir?origin_link=${encoded}&share_channel_code=4&affiliate_id=${AFFILIATE_ID}`
}

// ── icons (inline SVG components) ───────────────────────────────────────────
const IconLink = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)

const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconArrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const IconHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M12 7v5l4 2"/>
  </svg>
)

const IconShopee = () => (
  <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="48" fill="#EE4D2D"/>
    <path d="M50 18C37.8 18 28 27.8 28 40c0 6.1 2.4 11.6 6.3 15.7L50 82l15.7-26.3C69.6 51.6 72 46.1 72 40c0-12.2-9.8-22-22-22zm0 30c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="white"/>
  </svg>
)

// ── Toast Notification ────────────────────────────────────────────────────────
function Toast({ message, type, visible }) {
  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      } ${
        type === 'success'
          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/20 border border-red-500/30 text-red-400'
      }`}
      style={{ backdropFilter: 'blur(20px)' }}
    >
      {type === 'success' ? <IconCheck /> : <span>⚠️</span>}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

// ── Guide Overlay ─────────────────────────────────────────────────────────────
function GuideOverlay({ visible, onClose }) {
  if (!visible) return null

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-fade-in"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="glass-dark max-w-sm w-full rounded-3xl p-8 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Đã copy nội dung!</h3>
          <p className="text-white/50 text-sm">Dán vào comment Facebook để hoàn tất:</p>
        </div>

        <div className="space-y-4 mb-8">
          {[
            { step: '1', text: 'Click vào ô comment bài viết' },
            { step: '2', text: 'Nhấn Ctrl + V (hoặc giữ → Paste)' },
            { step: '3', text: 'Nhấn Enter' }
          ].map((item, idx) => (idx < 2 ? (
            <div key={item.step} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/40 text-xs font-bold">
                {item.step}
              </div>
              <p className="text-white/80 text-sm font-medium">{item.text}</p>
            </div>
          ) : (
            <div key={item.step} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400 text-xs font-bold">
                {item.step}
              </div>
              <p className="text-blue-400 text-sm font-bold">{item.text}</p>
            </div>
          )))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all duration-200"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  )
}

// ── History Item ──────────────────────────────────────────────────────────────
function HistoryItem({ item, onCopy, onReuse }) {
  return (
    <div className="group glass rounded-xl p-3.5 hover:border-white/20 transition-all duration-200 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs text-white/40 font-mono truncate flex-1">{item.original}</p>
        <span className="text-white/20 text-xs shrink-0">{item.time}</span>
      </div>
      <p className="text-xs text-orange-400/80 font-mono truncate mb-3">{item.affiliate}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onReuse(item.original)}
          className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-all duration-200"
        >
          Dùng lại
        </button>
        <button
          onClick={() => onCopy(item.affiliate)}
          className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-shopee-orange/10 hover:bg-shopee-orange/20 text-shopee-orange transition-all duration-200"
        >
          Copy
        </button>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const inputRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800)
  }, [])

  const handleConvert = useCallback(async () => {
    if (!input.trim()) {
      setError('Vui lòng nhập link Shopee')
      inputRef.current?.focus()
      return
    }

    setError('')
    setIsConverting(true)
    setIsResolving(false)
    setResult('')

    const parsed = parseShopeeLink(input)
    if (!parsed) {
      setError('Link không hợp lệ. Vui lòng kiểm tra lại định dạng link Shopee.')
      setIsConverting(false)
      return
    }

    let shopId = parsed.shopid
    let itemId = parsed.itemid

    // Use backend resolution for all links (more robust)
    setIsResolving(true)
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.trim() })
      })
      
      const data = await response.json()
      if (response.ok && data.shopid && data.itemid) {
        shopId = data.shopid
        itemId = data.itemid
      } else {
        console.warn('API conversion failed, falling back to local parsing:', data.error)
      }
    } catch (e) {
      console.error('Không thể kết nối với API:', e)
      // Fallback is already handled by shopId/itemId being set by parseShopeeLink if it was a long link
    } finally {
      setIsResolving(false)
    }

    if (!shopId || !itemId) {
      setError('Không thể tìm thấy Shop ID và Product ID từ link này.')
      setIsConverting(false)
      return
    }

    const affiliateLink = buildAffiliateLink(shopId, itemId)
    setResult(affiliateLink)
    setIsConverting(false)

    // Add to history
    const now = new Date()
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    setHistory(prev => [
      { id: Date.now(), original: input.trim(), affiliate: affiliateLink, time: timeStr },
      ...prev.slice(0, 9),
    ])
  }, [input])

  const handleCopy = useCallback(async (text = result) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      showToast('Đã copy link affiliate! 🎉', 'success')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      showToast('Không thể copy, vui lòng copy thủ công', 'error')
    }
  }, [result, showToast])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleConvert()
  }, [handleConvert])

  const handleClear = useCallback(() => {
    setInput('')
    setResult('')
    setError('')
    setCopied(false)
    inputRef.current?.focus()
  }, [])

  const handleReuse = useCallback((originalLink) => {
    setInput(originalLink)
    setShowHistory(false)
    setResult('')
    setError('')
  }, [])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInput(text)
      setError('')
    } catch {
      inputRef.current?.focus()
    }
  }, [])

  const handleQuickComment = useCallback(async () => {
    if (!result) return
    
    try {
      const finalContent = COMMENT_TEMPLATE.replace('{LINK}', result)
      await navigator.clipboard.writeText(finalContent)
      showToast('Đã copy nội dung comment! 📋', 'success')
      setShowGuide(true)
      
      // Delay to ensure user sees toast and clipboard is ready
      setTimeout(() => {
        window.open(FB_POST_URL, '_blank')
      }, 800)
    } catch (err) {
      showToast('Lỗi copy, vui lòng thử lại', 'error')
    }
  }, [result, showToast])

  return (
    <div className="min-h-screen bg-mesh dot-pattern flex flex-col">
      <Toast {...toast} />
      <GuideOverlay visible={showGuide} onClose={() => setShowGuide(false)} />

      {/* ── Header ── */}
      <header className="pt-10 pb-4 px-4 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="animate-pulse-glow rounded-full p-1">
            <IconShopee />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            <span className="text-gradient">Shopee</span>
            <span className="text-white/90"> Affiliate</span>
          </h1>
        </div>
      </header>

      {/* ── Main card ── */}
      <main className="flex-1 flex items-start justify-center px-4 pb-10">
        <div className="w-full max-w-xl animate-slide-up">

          {/* Card */}
          <div className="glass rounded-3xl p-6 md:p-8 shadow-2xl" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}>

            {/* Input section */}
            <div className="mb-5">
              <label htmlFor="shopee-input" className="block text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <IconLink />
                Link Shopee
              </label>
              <div className="relative">
                <textarea
                  id="shopee-input"
                  ref={inputRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); setError('') }}
                  onKeyDown={handleKeyDown}
                  placeholder="Dán link Shopee vào đây...&#10;VD: https://shopee.vn/san-pham-i.123456.789012&#10;Hoặc: https://s.shopee.vn/5VR9VnW1Kx"
                  rows={3}
                  className={`w-full bg-black/30 border rounded-2xl px-4 py-3.5 text-sm text-white/90 placeholder-white/20 resize-none outline-none transition-all duration-300 input-glow font-mono leading-relaxed ${
                    error ? 'border-red-500/50' : 'border-white/10 focus:border-shopee-orange/50'
                  }`}
                />
                {input && (
                  <button
                    id="clear-input-btn"
                    onClick={handleClear}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/70 transition-all duration-200"
                    aria-label="Xóa input"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>

              {error && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5 animate-fade-in">
                  <span>⚠️</span> {error}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <button
                id="paste-btn"
                onClick={handlePaste}
                className="px-4 py-3 glass rounded-xl text-sm text-white/60 hover:text-white/90 hover:border-white/20 transition-all duration-200 font-medium"
              >
                📋 Paste
              </button>
              <button
                id="convert-btn"
                onClick={handleConvert}
                disabled={isConverting}
                className="flex-1 flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-bold text-sm text-white transition-all duration-300 btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #FF6B4A 0%, #EE4D2D 50%, #D84315 100%)',
                  boxShadow: '0 4px 20px rgba(238, 77, 45, 0.35)',
                }}
              >
                {isConverting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isResolving ? 'Đang giải mã link...' : 'Đang xử lý...'}
                  </>
                ) : (
                  <>
                    Convert Link
                    <IconArrow />
                  </>
                )}
              </button>
            </div>

            {/* Result section */}
            {result && (
              <div className="animate-bounce-soft">
                <div className="result-glow bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      Affiliate Link (Đã tối ưu voucher)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider">High Compatibility</span>
                  </div>
                  <p
                    id="affiliate-result"
                    className="text-xs font-mono text-emerald-300/90 break-all leading-relaxed select-all"
                  >
                    {result}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    id="copy-btn"
                    onClick={() => handleCopy()}
                    className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                      copied
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                        : 'bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white'
                    }`}
                  >
                    {copied ? <IconCheck /> : <IconCopy />}
                    {copied ? 'Đã copy!' : 'Copy Link Affiliate'}
                  </button>

                  <button
                    id="quick-comment-btn"
                    onClick={handleQuickComment}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-lg shadow-blue-900/20"
                  >
                    💬 Comment nhanh (Facebook)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* History section */}
          {history.length > 0 && (
            <div className="mt-5 animate-fade-in">
              <button
                id="toggle-history-btn"
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 glass rounded-2xl text-sm text-white/50 hover:text-white/80 transition-all duration-200 hover:border-white/15"
              >
                <span className="flex items-center gap-2">
                  <IconHistory />
                  Lịch sử chuyển đổi
                  <span className="bg-shopee-orange/20 text-shopee-orange text-xs px-2 py-0.5 rounded-full font-bold">
                    {history.length}
                  </span>
                </span>
                <span className={`transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showHistory && (
                <div className="mt-3 flex flex-col gap-2 animate-slide-up">
                  {history.map(item => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      onCopy={handleCopy}
                      onReuse={handleReuse}
                    />
                  ))}
                  <button
                    id="clear-history-btn"
                    onClick={() => { setHistory([]); setShowHistory(false) }}
                    className="text-center text-xs text-white/20 hover:text-red-400/60 transition-colors duration-200 py-2"
                  >
                    Xóa lịch sử
                  </button>
                </div>
              )}
            </div>
          )}

          {/* How-to guide */}
          <div className="mt-6 glass rounded-2xl p-5">
            <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Hướng dẫn sử dụng</h2>
            <div className="flex flex-col gap-3">
              {[
                { step: '1', icon: '🔗', text: 'Copy link sản phẩm trên app hoặc website Shopee' },
                { step: '2', icon: '📋', text: 'Dán link vào ô nhập phía trên và nhấn Convert' },
                { step: '3', icon: '💰', text: 'Copy affiliate link và chia sẻ để kiếm hoa hồng' },
              ].map(({ step, icon, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-shopee-orange/15 border border-shopee-orange/20 flex items-center justify-center shrink-0">
                    <span className="text-shopee-orange text-xs font-black">{step}</span>
                  </div>
                  <div className="flex items-start gap-2 pt-0.5">
                    <span>{icon}</span>
                    <p className="text-xs text-white/45 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-5 pb-8 px-4">
        <p className="text-xs text-white/20">
          Affiliate ID: <span className="text-white/35 font-mono">{AFFILIATE_ID}</span>
          &nbsp;·&nbsp;
          <span className="text-shopee-orange/40">Shopee Affiliate Tool</span>
        </p>
      </footer>
    </div>
  )
}
