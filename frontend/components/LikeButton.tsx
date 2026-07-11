'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Botao de curtir: incrementa no backend (POST /api/posts/:id/like) e guarda
// no navegador que este visitante ja curtiu (1 curtida por navegador).
export default function LikeButton({
  postId,
  initialLikes,
}: {
  postId: number
  initialLikes: number
}) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLiked(localStorage.getItem(`du-liked-${postId}`) === '1')
  }, [postId])

  async function like() {
    if (liked || busy) return
    setBusy(true)
    setLikes((l) => l + 1)
    setLiked(true)
    try {
      const res = await fetch(`${API}/api/posts/${postId}/like`, { method: 'POST' })
      if (res.ok) {
        const j = (await res.json()) as { likes: number }
        setLikes(j.likes)
        localStorage.setItem(`du-liked-${postId}`, '1')
      } else {
        setLikes((l) => l - 1)
        setLiked(false)
      }
    } catch {
      setLikes((l) => l - 1)
      setLiked(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`like-btn ${liked ? 'like-btn--liked' : ''}`}
      onClick={like}
      aria-pressed={liked}
      title={liked ? 'Você já curtiu' : 'Curtir'}
    >
      {liked ? '❤️' : '🤍'} {likes} {likes === 1 ? 'curtida' : 'curtidas'}
    </button>
  )
}
